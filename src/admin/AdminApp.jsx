import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminDashboard, ManageEmployees, ManageBranches, ManageBranchHolidays, ManageManagers, ManageUsers, UserPermissionsMatrix, ManageDepartments, ManageRoles, ManageLeaveTypes, ManageLeaveProfiles, AccountSettings, SystemSettings, LeaveOverview } from './AdminPages.jsx'
import { ManageShiftMasters, ManageShiftRosters } from './ShiftRosterManager.jsx'
import { ContingencyShieldManager } from './ContingencyShieldManager.jsx'
import { PayrollExportManager } from './PayrollExportManager.jsx'
import { ManageOperatingSchedules } from './OperatingSchedulesManager.jsx'
import { api, tokenStorage } from '../api.js'
import { applyTheme } from './theme.js'

const NAV = [
  {
    id: 'dashboard',
    group: 'Operation',
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
    group: 'Operation',
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
    id: 'overview',
    group: 'Operation',
    label: 'Leave Overview',
    desc: 'Yearly heatmap',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    id: 'roster',
    group: 'Operation',
    label: 'Shift Rostering',
    desc: 'Workforce matrix',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="8" cy="14" r="1"/>
        <circle cx="12" cy="14" r="1"/>
        <circle cx="16" cy="14" r="1"/>
        <circle cx="8" cy="18" r="1"/>
        <circle cx="12" cy="18" r="1"/>
        <circle cx="16" cy="18" r="1"/>
      </svg>
    ),
  },
  {
    id: 'contingencies',
    group: 'Operation',
    label: 'Contingency Shield',
    desc: 'Disruption & emergency',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: 'payroll',
    group: 'Operation',
    label: 'Payroll & LOP',
    desc: 'Attendance & deductions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    id: 'user_configuration',
    group: 'Management',
    label: 'User Configuration',
    desc: 'Users & role permissions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <circle cx="19" cy="11" r="2"/>
        <path d="M19 17v4"/>
        <path d="M17 19h4"/>
      </svg>
    ),
    children: [
      {
        id: 'manage_users',
        label: 'Manage Users',
        desc: 'User accounts & overrides',
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
        id: 'user_permissions',
        label: 'User Permissions',
        desc: 'Role default permission matrix',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        ),
      }
    ]
  },
  {
    id: 'branch_configurations',
    group: 'Management',
    label: 'Branch Configurations',
    desc: 'Branches, holidays & schedules',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    children: [
      {
        id: 'branches',
        label: 'Manage Branches',
        desc: 'Branch directory & facilities',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        ),
      },
      {
        id: 'holidays',
        label: 'Branch Holidays',
        desc: 'Public & mercantile days',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        ),
      },
      {
        id: 'operating_schedules',
        label: 'Operating Schedules',
        desc: 'Workweeks & operating models',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        ),
      },
    ],
  },
  {
    id: 'shifts',
    group: 'Management',
    label: 'Shift Masters',
    desc: 'Shift definitions & hours',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    id: 'departments',
    group: 'Management',
    label: 'Manage Departments',
    desc: 'Department directory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    id: 'roles',
    group: 'Management',
    label: 'Manage Roles',
    desc: 'Role definitions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    id: 'leave_configuration',
    group: 'Management',
    label: 'Leave Configuration',
    desc: 'Leave types & profiles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"></line>
        <line x1="4" y1="10" x2="4" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12" y2="3"></line>
        <line x1="20" y1="21" x2="20" y2="16"></line>
        <line x1="20" y1="12" x2="20" y2="3"></line>
        <line x1="1" y1="14" x2="7" y2="14"></line>
        <line x1="9" y1="8" x2="15" y2="8"></line>
        <line x1="17" y1="16" x2="23" y2="16"></line>
      </svg>
    ),
    children: [
      {
        id: 'leave_types',
        label: 'Manage Leave Types',
        desc: 'Custom leave type definitions',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        ),
      },
      {
        id: 'leave_profiles',
        label: 'Manage Leave Profiles',
        desc: 'Leave profile policies & settings',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'settings',
    group: 'System',
    label: 'Settings',
    desc: 'System settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
  },
]

