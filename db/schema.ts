import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const recoveryCases = pgTable(
  'recovery_cases',
  {
    id: serial().primaryKey(),
    userId: text('user_id').notNull(),
    caseNumber: text('case_number').notNull(),
    clientName: text('client_name').notNull(),
    desk: text().notNull(),
    recoveryProfitBalance: numeric('recovery_profit_balance', {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default('0'),
    recoveryAffiliateBalance: numeric('recovery_affiliate_balance', {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default('0'),
    totalAssetsRecovery: numeric('total_assets_recovery', {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default('0'),
    hardshipCredits: numeric('hardship_credits', {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default('0'),
    syncProgress: integer('sync_progress').notNull().default(0),
    synchronizationStatus: text('synchronization_status')
      .notNull()
      .default('Reconciliation active'),
    assetStatus: text('asset_status').notNull().default('Controlled hold'),
    batchStatus: text('batch_status').notNull().default('Ready'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('recovery_cases_user_case_idx').on(
      table.userId,
      table.caseNumber,
    ),
  ],
)

export const ledgerEntries = pgTable('ledger_entries', {
  id: serial().primaryKey(),
  caseId: integer('case_id')
    .notNull()
    .references(() => recoveryCases.id, { onDelete: 'cascade' }),
  reference: text().notNull(),
  entryType: text('entry_type').notNull(),
  description: text().notNull(),
  amount: numeric({ precision: 18, scale: 2 }).notNull(),
  status: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const workflowEvents = pgTable('workflow_events', {
  id: serial().primaryKey(),
  caseId: integer('case_id')
    .notNull()
    .references(() => recoveryCases.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  title: text().notNull(),
  detail: text().notNull(),
  status: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
