import { useState, useEffect } from 'react'
import { api } from './api'
import './LeaveOverview.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const LEAVE_TYPE_CONFIG = {
  annual:  { label: 'Annual Leave',  color: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  sick:    { label: 'Sick Leave',    color: '#f472b6', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
  casual:  { label: 'Casual Leave',  color: '#34d399', gradient: 'linear-gradient(135deg, #059669, #34d399)' },
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  className: 'status-pending' },
  approved: { label: 'Approved', className: 'status-approved' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
}

export default function LeaveOverview({ onBack, secretCode }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [historyFilter, setHistoryFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getLeaveOverview(secretCode)
        setOverview(data)
      } catch (err) {
        setError(err.message || 'Failed to load overview')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [secretCode])

  if (loading) {
    return (
      <div className="overview-page">
        <div className="overview-loading">
          <div className="overview-spinner" />
          <p>Loading your leave overview…</p>
        </div>
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="overview-page">
        <div className="overview-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>{error || 'Could not load your overview.'}</p>
          <button className="back-btn" onClick={onBack}>Go Back</button>
        </div>
      </div>
    )
  }

  const { employee, balance, rules, applications } = overview

  const balanceCards = [
    {
      type: 'annual',
      taken: balance.annual_taken,
      total: rules.annual_leave,
    },
    {
      type: 'sick',
      taken: balance.sick_taken,
      total: rules.sick_leave,
    },
    {
      type: 'casual',
      taken: balance.casual_taken,
      total: rules.casual_leave,
    },
  ]

  const filteredApps = historyFilter === 'all'
    ? applications
    : applications.filter(a => a.status === historyFilter)

  return (
    <div className="overview-page">
      {/* ── Header ── */}
      <div className="overview-header-bar">
        <button className="back-btn" onClick={onBack} id="overview-back-btn" aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="overview-title-area">
          <div className="overview-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1>Leave Overview</h1>
            <p>Your leave summary for {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* ── Employee Info ── */}
      <div className="overview-employee-card">
        <div className="overview-employee-avatar">
          {employee.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="overview-employee-info">
          <div className="overview-employee-name">{employee.name}</div>
          <div className="overview-employee-meta">
            <span>{employee.role}</span>
            <span className="meta-dot">·</span>
            <span>{employee.branch}</span>
            {employee.department && (
              <>
                <span className="meta-dot">·</span>
                <span>{employee.department}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance Cards ── */}
      <div className="overview-section-title">Leave Balance — {new Date().getFullYear()}</div>
      <div className="overview-balance-grid">
        {balanceCards.map(({ type, taken, total }) => {
          const config = LEAVE_TYPE_CONFIG[type]
          const remaining = Math.max(0, total - taken)
          const pct = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0
          return (
            <div className="overview-balance-card" key={type}>
              <div className="balance-card-top">
                <div className="balance-type-label" style={{ color: config.color }}>{config.label}</div>
                <div className="balance-remaining">
                  <span className="balance-remaining-num">{remaining}</span>
                  <span className="balance-remaining-of">/ {total} remaining</span>
                </div>
              </div>
              <div className="balance-progress-wrap">
                <div className="balance-progress-bg">
                  <div
                    className="balance-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: config.gradient,
                    }}
                  />
                </div>
                <div className="balance-progress-labels">
                  <span>{taken} taken</span>
                  <span>{pct}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Leave History ── */}
      <div className="overview-section-title" style={{ marginTop: '36px' }}>
        Leave History
        <span className="overview-history-count">{applications.length} total</span>
      </div>

      {/* Filter tabs */}
      <div className="overview-filter-tabs">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            className={`overview-filter-tab ${historyFilter === f ? 'active' : ''} ${f !== 'all' ? `tab-${f}` : ''}`}
            onClick={() => setHistoryFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="tab-count">
              {f === 'all' ? applications.length : applications.filter(a => a.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filteredApps.length === 0 ? (
        <div className="overview-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
            <path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
          </svg>
          <p>No {historyFilter === 'all' ? '' : historyFilter} applications found.</p>
        </div>
      ) : (
        <div className="overview-history-list">
          {filteredApps.map((app, i) => {
            const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
            const typeConf = LEAVE_TYPE_CONFIG[app.leave_type] || LEAVE_TYPE_CONFIG.annual
            const isExpanded = expandedId === app.id
            return (
              <div
                key={app.id}
                className={`overview-app-card ${isExpanded ? 'expanded' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <button
                  className="overview-app-header"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  <div className="overview-app-type-dot" style={{ background: typeConf.gradient }} />

                  <div className="overview-app-type">
                    <div className="overview-app-type-label" style={{ color: typeConf.color }}>
                      {typeConf.label}
                    </div>
                    <div className="overview-app-days">
                      {app.leaveDates.length} day{app.leaveDates.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="overview-app-dates">
                    <div className="overview-app-date-range">
                      {app.leaveDates.length === 1
                        ? formatDate(app.leaveDates[0])
                        : `${formatDate(app.leaveDates[0])} → ${formatDate(app.leaveDates[app.leaveDates.length - 1])}`
                      }
                    </div>
                    <div className="overview-app-applied">Applied {formatDate(app.appliedDate)}</div>
                  </div>

                  <span className={`status-badge ${status.className}`}>
                    {status.label}
                  </span>

                  <div className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="overview-app-detail">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Leave Dates</span>
                        <div className="detail-dates">
                          {app.leaveDates.map(d => (
                            <span key={d} className="date-chip">{formatDate(d)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Returning Date</span>
                        <span className="detail-value">{formatDate(app.returningDate)}</span>
                      </div>
                      {app.substituteName && (
                        <div className="detail-item">
                          <span className="detail-label">Substitute</span>
                          <span className="detail-value">
                            {app.substituteName}
                            <span className={`sub-confirmed ${app.substituteConfirmed ? 'yes' : 'no'}`}>
                              {app.substituteConfirmed ? ' ✓ Confirmed' : ' · Pending confirmation'}
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">Application ID</span>
                        <span className="detail-value mono">{app.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
