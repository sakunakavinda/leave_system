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
  approved: {
    label: 'Approved',
    className: 'status-approved',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  rejected: {
    label: 'Rejected',
    className: 'status-rejected',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Applications' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function LeaveList({ onBack, submissions = [], employees = [], branches = [], roles = [], applicant }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  // Filter to only show the applicant's own applications
  const mySubmissions = submissions.filter(s => s.employee_id === applicant?.id)

  const enrichedSubmissions = mySubmissions.map(sub => {
    const emp = employees.find(e => e.id === sub.employee_id)
    const branch = branches.find(b => b.id === emp?.branch_id)
    const role = roles.find(r => r.id === emp?.role_id)
    const subEmp = employees.find(e => e.id === sub.substitute_employee_id)

    return {
      id: sub.id,
      name: emp?.name || 'Unknown',
      branch: branch?.name || 'Unknown',
      department: 'N/A', // Deprecated
      post: role?.title || 'Unknown',
      appliedDate: sub.appliedDate,
      leaveDates: sub.leaveDates || [],
      returningDate: sub.returningDate,
      substituteName: subEmp?.name || 'Unknown',
      status: sub.status,
    }
  })

  const filtered = enrichedSubmissions.filter((app) => {
    const matchesFilter = filter === 'all' || app.status === filter
    const matchesBranch = branchFilter === 'all' || app.branch === branchFilter
    const query = search.toLowerCase()
    const matchesSearch =
      !query ||
      app.name.toLowerCase().includes(query) ||
      app.branch.toLowerCase().includes(query) ||
      app.department.toLowerCase().includes(query) ||
      app.id.toLowerCase().includes(query)
    return matchesFilter && matchesBranch && matchesSearch
  })

  const counts = {
    all: enrichedSubmissions.length,
    pending: enrichedSubmissions.filter((a) => a.status === 'pending').length,
    approved: enrichedSubmissions.filter((a) => a.status === 'approved').length,
    rejected: enrichedSubmissions.filter((a) => a.status === 'rejected').length,
  }

  return (
    <div className="list-page">
      {/* ── Page Header ── */}
      <div className="list-header-bar">
        <button className="back-btn" onClick={onBack} id="back-to-form-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        <div className="list-title-area">
          <div className="list-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div>
            <h1>Leave Applications</h1>
            <p>{enrichedSubmissions.length} total records</p>
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
          >
            <span className="summary-count">{counts[value]}</span>
            <span className="summary-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="list-controls">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            id="search-applications"
            placeholder="Search by name, branch, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <select
          className="filter-select"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          id="branch-filter-select"
        >
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>

        <select
          className="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          id="status-filter-select"
        >
          {FILTER_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* ── Applications Table ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
          </svg>
          <h3>No applications found</h3>
          <p>Try adjusting your search or filter.</p>
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
                    <div className="detail-grid">
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
                        <span className="detail-label">Substitute</span>
                        <span className="detail-value">{app.substituteName}</span>
                      </div>
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
