import { and, desc, eq } from 'drizzle-orm'
import { getUser } from '@netlify/identity'
import type { Config, Context } from '@netlify/functions'
import { db } from '../../db/index.js'
import {
  ledgerEntries,
  recoveryCases,
  workflowEvents,
} from '../../db/schema.js'

const CASE_NUMBER = 'DB-P-2023-W'

type RecoveryCase = typeof recoveryCases.$inferSelect

type CaseAction =
  | {
      type: 'provision'
      amount: number
      target: 'profit' | 'affiliate' | 'hardship'
    }
  | { type: 'release'; amount: number }
  | { type: 'synchronize' }
  | { type: 'batch'; amount: number }

const toMoney = (value: string | number) => Number(value).toFixed(2)

function makeReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

async function ensureCase(userId: string, email: string | undefined) {
  const [existingCase] = await db
    .select()
    .from(recoveryCases)
    .where(
      and(
        eq(recoveryCases.userId, userId),
        eq(recoveryCases.caseNumber, CASE_NUMBER),
      ),
    )
    .limit(1)

  if (existingCase) return existingCase

  const [createdCase] = await db
    .insert(recoveryCases)
    .values({
      userId,
      caseNumber: CASE_NUMBER,
      clientName: email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Protected client',
      desk: 'London Recovery Desk · LDN-04',
      recoveryProfitBalance: '0.00',
      recoveryAffiliateBalance: '0.00',
      totalAssetsRecovery: '0.00',
      hardshipCredits: '0.00',
      syncProgress: '0.00',
    })
    .returning()

  if (!createdCase) throw new Error('Unable to initialize recovery case')

  await db.insert(ledgerEntries).values([
    {
      caseId: createdCase.id,
      reference: 'AX-29831',
      entryType: 'Axiom batch',
      description: 'Cross-ledger recovery allocation',
      amount: '0.00',
      status: 'Cleared',
    },
    {
      caseId: createdCase.id,
      reference: 'LR-77402',
      entryType: 'Liquidity release',
      description: 'Affiliate reserve release',
      amount: '0.00',
      status: 'Authorized',
    },
    {
      caseId: createdCase.id,
      reference: 'HP-10487',
      entryType: 'Hardship credit',
      description: 'Protected hardship provision',
      amount: '0.00',
      status: 'Provisioned',
    },
  ])

  await db.insert(workflowEvents).values([
    {
      caseId: createdCase.id,
      eventType: 'verification',
      title: 'Beneficiary verification sealed',
      detail: 'Identity and case ownership controls passed desk review.',
      status: 'Complete',
    },
    {
      caseId: createdCase.id,
      eventType: 'reconciliation',
      title: 'Global ledger reconciliation',
      detail: 'Four of six correspondent ledgers are synchronized.',
      status: 'In progress',
    },
    {
      caseId: createdCase.id,
      eventType: 'release',
      title: 'Final liquidity release',
      detail: 'Awaiting synchronization threshold and desk authorization.',
      status: 'Pending',
    },
  ])

  return createdCase
}

async function serializeCase(caseRecord: RecoveryCase) {
  const entries = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.caseId, caseRecord.id))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(20)

  const events = await db
    .select()
    .from(workflowEvents)
    .where(eq(workflowEvents.caseId, caseRecord.id))
    .orderBy(desc(workflowEvents.createdAt))
    .limit(20)

  return {
    case: {
      ...caseRecord,
      recoveryProfitBalance: toMoney(caseRecord.recoveryProfitBalance),
      recoveryAffiliateBalance: toMoney(caseRecord.recoveryAffiliateBalance),
      totalAssetsRecovery: toMoney(caseRecord.totalAssetsRecovery),
      hardshipCredits: toMoney(caseRecord.hardshipCredits),
    },
    ledger: entries,
    events,
  }
}

