import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { logout, type User } from '@netlify/identity'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Bell,
  Blocks,
  BookOpenText,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CloudCog,
  DatabaseZap,
  FileCheck2,
  Fingerprint,
  HandCoins,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

type CaseRecord = {
  id: number
  caseNumber: string
  clientName: string
  desk: string
  recoveryProfitBalance: string
  recoveryAffiliateBalance: string
  totalAssetsRecovery: string
  hardshipCredits: string
  syncProgress: number
  synchronizationStatus: string
  assetStatus: string
  batchStatus: string
  updatedAt: string
}

type LedgerEntry = {
  id: number
  reference: string
  entryType: string
  description: string
  amount: string
  status: string
  createdAt: string
}

type WorkflowEvent = {
  id: number
  eventType: string
  title: string
  detail: string
  status: string
  createdAt: string
}

type CasePayload = {
  case: CaseRecord
  ledger: LedgerEntry[]
  events: WorkflowEvent[]
}

type DashboardProps = {
  user: User
  onSignedOut: () => void
}

type ActionMode = 'provision' | 'release' | 'batch'

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const fallbackTrend = [1.86, 1.94, 2.03, 2.18, 2.26, 2.39, 2.51, 2.67, 2.78]

export function RecoveryDashboard({ user, onSignedOut }: DashboardProps) {
  const [payload, setPayload] = useState<CasePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [actionMode, setActionMode] = useState<ActionMode | null>(null)
  const [actionAmount, setActionAmount] = useState('25000')
  const [provisionTarget, setProvisionTarget] = useState<'profit' | 'affiliate' | 'hardship'>('profit')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const loadCase = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/recovery/case', { credentials: 'include' })
      const data = (await response.json()) as CasePayload & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Case ledger is unavailable')
      setPayload(data)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load case data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadCase()
    const clock = window.setInterval(() => setNow(new Date()), 1000)
    const refresh = window.setInterval(() => void loadCase(true), 30000)
    return () => {
      window.clearInterval(clock)
      window.clearInterval(refresh)
    }
  }, [])

  const runAction = async (
    action:
      | { type: 'provision'; amount: number; target: 'profit' | 'affiliate' | 'hardship' }
      | { type: 'release'; amount: number }
      | { type: 'batch'; amount: number }
      | { type: 'synchronize' },
  ) => {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/recovery/case', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action),
      })
      const data = (await response.json()) as CasePayload & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Workflow could not be completed')
      setPayload(data)
      setActionMode(null)
      setToast(
        action.type === 'synchronize'
          ? 'Synchronization cycle completed'
          : 'Ledger instruction recorded',
      )
      window.setTimeout(() => setToast(''), 3600)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Workflow failed')
    } finally {
      setSubmitting(false)
    }
  }

  const submitAction = () => {
    if (!actionMode) return
    const amount = Number(actionAmount)
    if (actionMode === 'provision') {
      void runAction({ type: actionMode, amount, target: provisionTarget })
    } else {
      void runAction({ type: actionMode, amount })
    }
  }

  const signOut = async () => {
    await logout()
    onSignedOut()
  }

  const chartData = useMemo(() => {
    const current = payload ? Number(payload.case.totalAssetsRecovery) / 1_000_000 : 2.78
    const values = fallbackTrend.map((value, index) =>
      index === fallbackTrend.length - 1 ? current : Math.min(value, current * 0.96),
    )
    return {
      labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Current'],
      datasets: [
        {
          data: values,
          borderColor: '#9c7b3d',
          backgroundColor: 'rgba(156, 123, 61, 0.08)',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.36,
          fill: true,
        },
      ],
    }
  }, [payload])

  const metrics = payload
    ? [
        {
          label: 'Recovery profits balance',
          value: payload.case.recoveryProfitBalance,
          meta: 'Net cleared proceeds',
          change: '+4.8%',
          icon: TrendingUp,
        },
        {
          label: 'Recovery affiliate balance',
          value: payload.case.recoveryAffiliateBalance,
          meta: 'Available reserve',
          change: '+2.1%',
          icon: WalletCards,
        },
        {
          label: 'Total assets recovery',
          value: payload.case.totalAssetsRecovery,
          meta: 'Controlled valuation',
          change: '+6.4%',
          icon: Landmark,
          featured: true,
        },
        {
          label: 'Hardship credits',
          value: payload.case.hardshipCredits,
          meta: 'Protected allocation',
          change: 'Stable',
          icon: HandCoins,
        },
      ]
    : []

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-wordmark wordmark"><span className="wordmark-mark"><Landmark size={18} /></span>DIABITRAGE</div>
        <div className="loading-line"><span /></div>
        <p>Establishing protected ledger session</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={mobileOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sidebar-head">
          <div className="wordmark wordmark-light">
            <span className="wordmark-mark"><Landmark size={18} /></span>
            <span>DIABITRAGE</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <div className="desk-label">
          <span>INTERNAL CENTER</span>
          <strong>Asset Recovery</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <a className="active" href="#overview"><Blocks size={18} /><span>Executive overview</span></a>
          <a href="#ledger"><BookOpenText size={18} /><span>Operational ledger</span></a>
          <a href="#synchronization"><Network size={18} /><span>Asset synchronization</span><em>4</em></a>
          <a href="#workflows"><DatabaseZap size={18} /><span>Axiom batches</span></a>
          <a href="#controls"><ShieldCheck size={18} /><span>Control environment</span></a>
        </nav>
        <div className="sidebar-case">
          <div className="case-lock"><LockKeyhole size={16} /> Protected case</div>
          <strong>DB-P-2023-W</strong>
          <span>London Desk · LDN-04</span>
          <div className="case-health"><i /><span>All controls nominal</span></div>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">{(user.name || user.email || 'D').slice(0, 1).toUpperCase()}</div>
          <div><strong>{user.name || 'Authorized operator'}</strong><span>{user.email}</span></div>
          <button onClick={() => void signOut()} aria-label="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Recovery center</span><i>/</i><strong>Executive overview</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="desk-time"><span>London · GMT</span><strong>{now.toLocaleTimeString('en-GB')}</strong></div>
          </div>
        </header>

        <main className="dashboard-main" id="overview">
          {toast && <div className="toast"><Check size={17} />{toast}</div>}
          <section className="dashboard-heading">
            <div>
              <p className="eyebrow">Case command · DB-P-2023-W</p>
              <h1>Recovery position</h1>
              <p>Executive control surface for reconciled assets and governed liquidity.</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" onClick={() => void loadCase(true)} disabled={refreshing}>
                <RefreshCw className={refreshing ? 'spin' : ''} size={16} /> Refresh ledger
              </button>
              <button className="primary-button" onClick={() => setActionMode('release')}><CircleDollarSign size={17} /> Release liquidity</button>
            </div>
          </section>

          {error && (
            <div className="dashboard-error"><ShieldCheck size={18} /><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>
          )}

          {payload && (
            <>
              <section className="case-banner">
                <div className="case-banner-id">
                  <span>Active recovery case</span>
                  <strong>{payload.case.caseNumber}</strong>
                </div>
                <div className="case-banner-meta"><span>Client record</span><strong className="capitalize">{payload.case.clientName}</strong></div>
                <div className="case-banner-meta"><span>Operating desk</span><strong>{payload.case.desk}</strong></div>
                <div className="case-banner-meta"><span>Asset control</span><strong className="status-inline"><i />{payload.case.assetStatus}</strong></div>
                <button aria-label="Open case options"><ChevronDown size={18} /></button>
              </section>

              <section className="metrics-grid" aria-label="Recovery balances">
                {metrics.map((metric) => (
                  <article className={metric.featured ? 'metric-card metric-featured' : 'metric-card'} key={metric.label}>
                    <div className="metric-top"><span>{metric.label}</span><metric.icon size={18} /></div>
                    <strong>{currency.format(Number(metric.value))}</strong>
                    <div className="metric-bottom"><span>{metric.meta}</span><em className={metric.change === 'Stable' ? 'neutral' : ''}>{metric.change}</em></div>
                  </article>
                ))}
              </section>

              <section className="primary-grid">
                <article className="panel recovery-chart-panel">
                  <div className="panel-heading">
                    <div><p className="eyebrow">Recovery trajectory</p><h2>Consolidated asset position</h2></div>
                    <div className="chart-legend"><i />Cleared valuation</div>
                  </div>
                  <div className="chart-summary">
                    <div><strong>{currency.format(Number(payload.case.totalAssetsRecovery))}</strong><span>Current recovered assets</span></div>
                    <div><span>Period movement</span><strong><ArrowDownRight size={15} /> +£918k</strong></div>
                  </div>
                  <div className="chart-wrap">
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { displayColors: false } },
                        scales: {
                          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#7d7a71', font: { size: 11 } } },
                          y: { border: { display: false }, grid: { color: '#ebe8e0' }, ticks: { color: '#7d7a71', callback: (value) => `£${value}m` } },
                        },
                      }}
                    />
                  </div>
                </article>

                <article className="panel sync-panel" id="synchronization">
                  <div className="panel-heading">
                    <div><p className="eyebrow">Final synchronization</p><h2>Ledger convergence</h2></div>
                    <CloudCog size={20} />
                  </div>
                  <div className="sync-ring" style={{ '--progress': `${payload.case.syncProgress * 3.6}deg` } as CSSProperties}>
                    <div><strong>{payload.case.syncProgress}%</strong><span>converged</span></div>
                  </div>
                  <div className="sync-status"><i /><div><strong>{payload.case.synchronizationStatus}</strong><span>Last cycle {shortDate.format(new Date(payload.case.updatedAt))}</span></div></div>
                  <div className="sync-nodes">
                    {['LDN Core', 'Zurich', 'Singapore', 'Affiliate'].map((node, index) => (
                      <div key={node}><span className={index < Math.ceil(payload.case.syncProgress / 25) ? 'node-complete' : ''}><Check size={11} /></span><strong>{node}</strong></div>
                    ))}
                  </div>
                  <button className="panel-action" onClick={() => void runAction({ type: 'synchronize' })} disabled={submitting || payload.case.syncProgress === 100}>
                    <RefreshCw className={submitting ? 'spin' : ''} size={16} />
                    {payload.case.syncProgress === 100 ? 'Synchronization sealed' : 'Run synchronization cycle'}
                  </button>
                </article>
              </section>

              <section className="secondary-grid">
                <article className="panel ledger-panel" id="ledger">
                  <div className="panel-heading ledger-heading">
                    <div><p className="eyebrow">Live control record</p><h2>Operational ledger</h2></div>
                    <button className="text-button"><SlidersHorizontal size={15} />Filter</button>
                  </div>
                  <div className="ledger-table-wrap">
                    <table>
                      <thead><tr><th>Reference</th><th>Instruction</th><th>Status</th><th>Value</th><th>Recorded</th></tr></thead>
                      <tbody>
                        {payload.ledger.map((entry) => (
                          <tr key={entry.id}>
                            <td><span className="ledger-reference">{entry.reference}</span></td>
                            <td><strong>{entry.entryType}</strong><span>{entry.description}</span></td>
                            <td><span className="table-status"><i />{entry.status}</span></td>
                            <td className="amount">{currency.format(Number(entry.amount))}</td>
                            <td>{shortDate.format(new Date(entry.createdAt))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="panel workflow-panel" id="workflows">
                  <div className="panel-heading"><div><p className="eyebrow">Control sequence</p><h2>Recovery workflow</h2></div><Activity size={19} /></div>
                  <div className="workflow-list">
                    {payload.events.slice(0, 4).map((event, index) => (
                      <div className="workflow-item" key={event.id}>
                        <div className={event.status === 'Complete' ? 'workflow-marker complete' : 'workflow-marker'}>{event.status === 'Complete' ? <Check size={13} /> : index + 1}</div>
                        <div><strong>{event.title}</strong><p>{event.detail}</p><span>{event.status}</span></div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="action-strip" id="controls">
                <div className="action-strip-intro"><span><Sparkles size={17} /></span><div><strong>Desk operations</strong><p>Issue governed instructions against the active case ledger.</p></div></div>
                <div className="action-cards">
                  <button onClick={() => setActionMode('provision')}><HandCoins size={18} /><span><strong>Manual provision</strong><em>Allocate controlled funds</em></span><ArrowRight size={16} /></button>
                  <button onClick={() => setActionMode('batch')}><DatabaseZap size={18} /><span><strong>Axiom batch</strong><em>Clear a recovery batch</em></span><ArrowRight size={16} /></button>
                  <button onClick={() => setActionMode('release')}><BadgeCheck size={18} /><span><strong>Liquidity release</strong><em>Move approved reserve</em></span><ArrowRight size={16} /></button>
                </div>
              </section>

              <footer className="dashboard-footer">
                <span><Fingerprint size={14} />Session bound to {user.email}</span>
                <span>Financial workflow simulation · No external transfer capability</span>
                <span><Clock3 size={14} />Auto-refresh 30s</span>
              </footer>
            </>
          )}
        </main>
      </div>

      {actionMode && (
        <div className="modal-layer" role="presentation" onMouseDown={() => !submitting && setActionMode(null)}>
          <section className="action-modal" role="dialog" aria-modal="true" aria-label="Desk instruction" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div><p className="eyebrow">Controlled desk instruction</p><h2>{actionMode === 'provision' ? 'Manual provisioning' : actionMode === 'batch' ? 'Axiom batch processing' : 'Liquidity release'}</h2></div>
              <button onClick={() => setActionMode(null)} aria-label="Close"><X size={19} /></button>
            </div>
            <div className="modal-case"><FileCheck2 size={18} /><div><span>Active case</span><strong>DB-P-2023-W</strong></div><em>Verified</em></div>
            {actionMode === 'provision' && (
              <label className="modal-field"><span>Provision destination</span><select value={provisionTarget} onChange={(event) => setProvisionTarget(event.target.value as typeof provisionTarget)}><option value="profit">Recovery profits balance</option><option value="affiliate">Recovery affiliate balance</option><option value="hardship">Hardship credits</option></select></label>
            )}
            <label className="modal-field"><span>Instruction value (GBP)</span><div className="amount-input"><span>£</span><input type="number" min="1000" step="1000" value={actionAmount} onChange={(event) => setActionAmount(event.target.value)} /></div></label>
            <div className="modal-control"><ShieldCheck size={18} /><div><strong>Dual-control simulation</strong><p>This action records a protected ledger entry and workflow event. It cannot transmit external funds.</p></div></div>
            <button className="primary-button modal-submit" onClick={submitAction} disabled={submitting || !Number(actionAmount)}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={17} />}
              {submitting ? 'Recording instruction…' : 'Authorize ledger instruction'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
