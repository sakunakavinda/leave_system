import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin.css'
import { AdminDashboard, ManageEmployees, ManageBranches, ManageManagers, INITIAL_APPLICATIONS, INITIAL_BRANCHES, INITIAL_MANAGERS, INITIAL_EMPLOYEES } from './AdminPages.jsx'

const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    desc: 'Leave Applications',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'employees',
    label: 'Manage Employees',
    desc: 'Staff directory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'managers',
    label: 'Manage Managers',
    desc: 'Branch managers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
      </svg>
    ),
  },
  {
    id: 'branches',
    label: 'Manage Branches',
    desc: 'Branch directory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
]

const PAGE_META = {
  dashboard: { title: 'Leave Applications', subtitle: 'Review and manage all leave requests' },
  employees:  { title: 'Manage Employees',  subtitle: 'Add, edit or remove staff members'   },
  managers:   { title: 'Manage Managers',   subtitle: 'View, add, edit or remove branch managers' },
  branches:   { title: 'Manage Branches',   subtitle: 'Configure and track office branches'  },
}

export default function AdminApp() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser]   = useState(null)
  const [loginForm, setLoginForm]       = useState({ username: '', password: '' })
  const [loginError, setLoginError]     = useState('')

  const [activePage, setActivePage]     = useState('dashboard')
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS)
  const [branches, setBranches]         = useState(INITIAL_BRANCHES)
  const [managers, setManagers]         = useState(INITIAL_MANAGERS)
  const [employees, setEmployees]       = useState(INITIAL_EMPLOYEES)

  const handleLogin = (e) => {
    e.preventDefault()
    const user = managers.find(m => m.username === loginForm.username)
    if (user && loginForm.password === 'password') {
      setCurrentUser(user)
      setLoginError('')
      setActivePage('dashboard')
    } else {
      setLoginError('Invalid username or password')
    }
  }

  if (!currentUser) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="sidebar-brand-icon" style={{ margin: '0 auto 16px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-primary)' }}>Admin Login</h2>
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="field">
              <label>Username</label>
              <input 
                autoFocus
                placeholder="e.g. johndoe" 
                value={loginForm.username} 
                onChange={e => setLoginForm(p => ({...p, username: e.target.value}))} 
              />
            </div>
            <div className="field" style={{ marginTop: '16px' }}>
              <label>Password</label>
              <input 
                type="password" 
                placeholder="password" 
                value={loginForm.password} 
                onChange={e => setLoginForm(p => ({...p, password: e.target.value}))} 
              />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}>
              Sign In
            </button>
          </form>
          <div className="login-hint">Hint: try username <b>johndoe</b> (Manager) or <b>janesmith</b> (Super Manager) with password <b>password</b></div>
        </div>
      </div>
    )
  }

  const isSuper = currentUser.role === 'super manager'
  const allowedNav = NAV.filter(item => isSuper || ['dashboard', 'employees'].includes(item.id))

  const allowedApps = isSuper ? applications : applications.filter(a => a.branch === currentUser.branch)
  const allowedEmps = isSuper ? employees : employees.filter(e => e.branch === currentUser.branch)
  const allowedBranches = isSuper ? branches : branches.filter(b => b.name === currentUser.branch)

  const pendingCount = allowedApps.filter(a => a.status === 'pending').length

  const handleUpdateStatus = (id, status) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const meta = PAGE_META[activePage] || PAGE_META['dashboard']


  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2>Leave System</h2>
          <p>Admin Panel</p>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Main Menu</div>
          {allowedNav.map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              {item.icon}
              {item.label}
              {item.id === 'dashboard' && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="exit-btn" id="logout-btn" onClick={() => setCurrentUser(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
          <button className="exit-btn" onClick={() => navigate('/')} style={{ marginTop: '8px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Go to Portal
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          <div className="topbar-left">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="topbar-right">
            <div className="admin-avatar" title={`${currentUser.username} (${currentUser.role})`}>
              {currentUser.username.slice(0,2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page Content */}
        {activePage === 'dashboard' && (
          <AdminDashboard
            applications={allowedApps}
            onUpdateStatus={handleUpdateStatus}
            branches={allowedBranches}
          />
        )}
        {activePage === 'employees' && (
          <ManageEmployees branches={allowedBranches} employees={allowedEmps} setEmployees={setEmployees} />
        )}
        {activePage === 'managers' && (
          <ManageManagers branches={allowedBranches} managers={managers} setManagers={setManagers} />
        )}
        {activePage === 'branches' && (
          <ManageBranches branches={allowedBranches} setBranches={setBranches} />
        )}
      </main>
    </div>
  )
}