async function applyAction(caseRecord: RecoveryCase, action: CaseAction) {
  const now = new Date()
  const changes: Partial<typeof recoveryCases.$inferInsert> = { updatedAt: now }
  let ledgerEntry: typeof ledgerEntries.$inferInsert | undefined
  let event: typeof workflowEvents.$inferInsert

  if (action.type === 'provision') {
    if (!Number.isFinite(action.amount) || action.amount < 1000 || action.amount > 500000) {
      throw new Error('Provision amount must be between $1,000 and $500,000')
    }

    const labels = {
      profit: 'Recovery profit',
      affiliate: 'Affiliate reserve',
      hardship: 'Hardship credit',
    }

    if (action.target === 'profit') {
      changes.recoveryProfitBalance = toMoney(
        Number(caseRecord.recoveryProfitBalance) + action.amount,
      )
    } else if (action.target === 'affiliate') {
      changes.recoveryAffiliateBalance = toMoney(
        Number(caseRecord.recoveryAffiliateBalance) + action.amount,
      )
    } else {
      changes.hardshipCredits = toMoney(
        Number(caseRecord.hardshipCredits) + action.amount,
      )
    }

    ledgerEntry = {
      caseId: caseRecord.id,
      reference: makeReference('MP'),
      entryType: 'Manual provision',
      description: `${labels[action.target]} allocation`,
      amount: toMoney(action.amount),
      status: 'Provisioned',
    }
    event = {
      caseId: caseRecord.id,
      eventType: 'provision',
      title: `${labels[action.target]} provision recorded`,
      detail: 'Manual desk instruction recorded with an immutable ledger reference.',
      status: 'Complete',
    }
  } else if (action.type === 'release') {
    if (!Number.isFinite(action.amount) || action.amount < 1000) {
      throw new Error('Release amount must be at least $1,000')
    }
    if (action.amount > Number(caseRecord.recoveryAffiliateBalance)) {
      throw new Error('Release exceeds the available affiliate balance')
    }
    changes.recoveryAffiliateBalance = toMoney(
      Number(caseRecord.recoveryAffiliateBalance) - action.amount,
    )
    changes.totalAssetsRecovery = toMoney(
      Number(caseRecord.totalAssetsRecovery) + action.amount,
    )
    
    const currentProgress = Number(caseRecord.syncProgress) || 0
    const nextProgress = Math.min(100, currentProgress + 4)
    changes.syncProgress = toMoney(nextProgress)

    ledgerEntry = {
      caseId: caseRecord.id,
      reference: makeReference('LR'),
      entryType: 'Liquidity release',
      description: 'Affiliate reserve transferred to recovered assets',
      amount: toMoney(action.amount),
      status: 'Authorized',
    }
    event = {
      caseId: caseRecord.id,
      eventType: 'release',
      title: 'Liquidity release authorized',
      detail: 'Reserve liquidity moved into the controlled recovery balance.',
      status: 'Complete',
    }
  } else if (action.type === 'batch') {
    if (!Number.isFinite(action.amount) || action.amount < 5000 || action.amount > 1000000) {
      throw new Error('Batch amount must be between $5,000 and $1,000,000')
    }
    changes.recoveryProfitBalance = toMoney(
      Number(caseRecord.recoveryProfitBalance) + action.amount * 0.32,
    )
    changes.totalAssetsRecovery = toMoney(
      Number(caseRecord.totalAssetsRecovery) + action.amount,
    )

    const currentProgress = Number(caseRecord.syncProgress) || 0
    const nextProgress = Math.min(100, currentProgress + 9)
    changes.syncProgress = toMoney(nextProgress)

    ledgerEntry = {
      caseId: caseRecord.id,
      reference: makeReference('AX'),
      entryType: 'Axiom batch',
      description: 'Validated multi-ledger asset batch',
      amount: toMoney(action.amount),
      status: 'Cleared',
    }
    event = {
      caseId: caseRecord.id,
      eventType: 'batch',
      title: 'Axiom batch cleared',
      detail: 'Batch controls passed and the recovery ledger was updated.',
      status: 'Complete',
    }
  } else {
    const currentProgress = Number(caseRecord.syncProgress) || 0
    const nextProgress = Math.min(100, currentProgress + 8)
    changes.syncProgress = toMoney(nextProgress)
    
    event = {
      caseId: caseRecord.id,
      eventType: 'reconciliation',
      title: nextProgress >= 100 ? 'Final synchronization sealed' : 'Synchronization cycle completed',
      detail:
        nextProgress >= 100
          ? 'All modeled ledgers reached the controlled release threshold.'
          : 'The latest correspondent ledger cycle completed successfully.',
      status: nextProgress >= 100 ? 'Complete' : 'In progress',
    }
  }

  const [updatedCase] = await db
    .update(recoveryCases)
    .set(changes)
    .where(eq(recoveryCases.id, caseRecord.id))
    .returning()

  if (!updatedCase) throw new Error('Case update failed')
  if (ledgerEntry) await db.insert(ledgerEntries).values(ledgerEntry)
  await db.insert(workflowEvents).values(event)

  return updatedCase
}

export default async (request: Request, _context: Context) => {
  try {
    const user = await getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const caseRecord = await ensureCase(user.id, user.email)

    if (request.method === 'GET') {
      return Response.json(await serializeCase(caseRecord))
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }

    const action = (await request.json()) as CaseAction
    if (!action?.type) {
      return Response.json({ error: 'A workflow action is required' }, { status: 400 })
    }
    if (!['provision', 'release', 'synchronize', 'batch'].includes(action.type)) {
      return Response.json({ error: 'Unsupported workflow action' }, { status: 400 })
    }

    const updatedCase = await applyAction(caseRecord, action)
    return Response.json(await serializeCase(updatedCase))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recovery workflow failed'
    const isValidationError =
      message.includes('must be') ||
      message.includes('exceeds') ||
      message.includes('required')
    return Response.json({ error: message }, { status: isValidationError ? 400 : 500 })
  }
}

export const config: Config = {
  path: '/api/recovery/case',
}
