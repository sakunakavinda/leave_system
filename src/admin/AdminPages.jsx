import { useState } from 'react'
import './admin.css'

/* ── Shared mock data ─────────────────────────────── */
export const INITIAL_APPLICATIONS = [
  { id: 'LA-0001', name: 'John Doe',       branch: 'Colombo', department: 'Engineering', post: 'Senior Engineer',  appliedDate: '2026-06-10', leaveDates: ['2026-06-16','2026-06-17'], returningDate: '2026-06-18', substituteName: 'Alex Johnson',   status: 'approved' },
  { id: 'LA-0002', name: 'Jane Smith',     branch: 'Kandy',   department: 'Finance',     post: 'Accountant',       appliedDate: '2026-06-11', leaveDates: ['2026-06-20'],              returningDate: '2026-06-21', substituteName: 'Sarah Williams', status: 'pending'  },
  { id: 'LA-0003', name: 'Alex Johnson',   branch: 'Galle',   department: 'HR',          post: 'HR Manager',       appliedDate: '2026-06-09', leaveDates: ['2026-06-14','2026-06-15'], returningDate: '2026-06-17', substituteName: 'Michael Brown',  status: 'rejected' },
  { id: 'LA-0004', name: 'Sarah Williams', branch: 'Negombo', department: 'Operations',  post: 'Operations Lead',  appliedDate: '2026-06-12', leaveDates: ['2026-06-19'],              returningDate: '2026-06-20', substituteName: 'John Doe',       status: 'pending'  },
  { id: 'LA-0005', name: 'Michael Brown',  branch: 'Jaffna',  department: 'Engineering', post: 'Junior Developer', appliedDate: '2026-06-08', leaveDates: ['2026-06-13','2026-06-14'], returningDate: '2026-06-15', substituteName: 'Jane Smith',     status: 'approved' },
  { id: 'LA-0006', name: 'John Doe',       branch: 'Colombo', department: 'Engineering', post: 'Senior Engineer',  appliedDate: '2026-06-05', leaveDates: ['2026-06-09'],              returningDate: '2026-06-10', substituteName: 'Alex Johnson',   status: 'rejected' },
]

export const INITIAL_EMPLOYEES = [
  { id: 'EMP-001', name: 'John Doe',       secretCode: '12345678', post: 'Senior Engineer',  department: 'Engineering', branch: 'Colombo', status: 'active'   },
  { id: 'EMP-002', name: 'Jane Smith',     secretCode: '23456789', post: 'Accountant',       department: 'Finance',     branch: 'Kandy',   status: 'active'   },
  { id: 'EMP-003', name: 'Alex Johnson',   secretCode: '34567890', post: 'HR Manager',       department: 'HR',          branch: 'Galle',   status: 'active'   },
  { id: 'EMP-004', name: 'Sarah Williams', secretCode: '45678901', post: 'Operations Lead',  department: 'Operations',  branch: 'Negombo', status: 'active'   },
  { id: 'EMP-005', name: 'Michael Brown',  secretCode: '56789012', post: 'Junior Developer', department: 'Engineering', branch: 'Jaffna',  status: 'inactive' },
]

export const INITIAL_BRANCHES = [
  { id: 'BR-001', name: 'Colombo',  location: 'Western Province',   manager: 'John Doe',       employees: 42, status: 'active'   },
  { id: 'BR-002', name: 'Kandy',    location: 'Central Province',   manager: 'Jane Smith',     employees: 18, status: 'active'   },
  { id: 'BR-003', name: 'Galle',    location: 'Southern Province',  manager: 'Alex Johnson',   employees: 14, status: 'active'   },
  { id: 'BR-004', name: 'Jaffna',   location: 'Northern Province',  manager: 'Michael Brown',  employees: 10, status: 'inactive' },
  { id: 'BR-005', name: 'Negombo',  location: 'Western Province',   manager: 'Sarah Williams', employees: 21, status: 'active'   },
]

