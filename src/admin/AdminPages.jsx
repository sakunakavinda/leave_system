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
  { id: 'EMP-001', name: 'John Doe',       post: 'Senior Engineer',  department: 'Engineering', branch: 'Colombo', status: 'active'   },
  { id: 'EMP-002', name: 'Jane Smith',     post: 'Accountant',       department: 'Finance',     branch: 'Kandy',   status: 'active'   },
  { id: 'EMP-003', name: 'Alex Johnson',   post: 'HR Manager',       department: 'HR',          branch: 'Galle',   status: 'active'   },
  { id: 'EMP-004', name: 'Sarah Williams', post: 'Operations Lead',  department: 'Operations',  branch: 'Negombo', status: 'active'   },
  { id: 'EMP-005', name: 'Michael Brown',  post: 'Junior Developer', department: 'Engineering', branch: 'Jaffna',  status: 'inactive' },
]

export const INITIAL_BRANCHES = [
  { id: 'BR-001', name: 'Colombo',  location: 'Western Province',   manager: 'John Doe',       employees: 42, status: 'active'   },
  { id: 'BR-002', name: 'Kandy',    location: 'Central Province',   manager: 'Jane Smith',     employees: 18, status: 'active'   },
  { id: 'BR-003', name: 'Galle',    location: 'Southern Province',  manager: 'Alex Johnson',   employees: 14, status: 'active'   },
  { id: 'BR-004', name: 'Jaffna',   location: 'Northern Province',  manager: 'Michael Brown',  employees: 10, status: 'inactive' },
  { id: 'BR-005', name: 'Negombo',  location: 'Western Province',   manager: 'Sarah Williams', employees: 21, status: 'active'   },
]

export const INITIAL_MANAGERS = [
  { id: 'MGR-001', username: 'johndoe',   branch: 'Colombo', status: 'active', role: 'manager'   },
  { id: 'MGR-002', username: 'janesmith', branch: 'Kandy',   status: 'active', role: 'super manager' },
  { id: 'MGR-003', username: 'alexj',     branch: 'Galle',   status: 'active', role: 'manager'   },
  { id: 'MGR-004', username: 'sarahw',    branch: 'Negombo', status: 'active', role: 'super manager' },
  { id: 'MGR-005', username: 'michaelb',  branch: 'Jaffna',  status: 'inactive', role: 'manager' },
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
              <th>Leave Dates</th>
              <th>Returning</th>
              <th>Substitute</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No applications found</td></tr>
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

/* ─────────────────────────────────────────────────────
   ManageEmployees
───────────────────────────────────────────────────── */
export function ManageEmployees({ branches, employees, setEmployees }) {
  const [search, setSearch]             = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [modal, setModal]               = useState(null) // null | 'add' | employee object
  const [toast, setToast]               = useState(null)
  const EMPTY_EMP = { name:'', post:'', department:'', branch: branches[0]?.name || '', status:'active' }
  const [form, setForm]                 = useState(EMPTY_EMP)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const openAdd  = ()    => { setForm(EMPTY_EMP); setModal('add') }
  const openEdit = (emp) => { setForm({ ...emp }); setModal(emp) }
  const closeModal = ()  => setModal(null)

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal === 'add') {
      const newId = `EMP-${String(employees.length + 1).padStart(3, '0')}`
      setEmployees(prev => [...prev, { ...form, id: newId }])
      showToast('Employee added successfully')
    } else {
      setEmployees(prev => prev.map(e => e.id === modal.id ? { ...e, ...form } : e))
      showToast('Employee updated')
    }
    closeModal()
  }

  const handleDelete = (id) => {
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
            <tr><th>ID</th><th>Name</th><th>Post</th><th>Branch</th><th>Status</th><th>Actions</th></tr>
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
                  <input placeholder="Post" value={form.post} onChange={e => setForm(p=>({...p, post: e.target.value}))} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Department</label>
                  <input placeholder="Department" value={form.department} onChange={e => setForm(p=>({...p, department: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Branch</label>
                  <select value={form.branch} onChange={e => setForm(p=>({...p, branch: e.target.value}))}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
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
              <button className="btn-primary" id="save-employee-btn" onClick={handleSave}>
                {modal === 'add' ? 'Add Employee' : 'Save Changes'}
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
export function ManageBranches({ branches, setBranches }) {
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [toast, setToast]     = useState(null)
  const EMPTY_BR = { name:'', location:'', manager:'', employees: 0, status:'active' }
  const [form, setForm]       = useState(EMPTY_BR)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const openAdd  = ()    => { setForm(EMPTY_BR); setModal('add') }
  const openEdit = (br)  => { setForm({ ...br }); setModal(br) }
  const closeModal = ()  => setModal(null)

  const handleSave = () => {
    if (!form.name.trim()) return
    if (modal === 'add') {
      const newId = `BR-${String(branches.length + 1).padStart(3, '0')}`
      setBranches(prev => [...prev, { ...form, id: newId, employees: Number(form.employees) || 0 }])
      showToast('Branch added successfully')
    } else {
      setBranches(prev => prev.map(b => b.id === modal.id ? { ...b, ...form, employees: Number(form.employees) || 0 } : b))
      showToast('Branch updated')
    }
    closeModal()
  }

  const handleDelete = (id) => {
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
                    <div className="cell-avatar" style={{ borderRadius:'10px', background:'linear-gradient(135deg,#6c5ce7,#a29bfe)' }}>
                      {br.name.slice(0,2).toUpperCase()}
                    </div>
                    <div className="cell-name">{br.name}</div>
                  </div>
                </td>
                <td style={{ color:'var(--text-secondary)' }}>{br.location}</td>
                <td>{br.manager}</td>
                <td>
                  <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{br.employees}</span>
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
              <div className="field-row">
                <div className="field">
                  <label>Branch Manager</label>
                  <input placeholder="Manager name" value={form.manager} onChange={e => setForm(p=>({...p, manager: e.target.value}))} />
                </div>
                <div className="field">
                  <label>No. of Employees</label>
                  <input type="number" min={0} placeholder="0" value={form.employees} onChange={e => setForm(p=>({...p, employees: e.target.value}))} />
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
            <tr><th>ID</th><th>Username</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr>
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