const PAGE_META = {
  dashboard: { title: 'Leave Applications', subtitle: 'Review and manage all leave requests' },
  employees:  { title: 'Manage Employees',  subtitle: 'Add, edit or remove staff members'   },
  roster:     { title: 'Shift Rostering Matrix', subtitle: 'Monthly workforce shift schedule & RDO planner' },
  contingencies: { title: 'Operational Contingency Shield', subtitle: 'Declare emergencies, force majeure shields, and retroactive balance refunds' },
  payroll:    { title: 'Payroll & Loss of Pay (LOP) Exporter', subtitle: 'Monthly attendance, leave deductions, and LOP export for domestic payroll' },
  user_configuration: { title: 'User Configuration', subtitle: 'Manage user accounts, roles, and default permissions matrix' },
  manage_users:   { title: 'Manage Users',   subtitle: 'View, add, edit or remove system users & custom overrides' },
  user_permissions: { title: 'User Permissions Matrix', subtitle: 'Configure default operational permissions per user type' },
  managers:   { title: 'Manage Users',   subtitle: 'View, add, edit or remove branch managers' },
  branch_configurations: { title: 'Branch Configurations', subtitle: 'Manage office branches, regional holidays, and operating schedules' },
  branches:   { title: 'Manage Branches',   subtitle: 'Configure and track office branches'  },
  operating_schedules: { title: 'Operating Schedules', subtitle: 'Define custom operating models, workweeks, and daily hours' },
  holidays:   { title: 'Branch Public & Mercantile Holidays', subtitle: 'Configure regional and statutory holidays per branch' },
  shifts:     { title: 'Shift Masters',     subtitle: 'Define operational shifts, night shifts, and duration hours' },
  departments: { title: 'Manage Departments', subtitle: 'Configure and organize departments'  },
  roles:      { title: 'Manage Roles',      subtitle: 'Define and manage role designations'   },
  leave_configuration: { title: 'Leave Configuration', subtitle: 'Manage leave types and profiles' },
  leave_types: { title: 'Manage Leave Types', subtitle: 'Create and configure custom leave types' },
  leave_profiles: { title: 'Manage Leave Profiles', subtitle: 'Configure employee leave profiles' },
  settings:   { title: 'System Settings',   subtitle: 'Configure global system settings'      },
}

