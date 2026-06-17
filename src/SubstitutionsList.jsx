import { useState } from 'react'
import './LeaveList.css'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'status-pending',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  confirmed: {
    label: 'Confirmed',
    className: 'status-approved',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Substitutions' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function SubstitutionsList({ onBack, onAgree, submissions = [], employees = [], branches = [], roles = [], applicant }) {
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  // Filter to only show applications where the applicant is the substitute
  const mySubs = submissions.filter(s => s.substitute_employee_id === applicant?.id)

  const enrichedSubmissions = mySubs.map(sub => {
    const emp = employees.find(e => e.id === sub.employee_id)
    const branch = branches.find(b => b.id === emp?.branch_id)
    const role = roles.find(r => r.id === emp?.role_id)

    return {
      id: sub.id,
      name: emp?.name || 'Unknown',
      branch: branch?.name || 'Unknown',
      department: 'N/A', // Deprecated
      post: role?.title || 'Unknown',
      appliedDate: sub.appliedDate,
      leaveDates: sub.leaveDates || [],
      returningDate: sub.returningDate,
      leave_type: sub.leave_type,
      status: sub.substituteConfirmed ? 'confirmed' : 'pending',
      originalSubmission: sub
    }
  })

  const filtered = enrichedSubmissions.filter((app) => {
    return filter === 'all' || app.status === filter
  })

  const counts = {
    all: enrichedSubmissions.length,
    pending: enrichedSubmissions.filter((a) => a.status === 'pending').length,
    confirmed: enrichedSubmissions.filter((a) => a.status === 'confirmed').length,
  }

  return (
    <div className="list-page">
      {/* ── Page Header ── */}
      <div className="list-header-bar">
        <button className="back-btn" onClick={onBack} id="back-to-form-btn" aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', margin: '0' }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="list-title-area">
          <div className="list-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1>Substitution Agreements</h1>
            <p>{counts.pending} pending requests</p>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="summary-cards">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            className={`summary-card summary-${value} ${filter === value ? 'active' : ''}`}
            onClick={() => setFilter(value)}
            id={`filter-${value}-btn`}
            style={{ padding: '16px 20px' }}
          >
            <span className="summary-count">{counts[value]}</span>
            <span className="summary-label">{label}</span>
          </button>
        ))}
      </div>



      {/* ── Applications Table ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>No substitutions found</h3>
          <p>You have no substitution requests matching this filter.</p>
        </div>
      ) : (
        <div className="applications-list">
          {filtered.map((app, i) => {
            const status = STATUS_CONFIG[app.status]
            const isExpanded = expandedId === app.id
            return (
              <div
                key={app.id}
                className={`app-card ${isExpanded ? 'expanded' : ''}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Card header — always visible */}
                <button
                  className="app-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  aria-expanded={isExpanded}
                  id={`app-card-${app.id}`}
                >
                  <div className="app-id-col">
                    <span className="app-id">{app.id}</span>
                  </div>

                  <div className="app-name-col">
                    <div className="app-avatar">
                      {app.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="app-name">{app.name}</div>
                      <div className="app-meta">{app.post}</div>
                    </div>
                  </div>

                  <div className="app-branch-col">
                    <div className="app-branch">{app.branch}</div>
                    <div className="app-meta">{app.department}</div>
                  </div>

                  <div className="app-dates-col">
                    <div className="app-dates">
                      {app.leaveDates.length === 1
                        ? formatDate(app.leaveDates[0])
                        : `${formatDate(app.leaveDates[0])} +${app.leaveDates.length - 1} more`}
                    </div>
                    <div className="app-meta">Applied {formatDate(app.appliedDate)}</div>
                  </div>

                  <div className="app-status-col">
                    <span className={`status-badge ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  <div className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="app-card-detail">
                    <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <div className="detail-item">
                        <span className="detail-label">Leave Dates</span>
                        <div className="detail-dates">
                          {app.leaveDates.map((d) => (
                            <span key={d} className="date-chip">{formatDate(d)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Returning Date</span>
                        <span className="detail-value">{formatDate(app.returningDate)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Leave Type</span>
                        <span className="detail-value" style={{ textTransform: 'capitalize' }}>{app.leave_type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Application ID</span>
                        <span className="detail-value mono">{app.id}</span>
                      </div>
                    </div>

                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--bg-card-border)' }}>
                        <button
                          className="btn-primary"
                          onClick={() => onAgree(app.originalSubmission)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Agree to Substitute
                        </button>
                      </div>
                    )}
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