export const INITIAL_MANAGERS = [
  { id: 'MGR-001', username: 'johndoe',   password: 'password', branch: 'Colombo', status: 'active', role: 'manager'   },
  { id: 'MGR-002', username: 'janesmith', password: 'password', branch: 'Kandy',   status: 'active', role: 'super manager' },
  { id: 'MGR-003', username: 'alexj',     password: 'password', branch: 'Galle',   status: 'active', role: 'manager'   },
  { id: 'MGR-004', username: 'sarahw',    password: 'password', branch: 'Negombo', status: 'active', role: 'super manager' },
  { id: 'MGR-005', username: 'michaelb',  password: 'password', branch: 'Jaffna',  status: 'inactive', role: 'manager' },
]

export const INITIAL_DEPARTMENTS = [
  { id: 'DEPT-001', name: 'Engineering',  description: 'Software and systems engineering', status: 'active' },
  { id: 'DEPT-002', name: 'Finance',      description: 'Financial management and accounting', status: 'active' },
  { id: 'DEPT-003', name: 'HR',           description: 'Human resources management', status: 'active' },
  { id: 'DEPT-004', name: 'Operations',   description: 'Business operations and logistics', status: 'active' },
  { id: 'DEPT-005', name: 'Marketing',    description: 'Marketing and communications', status: 'inactive' },
]

export const INITIAL_ROLES = [
  { id: 'ROLE-001', title: 'Senior Engineer',     department: 'Engineering',  description: 'Leads engineering projects and mentors juniors', status: 'active' },
  { id: 'ROLE-002', title: 'Junior Developer',    department: 'Engineering',  description: 'Entry-level development role', status: 'active' },
  { id: 'ROLE-003', title: 'Software Engineer',   department: 'Engineering',  description: 'Mid-level software development', status: 'active' },
  { id: 'ROLE-004', title: 'Accountant',          department: 'Finance',      description: 'Handles financial records and reporting', status: 'active' },
  { id: 'ROLE-005', title: 'HR Manager',          department: 'HR',           description: 'Manages HR operations and staff welfare', status: 'active' },
  { id: 'ROLE-006', title: 'Operations Lead',     department: 'Operations',   description: 'Leads operational activities and team coordination', status: 'active' },
  { id: 'ROLE-007', title: 'Marketing Specialist', department: 'Marketing',   description: 'Handles marketing campaigns and brand strategy', status: 'inactive' },
]


function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