export default function AdminApp() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser]   = useState(() => tokenStorage.getUser())
  const [loginForm, setLoginForm]       = useState({ username: '', password: '' })
  const [loginError, setLoginError]     = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const loginLogoRef = useRef(null)
  const [logoFlight, setLogoFlight]     = useState(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [activePage, setActivePage]     = useState('dashboard')
  const [expandedMenus, setExpandedMenus] = useState({
    leave_configuration: false,
    branch_configurations: false,
    user_configuration: false
  })

  useEffect(() => {
    // If activePage belongs to a collapsible menu, keep that parent menu expanded
    for (const item of NAV) {
      if (item.children?.some(c => c.id === activePage)) {
        setExpandedMenus(prev => ({ ...prev, [item.id]: true }))
      }
    }
  }, [activePage])

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }
  const [applications, setApplications] = useState([])
  const [branches, setBranches]         = useState([])
  const [managers, setManagers]         = useState([])
  const [employees, setEmployees]       = useState([])
  const [departments, setDepartments]   = useState([])
  const [roles, setRoles]               = useState([])
  const [rules, setRules]               = useState([])
  const [leaveTypes, setLeaveTypes]     = useState([])
  const [leaveProfiles, setLeaveProfiles] = useState([])
  const [settings, setSettings]         = useState({})
  const [loading, setLoading]           = useState(true)

  // Verify session on mount
  useEffect(() => {
    if (tokenStorage.getToken()) {
      api.getCurrentUser()
        .then(res => {
          if (res?.user) {
            setCurrentUser(res.user);
            tokenStorage.setUser(res.user);
          }
        })
        .catch(() => {
          tokenStorage.clear();
          setCurrentUser(null);
        });
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [apps, brs, mgrs, emps, depts, rls, rls_rules, l_types, l_profiles] = await Promise.all([
          api.getApplications(),
          api.getBranches(),
          api.getManagers(),
          api.getEmployees({ includeSecretCode: true }),
          api.getDepartments(),
          api.getRoles(),
          api.getRules(),
          api.getLeaveTypes().catch(() => []),
          api.getLeaveProfiles().catch(() => [])
        ]);
        const stgs = await api.getSettings();
        setApplications(apps);
        setBranches(brs);
        setManagers(mgrs);
        setEmployees(emps);
        setDepartments(depts);
        setRoles(rls);
        setRules(rls_rules);
        setLeaveTypes(l_types);
        setLeaveProfiles(l_profiles);
        setSettings(stgs);
        if (stgs.theme_color) {
          applyTheme(stgs.theme_color, 'primary');
        } else {
          applyTheme('orange', 'primary');
        }
        if (stgs.theme_color_secondary) {
          applyTheme(stgs.theme_color_secondary, 'secondary');
        } else {
          applyTheme('orange', 'secondary');
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to load data", err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading System Data...</div>
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const user = await api.loginManager(loginForm.username, loginForm.password);
      
      if (loginLogoRef.current) {
        const rect = loginLogoRef.current.getBoundingClientRect();
        setLogoFlight({
          startX: rect.left,
          startY: rect.top,
        });
      }

      setLoginError('')
      
      setTimeout(() => {
        setCurrentUser(user)
        setActivePage('dashboard')
        setTimeout(() => setLogoFlight(null), 1200);
      }, 50);

    } catch (err) {
      setLoginError(err.message || 'Invalid username or password')
    }
  }

  if (!currentUser) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="admin-logo-wrap" ref={loginLogoRef} style={{ display: 'flex', margin: '0 auto 16px', width: 'fit-content', opacity: logoFlight ? 0 : 1 }}>
            <div className="sidebar-brand-icon" style={{ background: settings?.company_logo ? 'transparent' : '' }}>
              {settings?.company_logo ? (
                <img src={settings.company_logo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              )}
            </div>
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-primary)' }}>Staff Leave Desk</h2>
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="field">
              <label>Username</label>
              <input 
                autoFocus
                placeholder="Enter username" 
                value={loginForm.username} 
                onChange={e => setLoginForm(p => ({...p, username: e.target.value}))} 
              />
            </div>
            <div className="field" style={{ marginTop: '16px' }}>
              <label>Password</label>
              <input 
                type="password" 
                placeholder="Enter password" 
                value={loginForm.password} 
                onChange={e => setLoginForm(p => ({...p, password: e.target.value}))} 
              />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}>
              Sign In
            </button>
          </form>
          <div className="login-footer-credits" style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Designed and developed by <strong style={{ color: 'var(--accent-primary)' }}>dubLive technologies</strong>
          </div>
        </div>
      </div>
    )
  }

  const isSuper = ['super manager', 'super_admin', 'admin'].includes(currentUser?.role);
  const isHrOfficer = ['hr_officer', 'hr'].includes(currentUser?.role);
  const isBranchManager = ['branch_manager', 'manager'].includes(currentUser?.role);

  const DEFAULT_ROLE_PERMS = {
    branch_manager: {
      'leaves.view': true,
      'leaves.approve_reject': true,
      'leaves.mark_unpaid': true,
      'employees.view': true,
      'rosters.view': true,
      'rosters.edit': true,
      'shifts.view': true,
      'payroll.view': true,
      'holidays.view': true,
      'overview.view': true,
      'contingencies.view': true
    },
    hr_officer: {
      'leaves.view': true,
      'employees.view': true,
      'employees.create_edit': true,
      'employees.adjust_balance': true,
      'employees.delete': true,
      'rosters.view': true,
      'payroll.view': true,
      'payroll.export': true,
      'holidays.view': true,
      'holidays.manage': true,
      'overview.view': true,
      'contingencies.view': true
    }
  };

  const hasPermission = (permKey) => {
    if (isSuper) return true;
    let perms = currentUser?.permissions;
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch(e) {}
    }
    if (!perms || typeof perms !== 'object' || Object.keys(perms).length === 0) {
      const roleKey = isHrOfficer ? 'hr_officer' : 'branch_manager';
      perms = DEFAULT_ROLE_PERMS[roleKey] || DEFAULT_ROLE_PERMS.branch_manager;
    }
    return !!(perms['*'] || perms[permKey]);
  };

  const allowedNav = NAV.map(item => {
    if (item.children) {
      const allowedChildren = item.children.filter(child => {
        if (isSuper) return true;
        if (child.id === 'holidays') return hasPermission('holidays.view');
        return false;
      });
      if (allowedChildren.length === 0) return null;
      return { ...item, children: allowedChildren };
    }

    if (isSuper) return item;

    if (item.id === 'dashboard') return hasPermission('leaves.view') ? item : null;
    if (item.id === 'employees') return hasPermission('employees.view') ? item : null;
    if (item.id === 'overview') return hasPermission('overview.view') ? item : null;
    if (item.id === 'roster') return hasPermission('rosters.view') ? item : null;
    if (item.id === 'contingencies') return hasPermission('contingencies.view') ? item : null;
    if (item.id === 'payroll') return hasPermission('payroll.view') ? item : null;
    if (item.id === 'shifts') return hasPermission('shifts.view') ? item : null;

    return null;
  }).filter(Boolean);

  const allowedApps = isSuper ? applications : applications.filter(a => {
    const emp = employees.find(e => e.id === a.employee_id)
    return emp && emp.branch_id === currentUser.branch_id
  })
  const allowedEmps = isSuper ? employees : employees.filter(e => e.branch_id === currentUser.branch_id)
  const allowedBranches = isSuper ? branches : branches.filter(b => b.id === currentUser.branch_id)

  const pendingCount = allowedApps.filter(a => a.status === 'pending').length

  const handleUpdateStatus = async (id, status, extra = {}) => {
    try {
      const updated = await api.updateApplicationStatus(id, status, extra);
      setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      return updated;
    } catch (err) {
      alert("Failed to update status: " + err.message);
      throw err;
    }
  }

  const refreshApplications = async () => {
    try {
      const apps = await api.getApplications();
      setApplications(apps);
    } catch (err) {
      console.error("Failed to refresh applications", err);
    }
  }

  const meta = PAGE_META[activePage] || PAGE_META['dashboard']


  return (
    <div className={`admin-shell ${isLoggingOut ? 'fade-out-anim' : ''}`}>
      {isMobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>}
      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="admin-logo-wrap" style={{ opacity: logoFlight ? 0 : 1 }}>
            <div className="sidebar-brand-icon" style={{ background: settings?.company_logo ? 'transparent' : '' }}>
              {settings?.company_logo ? (
                <img src={settings.company_logo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              )}
            </div>
          </div>
          <h2>Staff Leave Desk</h2>
          <p>Admin Panel</p>
        </div>

        {/* Mobile Account Profile */}
        <div className="show-mobile" style={{ padding: '20px 22px', borderBottom: '1px solid var(--bg-card-border)', alignItems: 'center', gap: '12px' }}>
          <div 
            className="admin-avatar" 
            onClick={() => { setShowProfileModal(true); setIsMobileMenuOpen(false); }}
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            {currentUser.username.slice(0,2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.username}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{currentUser.role}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {['Operation', 'Management', 'System'].map((group, gIdx) => {
            const groupItems = allowedNav.filter(item => item.group === group);
            if (groupItems.length === 0) return null;
            return (
              <div key={group} style={{ marginBottom: '16px' }}>
                <div className="sidebar-nav-label">{group}</div>
                {groupItems.map(item => {
                  if (item.children && item.children.length > 0) {
                    const isChildActive = item.children.some(c => c.id === activePage);
                    const isExpanded = expandedMenus[item.id] ?? isChildActive;
                    return (
                      <div key={item.id} className="nav-group-wrapper" style={{ marginBottom: '2px' }}>
                        <button
                          id={`nav-${item.id}`}
                          className={`nav-item ${isChildActive ? 'parent-active' : ''}`}
                          onClick={() => {
                            toggleMenu(item.id);
                            if (!isExpanded && !isChildActive) {
                              setActivePage(item.children[0].id);
                              setIsMobileMenuOpen(false);
                            }
                          }}
                        >
                          {item.icon}
                          <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                          <svg
                            className={`nav-chevron ${isExpanded ? 'open' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '14px', height: '14px', flexShrink: 0 }}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="nav-sub-menu">
                            {item.children.map(child => (
                              <button
                                key={child.id}
                                id={`nav-${child.id}`}
                                className={`nav-item nav-sub-item ${activePage === child.id ? 'active' : ''}`}
                                onClick={() => {
                                  setActivePage(child.id);
                                  setIsMobileMenuOpen(false);
                                }}
                              >
                                {child.icon}
                                <span>{child.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                      onClick={() => { setActivePage(item.id); setIsMobileMenuOpen(false); }}
                    >
                      {item.icon}
                      {item.label}
                      {item.id === 'applications' && pendingCount > 0 && (
                        <span className="nav-badge">{pendingCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="exit-btn" id="logout-btn" onClick={() => { 
            if(window.confirm('Are you sure you want to logout?')) { 
              setIsLoggingOut(true);
              setTimeout(() => {
                api.logout();
                setCurrentUser(null); 
                setLoginForm({ username: '', password: '' });
                setIsLoggingOut(false);
              }, 450);
            } 
          }}>
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
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* If branch-scoped, show assigned branch badge */}
            {!isSuper && currentUser.branch_id && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)'
              }}>
                <span>📍</span>
                <span>{branches.find(b => b.id === currentUser.branch_id)?.name || 'Assigned Branch'}</span>
              </div>
            )}

            <div className="hide-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div 
                className="admin-avatar" 
                title={`${currentUser.username} (${isSuper ? 'Admin (Owner)' : (isHrOfficer ? 'HR Officer' : 'Branch Manager')})`}
                onClick={() => setShowProfileModal(true)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.05)' } }}
              >
                {currentUser.username.slice(0,2).toUpperCase()}
              </div>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 700, 
                letterSpacing: '0.03em', 
                textTransform: 'uppercase',
                padding: '1px 6px',
                borderRadius: '6px',
                background: isSuper ? 'rgba(249, 115, 22, 0.15)' : (isHrOfficer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'),
                color: isSuper ? '#f97316' : (isHrOfficer ? '#10b981' : '#3b82f6')
              }}>
                {isSuper ? 'Admin' : (isHrOfficer ? 'HR Officer' : 'Branch Mgr')}
              </span>
            </div>
            <div className="show-mobile" style={{ height: '36px' }}>
              <div className="admin-logo-wrap" style={{ padding: '2px', borderRadius: '8px', marginBottom: 0, height: '100%' }}>
                <div className="sidebar-brand-icon" style={{ width: '32px', height: '32px', background: settings?.company_logo ? 'transparent' : '' }}>
                  {settings?.company_logo ? (
                    <img src={settings.company_logo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        {activePage === 'dashboard' && (
          <AdminDashboard
            applications={allowedApps}
            onUpdateStatus={handleUpdateStatus}
            branches={allowedBranches}
            employees={employees}
            roles={roles}
            departments={departments}
            leaveRules={rules}
            setLeaveRules={setRules}
            onRefreshApplications={refreshApplications}
            leaveTypes={leaveTypes}
            currentUser={currentUser}
          />
        )}
        {activePage === 'overview' && (
          <LeaveOverview
            applications={allowedApps}
            employees={allowedEmps}
            branches={allowedBranches}
            departments={departments}
            roles={roles}
            leaveTypes={leaveTypes}
          />
        )}
        {activePage === 'roster' && (
          <ManageShiftRosters 
            branches={allowedBranches} 
            employees={allowedEmps} 
            canEdit={hasPermission('rosters.edit')}
            currentUser={currentUser}
          />
        )}
        {activePage === 'contingencies' && (
          <ContingencyShieldManager branches={allowedBranches} />
        )}
        {activePage === 'payroll' && (
          <PayrollExportManager 
            branches={allowedBranches} 
            canExport={hasPermission('payroll.export')}
            currentUser={currentUser}
            leaveTypes={leaveTypes}
          />
        )}
        {activePage === 'employees' && (
          <ManageEmployees 
            branches={allowedBranches} 
            employees={allowedEmps} 
            setEmployees={setEmployees} 
            departments={departments} 
            roles={roles} 
            isSuper={isSuper} 
            leaveRules={rules}
            setLeaveRules={setRules}
            applications={allowedApps}
            leaveTypes={leaveTypes}
            currentUser={currentUser}
            canCreateEdit={hasPermission('employees.create_edit')}
            canAdjustBalance={hasPermission('employees.adjust_balance')}
            canDelete={hasPermission('employees.delete')}
            onNavigatePage={setActivePage}
          />
        )}
        {(activePage === 'manage_users' || activePage === 'managers' || activePage === 'user_configuration') && (
          <ManageUsers branches={branches} managers={managers} setManagers={setManagers} onNavigatePage={setActivePage} />
        )}
        {activePage === 'user_permissions' && (
          <UserPermissionsMatrix onNavigatePage={setActivePage} />
        )}
        {(activePage === 'branches' || activePage === 'branch_configurations') && (
          <ManageBranches branches={allowedBranches} setBranches={setBranches} employees={employees} managers={managers} setManagers={setManagers} onNavigatePage={setActivePage} />
        )}
        {activePage === 'operating_schedules' && (
          <ManageOperatingSchedules />
        )}
        {activePage === 'holidays' && (
          <ManageBranchHolidays branches={allowedBranches} />
        )}
        {activePage === 'shifts' && (
          <ManageShiftMasters branches={allowedBranches} />
        )}
        {activePage === 'departments' && (
          <ManageDepartments departments={departments} setDepartments={setDepartments} />
        )}
        {activePage === 'roles' && (
          <ManageRoles departments={departments} roles={roles} setRoles={setRoles} onNavigatePage={setActivePage} />
        )}
        {(activePage === 'leave_types' || activePage === 'leave_configuration') && (
          <ManageLeaveTypes leaveTypes={leaveTypes} setLeaveTypes={setLeaveTypes} />
        )}
        {activePage === 'leave_profiles' && (
          <ManageLeaveProfiles 
            leaveProfiles={leaveProfiles}
            setLeaveProfiles={setLeaveProfiles}
            leaveTypes={leaveTypes}
          />
        )}
        {activePage === 'settings' && (
          <SystemSettings />
        )}
      </main>

      {showProfileModal && (
        <AccountSettings 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          setManagers={setManagers} 
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {logoFlight && (
        <div 
          className="admin-logo-wrap flight-anim" 
          style={{ 
            position: 'fixed',
            zIndex: 9999,
            margin: 0,
            '--start-x': `${logoFlight.startX}px`,
            '--start-y': `${logoFlight.startY}px`,
          }}
        >
          <div className="sidebar-brand-icon" style={{ background: settings?.company_logo ? 'transparent' : '' }}>
            {settings?.company_logo ? (
              <img src={settings.company_logo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  )
}