/* ─────────────────────────────────────────────────────
   AdminDashboard
───────────────────────────────────────────────────── */
export function AdminDashboard({ applications, onUpdateStatus, branches }) {
  const [filter, setFilter]           = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch]           = useState('')
  const [toast, setToast]             = useState(null)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 5, 1))
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true)
  const [selectedDayLeaves, setSelectedDayLeaves] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = (id, action) => {
    onUpdateStatus(id, action)
    showToast(
      action === 'approved' ? 'Application approved successfully' : 'Application rejected',
      action === 'approved' ? 'success' : 'danger'
    )
  }

  const branchFiltered = branchFilter === 'all'
    ? applications
    : applications.filter(app => app.branch === branchFilter)

  const filtered = branchFiltered.filter(app => {
    const matchFilter = filter === 'all' || app.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || app.name.toLowerCase().includes(q) || app.branch.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const counts = {
    total:    branchFiltered.length,
    pending:  branchFiltered.filter(a => a.status === 'pending').length,
    approved: branchFiltered.filter(a => a.status === 'approved').length,
    rejected: branchFiltered.filter(a => a.status === 'rejected').length,
  }

  const getYYYYMMDD = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dayVal = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dayVal}`
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()
  const prevLastDay = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLastDay - i)
    cells.push({ date: d, isCurrentMonth: false, dateString: getYYYYMMDD(d) })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    cells.push({ date: d, isCurrentMonth: true, dateString: getYYYYMMDD(d) })
  }
  const totalCells = 42
  const remaining = totalCells - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({ date: d, isCurrentMonth: false, dateString: getYYYYMMDD(d) })
  }

  const calendarApprovedLeaves = applications.filter(app => {
    if (app.status !== 'approved') return false
    const matchBranch = branchFilter === 'all' || app.branch === branchFilter
    const q = search.toLowerCase()
    const matchSearch = !q || 
      app.name.toLowerCase().includes(q) || 
      app.branch.toLowerCase().includes(q) || 
      app.id.toLowerCase().includes(q)
    return matchBranch && matchSearch
  })

  return (
    <div className="admin-content">
      {/* Stats */}
      <div className="stats-row">
        {[
          { label:'Total Applications', value: counts.total,    icon:'purple', svg:<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>, svgExtra:<><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></> },
          { label:'Pending',            value: counts.pending,  icon:'amber',  svg:<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></> },
          { label:'Approved',           value: counts.approved, icon:'green',  svg:<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> },
          { label:'Rejected',           value: counts.rejected, icon:'red',    svg:<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></> },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon stat-icon-${s.icon}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {s.svg}{s.svgExtra}
              </svg>
            </div>
            <div className="stat-info">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Approved Leaves Calendar */}
      <div className="calendar-card">
        <div className="calendar-header" onClick={() => setIsCalendarExpanded(!isCalendarExpanded)} style={{ cursor: 'pointer' }}>
          <div className="calendar-header-title">
            <div className="calendar-title-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="calendar-title-icon">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h3>Approved Leaves Calendar</h3>
              <span className="calendar-badge">
                {calendarApprovedLeaves.length} Approved
              </span>
            </div>
            <p className="calendar-subtitle">Monthly overview of approved staff leaves</p>
          </div>
          
          <div className="calendar-header-controls" onClick={e => e.stopPropagation()}>
            {isCalendarExpanded && (
              <div className="calendar-month-nav">
                <button className="btn-nav" onClick={() => {
                  setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span className="calendar-month-label">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button className="btn-nav" onClick={() => {
                  setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
            <button className="btn-toggle-expand" onClick={() => setIsCalendarExpanded(!isCalendarExpanded)} title={isCalendarExpanded ? "Collapse Calendar" : "Expand Calendar"}>
              {isCalendarExpanded ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              )}
            </button>
          </div>
        </div>

        {isCalendarExpanded && (
          <div className="calendar-body">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="calendar-weekday">{d}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {cells.map((cell, idx) => {
                const dayLeaves = calendarApprovedLeaves.filter(app => app.leaveDates.includes(cell.dateString))
                const isToday = getYYYYMMDD(new Date()) === cell.dateString
                const hasLeaves = dayLeaves.length > 0
                
                return (
                  <div 
                    key={idx} 
                    className={`calendar-day ${!cell.isCurrentMonth ? 'adjacent-month' : ''} ${isToday ? 'today' : ''} ${hasLeaves ? 'has-leaves' : ''}`}
                    onClick={hasLeaves ? () => setSelectedDayLeaves({ date: cell.dateString, leaves: dayLeaves }) : undefined}
                    style={hasLeaves ? { cursor: 'pointer' } : undefined}
                  >
                    <div className="day-number">{cell.date.getDate()}</div>
                    {hasLeaves && (
                      <div className="day-leaves-count">
                        <span className="leaves-count-badge">
                          {dayLeaves.length} {dayLeaves.length === 1 ? 'Leave' : 'Leaves'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="admin-search-box">
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search by name, branch, ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="admin-filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} id="dash-branch-filter">
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <select className="admin-filter-select" value={filter} onChange={e => setFilter(e.target.value)} id="dash-status-filter">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Applicant</th>
              <th>Branch</th>
              <th>Role</th>
              <th>Leave Dates</th>
              <th>Returning</th>
              <th>Substitute</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No applications found</td></tr>
            ) : filtered.map((app, i) => (
              <tr key={app.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <td><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{app.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">{app.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                    <div>
                      <div className="cell-name">{app.name}</div>
                      <div className="cell-sub">{app.department}</div>
                    </div>
                  </div>
                </td>
                <td>{app.branch}</td>
                <td><span style={{ color:'var(--text-secondary)', fontSize:'14px' }}>{app.post || '—'}</span></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '220px' }}>
                    {app.leaveDates.map(date => (
                      <span key={date} style={{
                        fontSize: '12px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDate(date)}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{formatDate(app.returningDate)}</td>
                <td>{app.substituteName}</td>
                <td>
                  {app.status === 'pending'  && <span className="badge badge-pending"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Pending</span>}
                  {app.status === 'approved' && <span className="badge badge-approved"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Approved</span>}
                  {app.status === 'rejected' && <span className="badge badge-rejected"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Rejected</span>}
                </td>
                <td>
                  {app.status === 'pending' ? (
                    <div className="action-btns">
                      <button className="btn-approve" id={`approve-${app.id}`} onClick={() => handleAction(app.id, 'approved')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Approve
                      </button>
                      <button className="btn-reject" id={`reject-${app.id}`} onClick={() => handleAction(app.id, 'rejected')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button className="btn-secondary" style={{fontSize:'12px',padding:'6px 13px'}} onClick={() => handleAction(app.id, 'pending')}>
                      Reset
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leaves Modal */}
      {selectedDayLeaves && (
        <div className="modal-backdrop" onClick={() => setSelectedDayLeaves(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Approved Leaves — {formatDate(selectedDayLeaves.date)}</h3>
              <button className="modal-close" onClick={() => setSelectedDayLeaves(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedDayLeaves.leaves.map((leave) => (
                <div key={leave.id} style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--bg-card-border)', 
                  borderRadius: 'var(--border-radius-sm)', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>{leave.name}</h4>
                    <span className="badge badge-approved" style={{ padding: '2px 8px' }}>Approved</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div><strong>Branch:</strong> {leave.branch}</div>
                    <div><strong>Department:</strong> {leave.department || '—'}</div>
                    <div><strong>Role:</strong> {leave.post || '—'}</div>
                    <div><strong>Substitute:</strong> {leave.substituteName || '—'}</div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>Leave Dates:</strong> {leave.leaveDates.map(d => formatDate(d)).join(', ')}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>Returning Date:</strong> {formatDate(leave.returningDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSelectedDayLeaves(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ── Generate a random unique secret code ── */
function generateSecretCode(existingCodes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code
  do {
    code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  } while (existingCodes.includes(code))
  return code
}

/* ─────────────────────────────────────────────────────
   ManageEmployees
───────────────────────────────────────────────────── */
const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Operations']
const DESIGNATIONS = ['Senior Engineer', 'Junior Developer', 'Software Engineer', 'Accountant', 'HR Manager', 'Operations Lead']

export function ManageEmployees({ branches, employees, setEmployees }) {
  const [search, setSearch]             = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [modal, setModal]               = useState(null) // null | 'add' | employee object
  const [toast, setToast]               = useState(null)
  const [secretCodePopup, setSecretCodePopup] = useState(null)
  const EMPTY_EMP = { name:'', post: DESIGNATIONS[0], department: DEPARTMENTS[0], branch: branches[0]?.name || '', status:'active' }
  const [form, setForm]                 = useState(EMPTY_EMP)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const openAdd  = ()    => { setForm(EMPTY_EMP); setModal('add') }
  const openEdit = (emp) => { setForm({ ...emp }); setModal(emp) }
  const closeModal = ()  => setModal(null)

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal === 'add') {
      const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`
      const existingCodes = employees.map(e => e.secretCode).filter(Boolean)
      const newSecretCode = generateSecretCode(existingCodes)
      setEmployees(prev => [...prev, { ...form, id: newId, secretCode: newSecretCode }])
      setSecretCodePopup({ name: form.name, secretCode: newSecretCode })
      closeModal()
    } else {
      setEmployees(prev => prev.map(e => e.id === modal.id ? { ...e, ...form } : e))
      showToast('Employee updated')
      closeModal()
    }
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return
    setEmployees(prev => prev.filter(e => e.id !== id))
    showToast('Employee removed', 'danger')
  }

  const filtered = employees.filter(e => {
    const matchBranch = branchFilter === 'all' || e.branch === branchFilter
    const q = search.toLowerCase()
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q) || e.branch.toLowerCase().includes(q)
    return matchBranch && matchSearch
  })

  return (
    <div className="admin-content">
      <div className="controls-bar">
        <div className="admin-search-box">
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="admin-filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} id="emp-branch-filter">
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <button className="btn-primary" id="add-employee-btn" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Employee
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Secret Code</th><th>Post</th><th>Branch</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No employees found</td></tr>
            ) : filtered.map((emp, i) => (
              <tr key={emp.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <td><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{emp.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">{emp.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                    <div>
                      <div className="cell-name">{emp.name}</div>
                      <div className="cell-sub">{emp.department}</div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontFamily:'monospace', color:'var(--text-secondary)' }}>{emp.secretCode || '—'}</span></td>
                <td>{emp.post}</td>
                <td>{emp.branch}</td>
                <td>
                  <span className={`badge badge-${emp.status}`}>{emp.status === 'active' ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" id={`edit-emp-${emp.id}`} onClick={() => openEdit(emp)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" id={`del-emp-${emp.id}`} onClick={() => handleDelete(emp.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Full Name *</label>
                  <input placeholder="Full name" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Post / Designation *</label>
                  <select value={form.post} onChange={e => setForm(p=>({...p, post: e.target.value}))}>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Department</label>
                  <select value={form.department} onChange={e => setForm(p=>({...p, department: e.target.value}))}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Branch</label>
                  <select value={form.branch} onChange={e => setForm(p=>({...p, branch: e.target.value}))}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" id="save-employee-btn" onClick={handleSave}>
                {modal === 'add' ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Code Popup */}
      {secretCodePopup && (
        <div className="modal-backdrop" onClick={() => setSecretCodePopup(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Employee Created Successfully</h3>
              <button className="modal-close" onClick={() => setSecretCodePopup(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '32px 24px', gap: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(0,184,148,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 8px' }}>
                  Employee <strong style={{ color: 'var(--text-primary)' }}>{secretCodePopup.name}</strong> has been added.
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>
                  Their secret code is:
                </p>
                <div style={{
                  background: 'rgba(108, 92, 231, 0.1)',
                  border: '2px dashed rgba(108, 92, 231, 0.3)',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  display: 'inline-block'
                }}>
                  <span style={{
                    fontFamily: '"Courier New", monospace',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--accent-light)',
                    letterSpacing: '4px'
                  }}>
                    {secretCodePopup.secretCode}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '16px 0 0' }}>
                  Please share this code with the employee. It cannot be recovered later.
                </p>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" onClick={() => setSecretCodePopup(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ManageBranches
───────────────────────────────────────────────────── */
export function ManageBranches({ branches, setBranches, employees }) {
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [toast, setToast]     = useState(null)
  const EMPTY_BR = { name:'', location:'', manager:'', status:'active' }
  const [form, setForm]       = useState(EMPTY_BR)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const openAdd  = ()    => { setForm(EMPTY_BR); setModal('add') }
  const openEdit = (br)  => { setForm({ ...br }); setModal(br) }
  const closeModal = ()  => setModal(null)

  const getEmployeeCount = (branchName) => {
    return employees ? employees.filter(e => e.branch === branchName).length : 0
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const empCount = getEmployeeCount(form.name)
    if (modal === 'add') {
      const newId = `BR-${String(branches.length + 1).padStart(3, '0')}`
      setBranches(prev => [...prev, { ...form, id: newId, employees: empCount }])
      showToast('Branch added successfully')
    } else {
      setBranches(prev => prev.map(b => b.id === modal.id ? { ...b, ...form, employees: empCount } : b))
      showToast('Branch updated')
    }
    closeModal()
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to remove this branch?')) return
    setBranches(prev => prev.filter(b => b.id !== id))
    showToast('Branch removed', 'danger')
  }

  const filtered = branches.filter(b => {
    const q = search.toLowerCase()
    return !q || b.name.toLowerCase().includes(q) || b.location.toLowerCase().includes(q) || b.manager.toLowerCase().includes(q)
  })

  return (
    <div className="admin-content">
      <div className="controls-bar">
        <div className="admin-search-box">
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search branches…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" id="add-branch-btn" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Branch
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Branch Name</th><th>Location</th><th>Manager</th><th>Employees</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No branches found</td></tr>
            ) : filtered.map((br, i) => (
              <tr key={br.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <td><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{br.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">
                      {br.name.slice(0,2).toUpperCase()}
                    </div>
                    <div className="cell-name">{br.name}</div>
                  </div>
                </td>
                <td style={{ color:'var(--text-secondary)' }}>{br.location}</td>
                <td>{br.manager}</td>
                <td>
                  <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{getEmployeeCount(br.name)}</span>
                  <span style={{ fontSize:'12px', color:'var(--text-muted)', marginLeft:4 }}>staff</span>
                </td>
                <td>
                  <span className={`badge badge-${br.status}`}>{br.status === 'active' ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" id={`edit-br-${br.id}`} onClick={() => openEdit(br)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" id={`del-br-${br.id}`} onClick={() => handleDelete(br.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Branch' : 'Edit Branch'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Branch Name *</label>
                  <input placeholder="e.g. Colombo" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input placeholder="Province / City" value={form.location} onChange={e => setForm(p=>({...p, location: e.target.value}))} />
                </div>
              </div>
              <div className="field">
                <label>Branch Manager</label>
                <input placeholder="Manager name" value={form.manager} onChange={e => setForm(p=>({...p, manager: e.target.value}))} />
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" id="save-branch-btn" onClick={handleSave}>
                {modal === 'add' ? 'Add Branch' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ManageManagers
───────────────────────────────────────────────────── */
export function ManageManagers({ branches, managers, setManagers }) {
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null) // null | 'add' | manager object
  const [toast, setToast]         = useState(null)
  const EMPTY_MGR = { username:'', branch: branches[0]?.name || '', status:'active', role: 'manager' }
  const [form, setForm]           = useState(EMPTY_MGR)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const openAdd  = ()    => { setForm(EMPTY_MGR); setModal('add') }
  const openEdit = (mgr) => { setForm({ ...mgr }); setModal(mgr) }
  const closeModal = ()  => setModal(null)

  const handleSave = () => {
    if (!form.username.trim()) return
    if (modal === 'add') {
      const newId = `MGR-${String(managers.length + 1).padStart(3, '0')}`
      setManagers(prev => [...prev, { ...form, id: newId }])
      showToast('Manager added successfully')
    } else {
      setManagers(prev => prev.map(m => m.id === modal.id ? { ...m, ...form } : m))
      showToast('Manager updated')
    }
    closeModal()
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to remove this manager?')) return
    setManagers(prev => prev.filter(m => m.id !== id))
    showToast('Manager removed', 'danger')
  }

  const filtered = managers.filter(m => {
    const q = search.toLowerCase()
    return !q ||
      m.username.toLowerCase().includes(q) ||
      m.branch.toLowerCase().includes(q) ||
      (m.role && m.role.toLowerCase().includes(q))
  })

  return (
    <div className="admin-content">
      <div className="controls-bar">
        <div className="admin-search-box">
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search managers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" id="add-manager-btn" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Manager
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Username</th><th>Type</th><th>Branch</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No managers found</td></tr>
            ) : filtered.map((mgr, i) => (
              <tr key={mgr.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <td><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{mgr.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">{mgr.username.slice(0,2).toUpperCase()}</div>
                    <div>
                      <div className="cell-name">{mgr.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${mgr.role === 'super manager' ? 'super-manager' : 'manager'}`}>
                    {mgr.role === 'super manager' ? 'Super Manager' : 'Manager'}
                  </span>
                </td>
                <td>{mgr.branch}</td>

                <td>
                  <span className={`badge badge-${mgr.status}`}>{mgr.status === 'active' ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" id={`edit-mgr-${mgr.id}`} onClick={() => openEdit(mgr)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" id={`del-mgr-${mgr.id}`} onClick={() => handleDelete(mgr.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Manager' : 'Edit Manager'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Username *</label>
                  <input placeholder="e.g. johndoe" value={form.username} onChange={e => setForm(p=>({...p, username: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Branch</label>
                  <select value={form.branch} onChange={e => setForm(p=>({...p, branch: e.target.value}))}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Role</label>
                  <select value={form.role || 'manager'} onChange={e => setForm(p=>({...p, role: e.target.value}))} id="mgr-role-select">
                    <option value="manager">Manager</option>
                    <option value="super manager">Super Manager</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" id="save-manager-btn" onClick={handleSave}>
                {modal === 'add' ? 'Add Manager' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ManageDepartments
───────────────────────────────────────────────────── */
export function ManageDepartments({ departments, setDepartments }) {
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [toast, setToast]     = useState(null)
  const EMPTY_DEPT = { name:'', description:'', status:'active' }
  const [form, setForm]       = useState(EMPTY_DEPT)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const openAdd  = ()    => { setForm(EMPTY_DEPT); setModal('add') }
  const openEdit = (dept)  => { setForm({ ...dept }); setModal(dept) }
  const closeModal = ()  => setModal(null)

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal === 'add') {
      const newId = `DEPT-${String(departments.length + 1).padStart(3, '0')}`
      setDepartments(prev => [...prev, { ...form, id: newId }])
      showToast('Department added successfully')
    } else {
      setDepartments(prev => prev.map(d => d.id === modal.id ? { ...d, ...form } : d))
      showToast('Department updated')
    }
    closeModal()
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to remove this department?')) return
    setDepartments(prev => prev.filter(d => d.id !== id))
    showToast('Department removed', 'danger')
  }

  const filtered = departments.filter(d => {
    const q = search.toLowerCase()
    return !q ||
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q)
  })

  return (
    <div className="admin-content">
      <div className="controls-bar">
        <div className="admin-search-box">
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search departments…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" id="add-department-btn" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Department
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Department Name</th><th>Description</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No departments found</td></tr>
            ) : filtered.map((dept, i) => (
              <tr key={dept.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <td><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{dept.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">
                      {dept.name.slice(0,2).toUpperCase()}
                    </div>
                    <div className="cell-name">{dept.name}</div>
                  </div>
                </td>
                <td style={{ color:'var(--text-secondary)' }}>{dept.description}</td>
                <td>
                  <span className={`badge badge-${dept.status}`}>{dept.status === 'active' ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" id={`edit-dept-${dept.id}`} onClick={() => openEdit(dept)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" id={`del-dept-${dept.id}`} onClick={() => handleDelete(dept.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Department' : 'Edit Department'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Department Name *</label>
                  <input placeholder="e.g. Engineering" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} />
                </div>
              </div>
              <div className="field-row">
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Description</label>
                  <input placeholder="Brief description of the department" value={form.description} onChange={e => setForm(p=>({...p, description: e.target.value}))} />
                </div>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" id="save-department-btn" onClick={handleSave}>
                {modal === 'add' ? 'Add Department' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ManageRoles
───────────────────────────────────────────────────── */
export function ManageRoles({ departments, roles, setRoles }) {
  const [search, setSearch]     = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [modal, setModal]       = useState(null)
  const [toast, setToast]       = useState(null)
  const EMPTY_ROLE = { title:'', department: departments[0]?.name || '', description:'', status:'active' }
  const [form, setForm]         = useState(EMPTY_ROLE)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const openAdd  = ()    => { setForm(EMPTY_ROLE); setModal('add') }
  const openEdit = (role)  => { setForm({ ...role }); setModal(role) }
  const closeModal = ()  => setModal(null)

  const handleSave = () => {
    if (!form.title.trim()) return
    if (modal === 'add') {
      const newId = `ROLE-${String(roles.length + 1).padStart(3, '0')}`
      setRoles(prev => [...prev, { ...form, id: newId }])
      showToast('Role added successfully')
    } else {
      setRoles(prev => prev.map(r => r.id === modal.id ? { ...r, ...form } : r))
      showToast('Role updated')
    }
    closeModal()
  }

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to remove this role?')) return
    setRoles(prev => prev.filter(r => r.id !== id))
    showToast('Role removed', 'danger')
  }

  const filtered = roles.filter(r => {
    const matchDept = deptFilter === 'all' || r.department === deptFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.title.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    return matchDept && matchSearch
  })

  return (
    <div className="admin-content">
      <div className="controls-bar">
        <div className="admin-search-box">
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search roles…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="admin-filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} id="role-dept-filter">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <button className="btn-primary" id="add-role-btn" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Role
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Role Title</th><th>Department</th><th>Description</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No roles found</td></tr>
            ) : filtered.map((role, i) => (
              <tr key={role.id} style={{ animationDelay: `${i * 0.04}s` }}>
                <td><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{role.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">
                      {role.title.slice(0,2).toUpperCase()}
                    </div>
                    <div className="cell-name">{role.title}</div>
                  </div>
                </td>
                <td>{role.department}</td>
                <td style={{ color:'var(--text-secondary)' }}>{role.description}</td>
                <td>
                  <span className={`badge badge-${role.status}`}>{role.status === 'active' ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" id={`edit-role-${role.id}`} onClick={() => openEdit(role)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" id={`del-role-${role.id}`} onClick={() => handleDelete(role.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Role' : 'Edit Role'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Role Title *</label>
                  <input placeholder="e.g. Senior Engineer" value={form.title} onChange={e => setForm(p=>({...p, title: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Department</label>
                  <select value={form.department} onChange={e => setForm(p=>({...p, department: e.target.value}))}>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Description</label>
                  <input placeholder="Brief description of the role" value={form.description} onChange={e => setForm(p=>({...p, description: e.target.value}))} />
                </div>
              </div>
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(p=>({...p, status: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn-primary" id="save-role-btn" onClick={handleSave}>
                {modal === 'add' ? 'Add Role' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success'
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   AccountSettings
───────────────────────────────────────────────────── */
export function AccountSettings({ currentUser, setCurrentUser, setManagers, onClose }) {
  const [form, setForm] = useState({ username: currentUser.username, password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const handleSave = () => {
    if (!form.username.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setError('All fields are required')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setError('')
    setManagers(prev => prev.map(m => m.id === currentUser.id ? { ...m, username: form.username, password: form.password } : m))
    setCurrentUser(prev => ({ ...prev, username: form.username, password: form.password }))
    setToast('Account settings updated')
    setTimeout(() => {
      setToast(null)
      onClose()
    }, 1500)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Update Credentials</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Username</label>
              <input value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} />
            </div>
          </div>
          <div className="field-row" style={{ marginTop: '16px' }}>
            <div className="field" style={{ flex: 1 }}>
              <label>New Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
            </div>
          </div>
          <div className="field-row" style={{ marginTop: '16px' }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({...p, confirmPassword: e.target.value}))} />
            </div>
          </div>
          {error && <div style={{ color: '#ff5252', fontSize: '13px', marginTop: '12px' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
      {toast && (
        <div className={`admin-toast admin-toast-success show`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          {toast}
        </div>
      )}
    </div>
  )
}