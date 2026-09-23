import { useState, useMemo, useEffect } from 'react'
import { api } from '../api.js'
import { APP_THEMES, applyTheme } from './theme.js'
import { TeamCapacityMeter } from './TeamCapacityMeter.jsx'
import { ActiveContingencyAlertBanner } from './ContingencyShieldManager.jsx'
import './admin.css'

/* ── Shared mock data ─────────────────────────────── */
export const INITIAL_BRANCHES = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: 'Colombo',  location: 'Western Province',   status: 'active'   },
  { id: 'a1111111-1111-1111-1111-111111111112', name: 'Kandy',    location: 'Central Province',   status: 'active'   },
  { id: 'a1111111-1111-1111-1111-111111111113', name: 'Galle',    location: 'Southern Province',  status: 'active'   },
  { id: 'a1111111-1111-1111-1111-111111111114', name: 'Jaffna',   location: 'Northern Province',  status: 'inactive' },
  { id: 'a1111111-1111-1111-1111-111111111115', name: 'Negombo',  location: 'Western Province',   status: 'active'   },
]

export const INITIAL_MANAGERS = [
  { id: 'e5555555-5555-5555-5555-555555555551', username: 'johndoe',   password: 'password', branch_id: 'a1111111-1111-1111-1111-111111111111', status: 'active', role: 'manager'   },
  { id: 'e5555555-5555-5555-5555-555555555552', username: 'janesmith', password: 'password', branch_id: 'a1111111-1111-1111-1111-111111111112', status: 'active', role: 'super manager' },
  { id: 'e5555555-5555-5555-5555-555555555553', username: 'alexj',     password: 'password', branch_id: 'a1111111-1111-1111-1111-111111111113', status: 'active', role: 'manager'   },
  { id: 'e5555555-5555-5555-5555-555555555554', username: 'sarahw',    password: 'password', branch_id: 'a1111111-1111-1111-1111-111111111115', status: 'active', role: 'super manager' },
  { id: 'e5555555-5555-5555-5555-555555555555', username: 'michaelb',  password: 'password', branch_id: 'a1111111-1111-1111-1111-111111111114', status: 'inactive', role: 'manager' },
]

export const INITIAL_DEPARTMENTS = [
  { id: 'b2222222-2222-2222-2222-222222222221', name: 'Engineering',  description: 'Software and systems engineering', status: 'active' },
  { id: 'b2222222-2222-2222-2222-222222222222', name: 'Finance',      description: 'Financial management and accounting', status: 'active' },
  { id: 'b2222222-2222-2222-2222-222222222223', name: 'HR',           description: 'Human resources management', status: 'active' },
  { id: 'b2222222-2222-2222-2222-222222222224', name: 'Operations',   description: 'Business operations and logistics', status: 'active' },
  { id: 'b2222222-2222-2222-2222-222222222225', name: 'Marketing',    description: 'Marketing and communications', status: 'inactive' },
]

export const INITIAL_ROLES = [
  { id: 'c3333333-3333-3333-3333-333333333331', title: 'Senior Engineer',     department_id: 'b2222222-2222-2222-2222-222222222221', description: 'Leads engineering projects and mentors juniors', status: 'active' },
  { id: 'c3333333-3333-3333-3333-333333333332', title: 'Junior Developer',    department_id: 'b2222222-2222-2222-2222-222222222221', description: 'Entry-level development role', status: 'active' },
  { id: 'c3333333-3333-3333-3333-333333333333', title: 'Software Engineer',   department_id: 'b2222222-2222-2222-2222-222222222221', description: 'Mid-level software development', status: 'active' },
  { id: 'c3333333-3333-3333-3333-333333333334', title: 'Accountant',          department_id: 'b2222222-2222-2222-2222-222222222222', description: 'Handles financial records and reporting', status: 'active' },
  { id: 'c3333333-3333-3333-3333-333333333335', title: 'HR Manager',          department_id: 'b2222222-2222-2222-2222-222222222223', description: 'Manages HR operations and staff welfare', status: 'active' },
  { id: 'c3333333-3333-3333-3333-333333333336', title: 'Operations Lead',     department_id: 'b2222222-2222-2222-2222-222222222224', description: 'Leads operational activities and team coordination', status: 'active' },
  { id: 'c3333333-3333-3333-3333-333333333337', title: 'Marketing Specialist', department_id: 'b2222222-2222-2222-2222-222222222225', description: 'Handles marketing campaigns and brand strategy', status: 'inactive' },
]

export const INITIAL_EMPLOYEES = [
  { id: 'd4444444-4444-4444-4444-444444444441', name: 'John Doe',       secretCode: '12345678', role_id: 'c3333333-3333-3333-3333-333333333331', branch_id: 'a1111111-1111-1111-1111-111111111111', status: 'active'   },
  { id: 'd4444444-4444-4444-4444-444444444442', name: 'Jane Smith',     secretCode: '23456789', role_id: 'c3333333-3333-3333-3333-333333333334', branch_id: 'a1111111-1111-1111-1111-111111111112', status: 'active'   },
  { id: 'd4444444-4444-4444-4444-444444444443', name: 'Alex Johnson',   secretCode: '34567890', role_id: 'c3333333-3333-3333-3333-333333333335', branch_id: 'a1111111-1111-1111-1111-111111111113', status: 'active'   },
  { id: 'd4444444-4444-4444-4444-444444444444', name: 'Sarah Williams', secretCode: '45678901', role_id: 'c3333333-3333-3333-3333-333333333336', branch_id: 'a1111111-1111-1111-1111-111111111115', status: 'active'   },
  { id: 'd4444444-4444-4444-4444-444444444445', name: 'Michael Brown',  secretCode: '56789012', role_id: 'c3333333-3333-3333-3333-333333333332', branch_id: 'a1111111-1111-1111-1111-111111111114', status: 'inactive' },
]

export const INITIAL_APPLICATIONS = [
  { id: 'f6666666-6666-6666-6666-666666666661', employee_id: 'd4444444-4444-4444-4444-444444444441', leave_type: 'annual', appliedDate: '2026-06-10', leaveDates: ['2026-06-16','2026-06-17'], returningDate: '2026-06-18', substitute_employee_id: 'd4444444-4444-4444-4444-444444444443', substituteConfirmed: true, status: 'approved' },
  { id: 'f6666666-6666-6666-6666-666666666662', employee_id: 'd4444444-4444-4444-4444-444444444442', leave_type: 'sick', appliedDate: '2026-06-11', leaveDates: ['2026-06-20'],              returningDate: '2026-06-21', substitute_employee_id: 'd4444444-4444-4444-4444-444444444444', substituteConfirmed: false, status: 'pending'  },
  { id: 'f6666666-6666-6666-6666-666666666663', employee_id: 'd4444444-4444-4444-4444-444444444443', leave_type: 'casual', appliedDate: '2026-06-09', leaveDates: ['2026-06-14','2026-06-15'], returningDate: '2026-06-17', substitute_employee_id: 'd4444444-4444-4444-4444-444444444445', substituteConfirmed: true, status: 'rejected' },
]


function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

/* ─────────────────────────────────────────────────────
   AdminDashboard
───────────────────────────────────────────────────── */
export function AdminDashboard({ applications, onUpdateStatus, branches, employees, roles, departments, leaveRules, onRefreshApplications, leaveTypes = [] }) {
  const [timeFilter, setTimeFilter]   = useState('this_month')
  const [reportEmp, setReportEmp]     = useState(null)
  const [filter, setFilter]           = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch]           = useState('')
  const [toast, setToast]             = useState(null)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  })
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true)
  const [selectedDayLeaves, setSelectedDayLeaves] = useState(null)

  // Special Leave Application state for Manager Override
  const getTodayStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [specialError, setSpecialError] = useState('');
  const [isSubmittingSpecial, setIsSubmittingSpecial] = useState(false);
  const [specialBranchFilter, setSpecialBranchFilter] = useState('all');
  const [specialEmpSearch, setSpecialEmpSearch] = useState('');
  const [specialForm, setSpecialForm] = useState({
    employee_id: '',
    leave_type: 'annual',
    leaveDates: [getTodayStr()],
    returningDate: '',
    substitute_employee_id: '',
    status: 'approved',
  });

  const openSpecialModal = () => {
    const today = getTodayStr();
    setSpecialBranchFilter('all');
    setSpecialEmpSearch('');
    
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 1);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');

    const defaultLeaveType = (leaveTypes && leaveTypes.length > 0) 
      ? (leaveTypes.find(lt => lt.status === 'active')?.code || leaveTypes[0].code) 
      : 'annual';

    setSpecialForm({
      employee_id: '',
      leave_type: defaultLeaveType,
      leaveDates: [today],
      returningDate: `${year}-${month}-${day}`,
      substitute_employee_id: '',
      status: 'approved',
    });
    setSpecialError('');
    setShowSpecialModal(true);
  };

  const updateReturningDate = (dates) => {
    const validDates = dates.filter(Boolean);
    if (validDates.length > 0) {
      const maxDateStr = validDates.reduce((max, cur) => cur > max ? cur : max, validDates[0]);
      const maxDate = new Date(maxDateStr);
      maxDate.setDate(maxDate.getDate() + 1);
      const year = maxDate.getFullYear();
      const month = String(maxDate.getMonth() + 1).padStart(2, '0');
      const day = String(maxDate.getDate()).padStart(2, '0');
      setSpecialForm(prev => ({ ...prev, returningDate: `${year}-${month}-${day}` }));
    } else {
      setSpecialForm(prev => ({ ...prev, returningDate: '' }));
    }
  };

  const handleSpecialDateChange = (idx, value) => {
    const updated = [...specialForm.leaveDates];
    updated[idx] = value;
    setSpecialForm(prev => ({ ...prev, leaveDates: updated }));
    updateReturningDate(updated);
  };

  const addSpecialDate = () => {
    const updated = [...specialForm.leaveDates, getTodayStr()];
    setSpecialForm(prev => ({ ...prev, leaveDates: updated }));
    updateReturningDate(updated);
  };

  const removeSpecialDate = (idx) => {
    const updated = specialForm.leaveDates.filter((_, i) => i !== idx);
    setSpecialForm(prev => ({ ...prev, leaveDates: updated }));
    updateReturningDate(updated);
  };

  const handleSpecialLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!specialForm.employee_id) {
      setSpecialError('Please select an employee.');
      return;
    }
    const validDates = specialForm.leaveDates.filter(Boolean);
    if (validDates.length === 0) {
      setSpecialError('Please select at least one leave date.');
      return;
    }
    setSpecialError('');
    setIsSubmittingSpecial(true);

    try {
      const payload = {
        employee_id: specialForm.employee_id,
        isManagerOverride: true,
        leave_type: specialForm.leave_type,
        leaveDates: validDates,
        returningDate: specialForm.returningDate,
        substitute_employee_id: specialForm.substitute_employee_id || null,
        status: specialForm.status,
        appliedDate: getTodayStr(),
      };

      await api.addApplication(payload);
      showToast('Special leave application scheduled successfully!', 'success');
      setShowSpecialModal(false);
      if (onRefreshApplications) await onRefreshApplications();
    } catch (err) {
      setSpecialError(err.message || 'Failed to schedule special leave.');
    } finally {
      setIsSubmittingSpecial(false);
    }
  };

  const getEmp = (id) => employees?.find(e => e.id === id) || {}
  const getRole = (id) => roles?.find(r => r.id === id) || {}
  const getDept = (id) => departments?.find(d => d.id === id) || {}
  const getBranch = (id) => branches?.find(b => b.id === id) || {}

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = (id, action) => {
    let confirmMsg = '';
    if (action === 'approved') confirmMsg = 'Are you sure you want to approve this application?';
    if (action === 'rejected') confirmMsg = 'Are you sure you want to reject this application?';
    if (action === 'pending') confirmMsg = 'Are you sure you want to reset this application to pending?';

    if (!window.confirm(confirmMsg)) return;

    onUpdateStatus(id, action)
    
    let toastMsg = '';
    let toastType = '';
    if (action === 'approved') {
      toastMsg = 'Application approved successfully';
      toastType = 'success';
    } else if (action === 'pending') {
      toastMsg = 'Application reseted';
      toastType = 'warning';
    } else {
      toastMsg = 'Application rejected';
      toastType = 'danger';
    }
    
    showToast(toastMsg, toastType)
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const validApplications = applications.filter(app => !app.substitute_employee_id || app.substituteConfirmed)

  const timeFiltered = validApplications.filter(app => {
    if (timeFilter === 'all') return true
    const d = new Date(app.appliedDate || app.applied_date || app.leaveDates?.[0] || now)
    if (timeFilter === 'this_year') return d.getFullYear() === currentYear
    if (timeFilter === 'this_month') return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    return true
  })

  const branchFiltered = branchFilter === 'all'
    ? timeFiltered
    : timeFiltered.filter(app => getEmp(app.employee_id).branch_id === branchFilter)

  const filtered = branchFiltered.filter(app => {
    const matchFilter = filter === 'all' || app.status === filter
    const q = search.toLowerCase()
    const emp = getEmp(app.employee_id)
    const matchSearch = !q || 
      (emp.name || '').toLowerCase().includes(q) || 
      (getBranch(emp.branch_id).name || '').toLowerCase().includes(q) || 
      app.id.toLowerCase().includes(q)
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

  const calendarApprovedLeaves = validApplications.filter(app => {
    if (app.status !== 'approved') return false
    const emp = getEmp(app.employee_id)
    const matchBranch = branchFilter === 'all' || emp.branch_id === branchFilter
    const q = search.toLowerCase()
    const matchSearch = !q || 
      (emp.name || '').toLowerCase().includes(q) || 
      (getBranch(emp.branch_id).name || '').toLowerCase().includes(q) || 
      app.id.toLowerCase().includes(q)
    return matchBranch && matchSearch
  })

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthlyApprovedLeavesCount = calendarApprovedLeaves.filter(app => 
    app.leaveDates && app.leaveDates.some(d => d.startsWith(currentMonthStr))
  ).length

  return (
    <div className="admin-content">
      {/* Active Operational Contingency Alert Banner */}
      <ActiveContingencyAlertBanner branchId={branchFilter} />

      {/* Live Team Capacity Meter */}
      <TeamCapacityMeter branches={branches} activeBranch={branchFilter} />

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
                {monthlyApprovedLeavesCount} Approved
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
                          {dayLeaves.length}
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
        <select className="admin-filter-select" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} id="dash-time-filter">
          <option value="this_month">This Month</option>
          <option value="this_year">This Year</option>
          <option value="all">All Time</option>
        </select>
        {branches.length > 1 && (
          <select className="admin-filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} id="dash-branch-filter">
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select className="admin-filter-select" value={filter} onChange={e => setFilter(e.target.value)} id="dash-status-filter">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button 
          className="btn-primary" 
          onClick={openSpecialModal} 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 16px', background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Special Leave Application
        </button>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="hide-mobile">ID</th>
              <th>Applicant</th>
              <th className="hide-mobile">Branch</th>
              <th className="hide-mobile">Role</th>
              <th>Leave Dates</th>
              <th className="hide-mobile">Returning</th>
              <th className="hide-mobile">Substitute</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No applications found</td></tr>
            ) : filtered.map((app, i) => {
              const todayStr = getYYYYMMDD(new Date())
              const hasPastDate = app.leaveDates.some(d => d < todayStr)
              
              return (
              <tr key={app.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <td className="hide-mobile"><span style={{ fontFamily:'monospace', fontSize:'12px', color:'var(--text-muted)' }}>{app.id}</span></td>
                <td>
                  <div className="cell-user">
                    <div className="cell-avatar">{(getEmp(app.employee_id).name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                    <div>
                      <div className="cell-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getEmp(app.employee_id).name}
                        <button className="btn-icon-only" title="View Leave History" onClick={() => setReportEmp(getEmp(app.employee_id))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </button>
                      </div>
                      <div className="cell-sub">{getDept(getRole(getEmp(app.employee_id).role_id).department_id).name}</div>
                    </div>
                  </div>
                </td>
                <td className="hide-mobile">{getBranch(getEmp(app.employee_id).branch_id).name}</td>
                <td className="hide-mobile"><span style={{ color:'var(--text-secondary)', fontSize:'14px' }}>{getRole(getEmp(app.employee_id).role_id).title || '—'}</span></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '220px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', padding: '3px 6px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '4px', marginRight: '4px' }}>
                      {app.leave_type}
                    </span>
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
                <td>{getEmp(app.substitute_employee_id).name || '—'}</td>
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
                    <button 
                      className="btn-secondary" 
                      style={{fontSize:'12px',padding:'6px 13px', opacity: hasPastDate ? 0.4 : 1, cursor: hasPastDate ? 'not-allowed' : 'pointer'}} 
                      onClick={() => !hasPastDate && handleAction(app.id, 'pending')}
                      disabled={hasPastDate}
                      title={hasPastDate ? "Cannot reset requests that have already started or passed" : "Reset application to pending"}
                    >
                      Reset
                    </button>
                  )}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Employee Leave Report Modal (Dashboard Version) ── */}
      {reportEmp && (() => {
        const empApps = applications
          .filter(a => a.employee_id === reportEmp.id && a.status === 'approved')
          .map(a => ({
            ...a,
            leaveDates: [...(a.leaveDates || [])].sort((d1, d2) => new Date(d1) - new Date(d2))
          }))
          .sort((a, b) => {
            const dateA = a.leaveDates.length > 0 ? new Date(a.leaveDates[0]) : new Date(8640000000000000);
            const dateB = b.leaveDates.length > 0 ? new Date(b.leaveDates[0]) : new Date(8640000000000000);
            return dateA - dateB;
          })
        let totalAnnual = 0; let totalSick = 0; let totalCasual = 0;
        empApps.forEach(a => {
          const days = a.leaveDates ? a.leaveDates.length : 0;
          if (a.leave_type === 'annual') totalAnnual += days;
          if (a.leave_type === 'sick') totalSick += days;
          if (a.leave_type === 'casual') totalCasual += days;
        });
        const totalDays = totalAnnual + totalSick + totalCasual;
        const rule = (leaveRules || []).find(r => r.role_id === reportEmp.role_id && r.branch_id === reportEmp.branch_id);
        const maxAnnual = rule ? rule.annual_leave : 0;
        const maxSick = rule ? rule.sick_leave : 0;
        const maxCasual = rule ? rule.casual_leave : 0;
        const maxTotal = maxAnnual + maxSick + maxCasual;

        const dateStr = (d) => {
          if (!d) return '—';
          return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return (
          <div className="modal-backdrop" onClick={() => setReportEmp(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%' }}>
              <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid var(--bg-card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>Leave Report</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>{reportEmp.name} • {getRole(reportEmp.role_id)?.title} • {getBranch(reportEmp.branch_id)?.name}</p>
                </div>
                <button className="modal-close" onClick={() => setReportEmp(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body" style={{ padding: '24px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <div className="report-summary-grid">
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Taken</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {totalDays} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {maxTotal} days</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxTotal - totalDays)} remaining
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Annual</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>
                      {totalAnnual} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>/ {maxAnnual} taken</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxAnnual - totalAnnual)} remaining
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Sick</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#f472b6' }}>
                      {totalSick} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>/ {maxSick} taken</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxSick - totalSick)} remaining
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Casual</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399' }}>
                      {totalCasual} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>/ {maxCasual} taken</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxCasual - totalCasual)} remaining
                    </div>
                  </div>
                </div>
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px', flexShrink: 0 }}>Detailed Log</h4>
                {empApps.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: '8px', border: '1px dashed var(--bg-card-border)' }}>
                    No approved leaves found for this employee.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--bg-card-border)', borderRadius: '8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Dates</th>
                          <th>Days</th>
                          <th>Returning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empApps.map(app => (
                          <tr key={app.id}>
                            <td>{app.leave_type}</td>
                            <td>{app.leaveDates?.map(d => dateStr(d)).join(', ')}</td>
                            <td>{app.leaveDates?.length || 0}</td>
                            <td>{dateStr(app.returningDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setReportEmp(null)}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

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
                  {(() => {
                    const emp = getEmp(leave.employee_id);
                    const role = getRole(emp.role_id);
                    const dept = getDept(role.department_id);
                    const subEmp = leave.substitute_employee_id ? getEmp(leave.substitute_employee_id) : null;
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>{emp.name || 'Unknown'}</h4>
                          <span className="badge badge-approved" style={{ padding: '2px 8px' }}>Approved</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <div><strong>Branch:</strong> {getBranch(emp.branch_id)?.name || '—'}</div>
                          <div><strong>Department:</strong> {dept?.name || '—'}</div>
                          <div><strong>Role:</strong> {role?.title || '—'}</div>
                          <div><strong>Substitute:</strong> {subEmp ? subEmp.name : '—'}</div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <strong>Leave Dates:</strong> {leave.leaveDates?.map(d => formatDate(d)).join(', ') || '—'}
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <strong>Returning Date:</strong> {formatDate(leave.returningDate)}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setSelectedDayLeaves(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Special Leave Application Modal (Manager Override) ── */}
      {showSpecialModal && (
        <div className="modal-backdrop" onClick={() => setShowSpecialModal(false)} style={{ zIndex: 9999, overflow: 'hidden' }}>
          <div 
            className="modal-box" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '600px', 
              width: '90%', 
              maxHeight: 'calc(100vh - 40px)',
              background: 'var(--bg-secondary, #131927)', 
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
              zIndex: 10000,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  Special Leave Application
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  Manager Override: Schedule leave for an employee for any date (including dates closer than 3 days).
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowSpecialModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSpecialLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
              <div 
                className="modal-body" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px', 
                  flex: '1 1 auto', 
                  minHeight: 0, 
                  overflowY: 'auto', 
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {specialError && (
                  <div style={{ color: '#ff5252', fontSize: '13px', background: 'rgba(255,82,82,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,82,82,0.2)' }}>
                    {specialError}
                  </div>
                )}

                {/* Branch & Name Search Filter Controls */}
                {(() => {
                  const safeEmployees = employees || [];
                  const safeBranches = branches || [];
                  const filteredEmps = safeEmployees.filter(e => {
                    if (e.status !== 'active') return false;
                    if (specialBranchFilter !== 'all' && e.branch_id !== specialBranchFilter) return false;
                    if (specialEmpSearch && specialEmpSearch.trim() !== '') {
                      const q = specialEmpSearch.toLowerCase();
                      return (e.name || '').toLowerCase().includes(q);
                    }
                    return true;
                  });

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: safeBranches.length > 1 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                        {safeBranches.length > 1 && (
                          <div className="form-group">
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              Filter by Branch
                            </label>
                            <select
                              className="admin-filter-select"
                              style={{ width: '100%' }}
                              value={specialBranchFilter}
                              onChange={e => setSpecialBranchFilter(e.target.value)}
                            >
                              <option value="all">All Branches</option>
                              {safeBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Search Employee Name
                          </label>
                          <div className="admin-search-box" style={{ width: '100%', height: '42px', position: 'relative' }}>
                            <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input
                              type="text"
                              placeholder="Type name to search…"
                              value={specialEmpSearch}
                              onChange={e => setSpecialEmpSearch(e.target.value)}
                              style={{ paddingRight: specialEmpSearch ? '28px' : '12px' }}
                            />
                            {specialEmpSearch && (
                              <button
                                type="button"
                                onClick={() => setSpecialEmpSearch('')}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Select Employee (Inline List) */}
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Select Employee <span style={{ color: '#f87171' }}>*</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 'normal' }}>
                            ({filteredEmps.length} active employee{filteredEmps.length === 1 ? '' : 's'} available)
                          </span>
                        </label>
                        <div 
                          style={{ 
                            border: '1px solid var(--bg-card-border)', 
                            borderRadius: '8px', 
                            maxHeight: '180px', 
                            overflowY: 'auto', 
                            background: 'var(--bg-card)',
                            display: 'flex',
                            flexDirection: 'column',
                            overscrollBehavior: 'contain'
                          }}
                        >
                          {filteredEmps.length === 0 ? (
                            <div style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                              No active employees match your search.
                            </div>
                          ) : (
                            filteredEmps.map(emp => {
                              const br = getBranch(emp.branch_id);
                              const rl = getRole(emp.role_id);
                              const isSelected = specialForm.employee_id === emp.id;
                              return (
                                <div 
                                  key={emp.id} 
                                  onClick={() => setSpecialForm(prev => ({ ...prev, employee_id: emp.id, substitute_employee_id: '' }))}
                                  style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--bg-card-border)',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                  onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div>
                                    <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '13px' }}>{emp.name}</div>
                                    <div style={{ fontSize: '11px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', opacity: isSelected ? 0.9 : 0.7, marginTop: '2px' }}>
                                      {br?.name || 'Branch'} • {rl?.title || 'Role'}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                        {/* Hidden required input to maintain HTML5 form validation for required employee selection */}
                        <input type="text" value={specialForm.employee_id} onChange={()=>{}} required style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', padding: 0, border: 0 }} tabIndex={-1} />
                      </div>
                    </>
                  );
                })()}

                {/* Leave Type */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Leave Type <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={specialForm.leave_type}
                    onChange={e => setSpecialForm(p => ({ ...p, leave_type: e.target.value }))}
                    required
                  >
                    {leaveTypes && leaveTypes.length > 0 ? (
                      leaveTypes.filter(lt => lt.status === 'active').map(lt => (
                        <option key={lt.id} value={lt.code}>{lt.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="annual">Annual Leave</option>
                        <option value="sick">Sick Leave</option>
                        <option value="casual">Casual Leave</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Leave Dates */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Leave Dates <span style={{ color: '#f87171' }}>*</span>
                    <span style={{ fontSize: '12px', color: 'var(--accent-primary)', marginLeft: '8px', fontWeight: 'normal' }}>
                      (Allowed dates closer than 3 days)
                    </span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(specialForm.leaveDates || []).map((ld, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="date"
                          className="admin-filter-select"
                          style={{ flex: 1 }}
                          value={ld}
                          onChange={e => handleSpecialDateChange(idx, e.target.value)}
                          required
                        />
                        {(specialForm.leaveDates || []).length > 1 && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => removeSpecialDate(idx)}
                            style={{ padding: '8px 12px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={addSpecialDate}
                      style={{ alignSelf: 'flex-start', marginTop: '4px', fontSize: '13px' }}
                    >
                      + Add Date
                    </button>
                  </div>
                </div>

                {/* Returning Date */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Returning Date
                  </label>
                  <input
                    type="date"
                    className="admin-filter-select"
                    style={{ width: '100%', opacity: 0.7, cursor: 'not-allowed' }}
                    value={specialForm.returningDate}
                    readOnly
                  />
                </div>

                {/* Substitute Employee */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Substitute Employee (Optional)
                  </label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={specialForm.substitute_employee_id}
                    onChange={e => setSpecialForm(p => ({ ...p, substitute_employee_id: e.target.value }))}
                  >
                    <option value="">-- No Substitute / Optional --</option>
                    {(() => {
                      const safeEmps = employees || [];
                      const selEmp = safeEmps.find(e => e.id === specialForm.employee_id);
                      const candidates = selEmp
                        ? safeEmps.filter(e => e.id !== selEmp.id && e.branch_id === selEmp.branch_id && e.status === 'active')
                        : safeEmps.filter(e => e.status === 'active');
                      return candidates.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Application Status */}
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={specialForm.status}
                    onChange={e => setSpecialForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="approved">Approved (Default)</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowSpecialModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmittingSpecial}>
                  {isSubmittingSpecial ? 'Scheduling...' : 'Schedule Leave'}
                </button>
              </div>
            </form>
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
   ManageEmployees — with sub-tabs
───────────────────────────────────────────────────── */
const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Operations']
const DESIGNATIONS = ['Senior Engineer', 'Junior Developer', 'Software Engineer', 'Accountant', 'HR Manager', 'Operations Lead']

export function ManageEmployees({ branches, employees, setEmployees, departments, roles, isSuper, leaveRules, setLeaveRules, applications = [], leaveTypes = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('directory')
  const [search, setSearch]             = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [modal, setModal]               = useState(null) // null | 'add' | employee object
  const [toast, setToast]               = useState(null)
  const [secretCodePopup, setSecretCodePopup] = useState(null)
  const EMPTY_EMP = { name:'', role_id: roles?.[0]?.id || '', branch_id: branches?.[0]?.id || '', status:'active' }
  const [form, setForm]                 = useState(EMPTY_EMP)

  // Leave rules state
  const [ruleModal, setRuleModal]       = useState(null)
  const EMPTY_RULE = { role_id: roles?.[0]?.id || '', branch_id: branches?.[0]?.id || '', annualLeave: 14, sickLeave: 10, casualLeave: 7, maxPerDay: 1, status: 'active' }
  const [ruleForm, setRuleForm]         = useState(EMPTY_RULE)
  const [reportEmp, setReportEmp]       = useState(null)  // employee to show report for

  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = (e) => {
      const mainEl = document.querySelector('.admin-content');
      const scrollTop = window.scrollY || document.documentElement.scrollTop || (mainEl ? mainEl.scrollTop : 0) || (e.target.scrollTop || 0);
      setShowScrollTop(scrollTop > 300);
    };
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('.admin-content');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRole = (role_id) => roles?.find(r => r.id === role_id)
  const getDept = (dept_id) => departments?.find(d => d.id === dept_id)
  const getBranch = (branch_id) => branches?.find(b => b.id === branch_id)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const openAdd  = ()    => { setForm(EMPTY_EMP); setModal('add') }
  const openEdit = (emp) => { setForm({ ...emp }); setModal(emp) }
  const closeModal = ()  => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim()) return
    try {
      if (modal === 'add') {
        const existingCodes = employees.map(e => e.secretCode).filter(Boolean);
        const newSecretCode = generateSecretCode(existingCodes);
        const payload = { ...form, secretCode: newSecretCode };
        const addedEmp = await api.addEmployee(payload);
        setEmployees(prev => [...prev, { ...addedEmp, secretCode: newSecretCode }]);
        setSecretCodePopup({ name: form.name, secretCode: newSecretCode });
        closeModal();
      } else {
        const updatedEmp = await api.updateEmployee(modal.id, form);
        setEmployees(prev => prev.map(e => e.id === modal.id ? { ...updatedEmp, secretCode: e.secretCode } : e));
        showToast('Employee updated');
        closeModal();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return
    try {
      await api.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      showToast('Employee removed', 'danger');
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const filtered = employees.filter(e => {
    const matchBranch = branchFilter === 'all' || e.branch_id === branchFilter
    const q = search.toLowerCase()
    
    const role = getRole(e.role_id)
    const dept = role ? getDept(role.department_id) : null
    const branch = getBranch(e.branch_id)

    const matchSearch = !q || 
      e.name.toLowerCase().includes(q) || 
      (dept?.name || '').toLowerCase().includes(q) || 
      (branch?.name || '').toLowerCase().includes(q) ||
      (role?.title || '').toLowerCase().includes(q)
      
    return matchBranch && matchSearch
  })

  // ── Leave Rules handlers ──
  const openEditRule = (rule) => { setRuleForm({ ...rule }); setRuleModal(rule) }
  const closeRuleModal = () => setRuleModal(null)

  const handleSaveRule = async () => {
    if (!ruleForm.role_id || !ruleForm.branch_id) return
    
    // Build leaveAllocations dynamically from leaveTypes
    const leaveAllocations = {};
    leaveTypes.forEach(lt => {
      leaveAllocations[lt.code] = parseInt(ruleForm[`${lt.code}_leave`]) || 0;
    });

    const payload = {
      ...ruleForm,
      leaveAllocations
    };

    try {
      const savedRule = await api.saveRule(payload);
      setLeaveRules(prev => {
        const exists = prev.find(r => r.role_id === savedRule.role_id && r.branch_id === savedRule.branch_id)
        if (exists) {
          return prev.map(r => r.role_id === savedRule.role_id && r.branch_id === savedRule.branch_id ? savedRule : r)
        } else {
          return [...prev, savedRule]
        }
      })
      showToast('Leave rule saved successfully')
      closeRuleModal()
    } catch (err) {
      alert("Error saving rule: " + err.message);
    }
  }

  // Group leave rules hierarchically by branch then department
  const groupedLeaveRules = useMemo(() => {
    const grouped = {}
    branches.forEach(b => {
      grouped[b.id] = {}
      
      // Auto-generate missing rules for active roles if they don't exist in leaveRules array
      const branchRules = (roles || []).filter(r => r.status === 'active').map(role => {
        const existingRule = leaveRules.find(r => r.branch_id === b.id && r.role_id === role.id)
        if (existingRule) return existingRule
        
        return {
          id: `tmp-${b.id}-${role.id}`,
          role_id: role.id,
          branch_id: b.id,
          annualLeave: 14,
          sickLeave: 10,
          casualLeave: 7,
          maxPerDay: 1,
          status: 'active'
        }
      })
      
      branchRules.forEach(r => {
        const role = getRole(r.role_id)
        const deptId = role?.department_id || 'unknown'
        if (!grouped[b.id][deptId]) grouped[b.id][deptId] = []
        grouped[b.id][deptId].push(r)
      })
    })
    return grouped
  }, [leaveRules, branches, roles])

  const [ruleBranchFilter, setRuleBranchFilter] = useState('all')

  // ── Employee Overview computations ──
  const overviewBranches = isSuper ? branches : branches
  const [overviewBranchFilter, setOverviewBranchFilter] = useState('all')
  const [showEmployeeBreakdown, setShowEmployeeBreakdown] = useState(false)

  const overviewEmployees = overviewBranchFilter === 'all'
    ? employees
    : employees.filter(e => e.branch_id === overviewBranchFilter)

  // Build overview data: group by department, then by role
  const activeDepts = (departments || []).filter(d => d.status !== 'inactive')

  const overviewData = activeDepts.map(dept => {
    const deptRoles = roles?.filter(r => r.department_id === dept.id) || []
    const roleIds = deptRoles.map(r => r.id)
    
    const deptEmployees = overviewEmployees.filter(e => roleIds.includes(e.role_id))
    const roleMap = {}
    deptEmployees.forEach(e => {
      const roleTitle = getRole(e.role_id)?.title || 'Unknown'
      if (!roleMap[roleTitle]) roleMap[roleTitle] = 0
      roleMap[roleTitle]++
    })
    const roleEntries = Object.entries(roleMap).sort((a, b) => b[1] - a[1])
    return { department_id: dept.id, department: dept.name, total: deptEmployees.length, roles: roleEntries }
  })

  const totalOverview = overviewEmployees.length
  const activeDeptCount = overviewData.filter(d => d.total > 0).length

  // ── Sub-tab definitions ──
  const SUB_TABS = [
    {
      id: 'directory',
      label: 'Staff Directory',
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
      label: 'Employee Overview',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
        </svg>
      ),
    },
    {
      id: 'leave-rules',
      label: 'Set Leave Rules',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
          <path d="M14 2v6h6"/>
          <path d="M9 13h6"/><path d="M9 17h6"/><path d="M9 9h1"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="admin-content">
      {/* Sub-tabs navigation */}
      <div className="emp-subtabs">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            id={`emp-subtab-${tab.id}`}
            className={`emp-subtab ${activeSubTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════ Staff Directory Sub-tab ══════ */}
      {activeSubTab === 'directory' && (
        <>
          <div className="controls-bar">
            <div className="admin-search-box">
              <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          {branches.length > 1 && (
            <select className="admin-filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)} id="emp-branch-filter">
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
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
                          <div className="cell-sub">{getDept(getRole(emp.role_id)?.department_id)?.name || 'Unknown Dept'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily:'monospace', color:'var(--text-secondary)' }}>{emp.secretCode || '—'}</span>
                        {emp.secretCode && (
                          <button 
                            onClick={() => { navigator.clipboard.writeText(emp.secretCode); showToast('Secret code copied!'); }}
                            title="Copy secret code"
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              cursor: 'pointer', 
                              color: 'var(--text-muted)', 
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{getRole(emp.role_id)?.title || 'Unknown Role'}</td>
                    <td>{getBranch(emp.branch_id)?.name || 'Unknown Branch'}</td>
                    <td>
                      <span className={`badge badge-${emp.status}`}>{emp.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-edit"
                          style={{ background: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.25)', color: '#fbbf24' }}
                          title="View leave report"
                          onClick={() => setReportEmp(emp)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                            <path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
                          </svg>
                          Report
                        </button>
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
        </>
      )}

      {/* ══════ Employee Overview Sub-tab ══════ */}
      {activeSubTab === 'overview' && (
        <div className="overview-section">
          {/* Overview stats row */}
          <div className="stats-row" style={{ marginBottom: '24px' }}>
            <div 
              className="stat-card" 
              style={{ cursor: 'pointer' }} 
              onClick={() => setShowEmployeeBreakdown(true)}
              title="Click to view breakdown by branch"
            >
              <div className="stat-icon stat-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalOverview}</div>
                <div className="stat-label">Total Employees</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{activeDeptCount}</div>
                <div className="stat-label">Active Departments</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{overviewBranches.length}</div>
                <div className="stat-label">{isSuper ? 'All Branches' : 'Your Branch'}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div className="stat-info">
                <div className="stat-value">{new Set(overviewEmployees.map(e => e.role_id)).size}</div>
                <div className="stat-label">Unique Roles</div>
              </div>
            </div>
          </div>

          {/* Branch filter for overview */}
          {isSuper && (
            <div className="controls-bar" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Filter by Branch:</span>
              </div>
              <select className="admin-filter-select" value={overviewBranchFilter} onChange={e => setOverviewBranchFilter(e.target.value)} id="overview-branch-filter">
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* Department-wise breakdown cards */}
          <div className="overview-grid">
            {overviewData.map((dept, dIdx) => (
              <div className="overview-dept-card" key={dept.department} style={{ animationDelay: `${dIdx * 0.06}s` }}>
                <div className="overview-dept-header">
                  <div className="overview-dept-icon">
                    {dept.department.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overview-dept-info">
                    <h4>{dept.department}</h4>
                    <span className="overview-dept-count">{dept.total} {dept.total === 1 ? 'employee' : 'employees'}</span>
                  </div>
                  <div className="overview-dept-badge">{dept.total}</div>
                </div>
                {dept.roles.length > 0 ? (
                  <div className="overview-role-list">
                    {dept.roles.map(([roleName, count]) => (
                      <div className="overview-role-row" key={roleName}>
                        <div className="overview-role-name">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px', color: 'var(--accent-light)', flexShrink: 0 }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          {roleName}
                        </div>
                        <div className="overview-role-bar-wrap">
                          <div
                            className="overview-role-bar"
                            style={{ width: `${Math.min(100, (count / Math.max(dept.total, 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="overview-role-count">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overview-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', opacity: 0.4 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    <span>No employees</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ Set Leave Rules Sub-tab ══════ */}
      {activeSubTab === 'leave-rules' && (
        <div className="leave-rules-section">
          <div className="controls-bar">
            <div className="admin-search-box">
              <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input placeholder="Search leave rules…" id="leave-rule-search" />
            </div>
            {isSuper && (
              <select className="admin-filter-select" value={ruleBranchFilter} onChange={e => setRuleBranchFilter(e.target.value)} id="rule-branch-filter">
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>

          {/* Leave type legend */}
          <div className="leave-legend">
            <div className="leave-legend-item">
              <span className="leave-legend-dot leave-legend-annual"></span>
              Annual Leave
            </div>
            <div className="leave-legend-item">
              <span className="leave-legend-dot leave-legend-sick"></span>
              Sick Leave
            </div>
            <div className="leave-legend-item">
              <span className="leave-legend-dot leave-legend-casual"></span>
              Casual Leave
            </div>
            <div className="leave-legend-item">
              <span className="leave-legend-dot leave-legend-maxday"></span>
              Max/Day Limit
            </div>
          </div>

          <div className="lr-hierarchy">
            {(ruleBranchFilter === 'all' ? branches : branches.filter(b => b.id === ruleBranchFilter)).map(branch => {
              const depts = Object.keys(groupedLeaveRules[branch.id] || {})
              if (depts.length === 0) return null
              
              return (
                <div key={branch.id} className="lr-branch-section">
                  <div className="lr-branch-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    {branch.name} Branch
                  </div>
                  
                  <div className="lr-branch-body">
                    {depts.map(deptId => {
                      const deptName = getDept(deptId)?.name || 'Unknown Department'
                      const rules = groupedLeaveRules[branch.id][deptId]
                      return (
                        <div key={deptId} className="lr-dept-group">
                          <div className="lr-dept-header">
                            <span className="lr-dept-icon">{deptName.slice(0,2).toUpperCase()}</span>
                            {deptName}
                          </div>
                          
                          <div className="lr-role-list">
                            {rules.map(rule => {
                              const roleName = getRole(rule.role_id)?.title || 'Unknown Role'
                              const availableEmployeesCount = employees.filter(e => e.role_id === rule.role_id && e.branch_id === rule.branch_id).length
                              return (
                                <div key={rule.id} className="lr-role-row">
                                  <div className="lr-role-info">
                                    <div className="lr-role-name">{roleName}</div>
                                    <div className="lr-role-count">
                                      <span className="lr-count-badge">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                                        </svg>
                                        {availableEmployeesCount} Available
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="lr-role-days" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {leaveTypes.map(lt => {
                                      const days = rule[`${lt.code}_leave`] || 0;
                                      return (
                                        <span key={lt.id} className="leave-days-chip" style={{ background: `${lt.color}15`, color: lt.color, borderColor: `${lt.color}30` }} title={lt.name}>
                                          {days} {lt.name.charAt(0).toUpperCase()}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="lr-role-maxday">
                                    <label>Max/Day Allowed</label>
                                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{rule.maxPerDay}</span>
                                  </div>
                                  
                                  <div className="lr-role-actions">
                                    <button className="btn-edit-icon" onClick={() => openEditRule(rule)} title="Edit Rule">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            
            {(ruleBranchFilter === 'all' ? branches : branches.filter(b => b.id === ruleBranchFilter)).every(b => Object.keys(groupedLeaveRules[b.id] || {}).length === 0) && (
              <div style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No leave rules found</div>
            )}
          </div>
        </div>
      )}

      {/* ── Employee Add/Edit Modal ── */}
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
                  <label>Role *</label>
                  <select value={form.role_id} onChange={e => setForm(p=>({...p, role_id: e.target.value}))}>
                    {(roles || []).filter(r => r.status === 'active').map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Department</label>
                  <input readOnly value={getDept(getRole(form.role_id)?.department_id)?.name || ''} style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div className="field">
                  <label>Branch</label>
                  <select value={form.branch_id} onChange={e => setForm(p=>({...p, branch_id: e.target.value}))}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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

      {/* ── Leave Rule Add/Edit Modal ── */}
      {ruleModal !== null && (() => {
        // Calculate available employees for the selected role and branch
        const availableEmployeesCount = employees.filter(e => e.role_id === ruleForm.role_id && e.branch_id === ruleForm.branch_id).length;
        
        return (
        <div className="modal-backdrop" onClick={closeRuleModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Leave Rule</h3>
              <button className="modal-close" onClick={closeRuleModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field-row">
                <div className="field">
                  <label>Role</label>
                  <input readOnly value={getRole(ruleForm.role_id)?.title || ''} style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div className="field">
                  <label>Branch</label>
                  <input readOnly value={getBranch(ruleForm.branch_id)?.name || ''} style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Department</label>
                  <input readOnly value={getDept(getRole(ruleForm.role_id)?.department_id)?.name || ''} style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                </div>
                <div className="field">
                  <label>Status</label>
                  <input readOnly value={ruleForm.status} style={{ opacity: 0.7, cursor: 'not-allowed', textTransform: 'capitalize' }} />
                </div>
              </div>
              <div className="leave-rule-days-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                {leaveTypes.map(lt => (
                  <div key={lt.id} className="field">
                    <label>{lt.name} (days)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="365" 
                      value={ruleForm[`${lt.code}_leave`] ?? 0} 
                      onChange={e => setRuleForm(p => ({...p, [`${lt.code}_leave`]: parseInt(e.target.value) || 0}))} 
                    />
                  </div>
                ))}
              </div>
              <div className="leave-total-preview">
                <span>Total Leave Entitlement</span>
                <span className="leave-total-value">
                  {leaveTypes.reduce((sum, lt) => sum + (parseInt(ruleForm[`${lt.code}_leave`]) || 0), 0)} days/year
                </span>
              </div>
              <div className="leave-maxday-section">
                <div className="leave-maxday-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', color: '#e17055' }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>Concurrent Leave Limit</span>
                </div>
                <div className="leave-maxday-row">
                  <div className="field leave-field-maxday">
                    <label>Max Leaves Per Day</label>
                    <input type="number" min="1" max="99" value={ruleForm.maxPerDay} onChange={e => setRuleForm(p=>({...p, maxPerDay: Math.max(1, parseInt(e.target.value) || 1)}))} />
                  </div>
                  <p className="leave-maxday-hint">
                    Maximum number of <strong>{getRole(ruleForm.role_id)?.title || 'employees'}</strong> in <strong>{getBranch(ruleForm.branch_id)?.name || 'this branch'}</strong> that can be on leave on the same day, regardless of leave type.
                    <br />
                    <span style={{ display: 'inline-block', marginTop: '6px', padding: '4px 8px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-light)', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      Currently there {availableEmployeesCount === 1 ? 'is' : 'are'} {availableEmployeesCount} {availableEmployeesCount === 1 ? 'employee' : 'employees'} with this role in this branch.
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeRuleModal}>Cancel</button>
              <button className="btn-primary" id="save-leave-rule-btn" onClick={handleSaveRule}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '2px dashed rgba(249, 115, 22, 0.3)',
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
                  Please share this code with the employee.
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
      
      {showScrollTop && (
        <div style={{ position: 'fixed', bottom: '32px', left: 'calc(50% + 120px)', transform: 'translateX(-50%)', zIndex: 50 }}>
          <button 
            onClick={scrollToTop}
            style={{
              padding: '6px 14px',
              borderRadius: '12px',
              background: 'rgba(249, 115, 22, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'var(--accent-light)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all var(--transition-fast)'
            }}
            title="Scroll to top"
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.background = 'rgba(249, 115, 22, 0.3)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(249, 115, 22, 0.15)';
              e.currentTarget.style.color = 'var(--accent-light)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            Scroll to Top
          </button>
        </div>
      )}

      {showEmployeeBreakdown && (
        <div className="modal-backdrop" onClick={() => setShowEmployeeBreakdown(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Employee Breakdown by Branch</h3>
              <button className="modal-close" onClick={() => setShowEmployeeBreakdown(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overviewBranches.map(b => {
                  const count = overviewEmployees.filter(e => e.branch_id === b.id).length;
                  return (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.name}</div>
                      <div style={{ background: 'var(--accent-gradient)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowEmployeeBreakdown(false)} style={{ width: '100%', justifyContent: 'center' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Leave Report Modal ── */}
      {reportEmp && (() => {
        // Find this employee's applications
        const empApps = applications
          .filter(a => a.employee_id === reportEmp.id && a.status === 'approved')
          .map(a => ({
            ...a,
            leaveDates: [...(a.leaveDates || [])].sort((d1, d2) => new Date(d1) - new Date(d2))
          }))
          .sort((a, b) => {
            const dateA = a.leaveDates.length > 0 ? new Date(a.leaveDates[0]) : new Date(8640000000000000);
            const dateB = b.leaveDates.length > 0 ? new Date(b.leaveDates[0]) : new Date(8640000000000000);
            return dateA - dateB;
          })
        
        // Calculate totals
        let totalAnnual = 0; let totalSick = 0; let totalCasual = 0;
        empApps.forEach(a => {
          const days = a.leaveDates ? a.leaveDates.length : 0;
          if (a.leave_type === 'annual') totalAnnual += days;
          if (a.leave_type === 'sick') totalSick += days;
          if (a.leave_type === 'casual') totalCasual += days;
        });

        const totalDays = totalAnnual + totalSick + totalCasual;
        const rule = (leaveRules || []).find(r => r.role_id === reportEmp.role_id && r.branch_id === reportEmp.branch_id);
        const maxAnnual = rule ? rule.annual_leave : 0;
        const maxSick = rule ? rule.sick_leave : 0;
        const maxCasual = rule ? rule.casual_leave : 0;
        const maxTotal = maxAnnual + maxSick + maxCasual;

        const dateStr = (d) => {
          if (!d) return '—';
          return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        return (
          <div className="modal-backdrop" onClick={() => setReportEmp(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%' }}>
              <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid var(--bg-card-border)' }}>
                <div>
                  <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>Leave Report</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>{reportEmp.name} • {getRole(reportEmp.role_id)?.title} • {getBranch(reportEmp.branch_id)?.name}</p>
                </div>
                <button className="modal-close" onClick={() => setReportEmp(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="modal-body" style={{ padding: '24px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Minimal Summary Boxes */}
                <div className="report-summary-grid">
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Taken</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {totalDays} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {maxTotal} days</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxTotal - totalDays)} remaining
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Annual</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>
                      {totalAnnual} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>/ {maxAnnual} taken</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxAnnual - totalAnnual)} remaining
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Sick</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#f472b6' }}>
                      {totalSick} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>/ {maxSick} taken</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxSick - totalSick)} remaining
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>Casual</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#34d399' }}>
                      {totalCasual} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>/ {maxCasual} taken</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {Math.max(0, maxCasual - totalCasual)} remaining
                    </div>
                  </div>
                </div>

                {/* Report Table */}
                <h4 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px', flexShrink: 0 }}>Detailed Log</h4>
                {empApps.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: '8px', border: '1px dashed var(--bg-card-border)' }}>
                    No approved leaves found for this employee.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--bg-card-border)', borderRadius: '8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Dates</th>
                          <th>Days</th>
                          <th>Returning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empApps.map(app => (
                          <tr key={app.id}>
                            <td>{app.leave_type}</td>
                            <td>{app.leaveDates?.map(d => dateStr(d)).join(', ')}</td>
                            <td>{app.leaveDates?.length || 0}</td>
                            <td>{dateStr(app.returningDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setReportEmp(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ManageBranches
───────────────────────────────────────────────────── */
export function ManageBranches({ branches, setBranches, employees, managers, setManagers }) {
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [toast, setToast]     = useState(null)
  const EMPTY_BR = { 
    name:'', 
    location:'', 
    manager_id:'', 
    status:'active', 
    operating_model:'corporate_5day', 
    working_days: ['Monday','Tuesday','Wednesday','Thursday','Friday'], 
    daily_hours: 8.0,
    weekly_hours: 40.0 
  }
  const [form, setForm]       = useState(EMPTY_BR)

  const getBranchManager = (branchId) => managers?.find(m => m.branch_id === branchId)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const openAdd  = ()    => { setForm(EMPTY_BR); setModal('add') }
  const openEdit = (br)  => { 
    const mgr = getBranchManager(br.id)
    const rawDays = br.working_days || ['Monday','Tuesday','Wednesday','Thursday','Friday']
    let parsedDays = rawDays
    if (typeof rawDays === 'string') {
      try { parsedDays = JSON.parse(rawDays) } catch(e) {}
    }
    const wkHrs = parseFloat(br.weekly_hours) || 40.0
    const dayCount = (parsedDays && parsedDays.length) ? parsedDays.length : 5
    const computedDaily = parseFloat((wkHrs / dayCount).toFixed(1))
    setForm({ 
      ...br, 
      manager_id: mgr ? mgr.id : '',
      operating_model: br.operating_model || 'corporate_5day',
      working_days: parsedDays,
      daily_hours: computedDaily,
      weekly_hours: wkHrs
    })
    setModal(br) 
  }
  const closeModal = ()  => setModal(null)

  const getEmployeeCount = (branchId) => {
    return employees ? employees.filter(e => e.branch_id === branchId).length : 0
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const empCount = modal === 'add' ? 0 : getEmployeeCount(modal.id)
    
    try {
      let savedBranchId = '';
      if (modal === 'add') {
        const payload = { ...form, employees: empCount };
        const newBranch = await api.addBranch(payload);
        savedBranchId = newBranch.id;
        setBranches(prev => [...prev, newBranch]);
        showToast('Branch added successfully');
      } else {
        savedBranchId = modal.id;
        const payload = { ...form, employees: empCount };
        const updatedBranch = await api.updateBranch(savedBranchId, payload);
        setBranches(prev => prev.map(b => b.id === savedBranchId ? updatedBranch : b));
        showToast('Branch updated');
      }

      if (setManagers) {
        setManagers(prev => prev.map(m => {
          if (m.id === form.manager_id) return { ...m, branch_id: savedBranchId }
          if (m.branch_id === savedBranchId && m.id !== form.manager_id) return { ...m, branch_id: null }
          return m
        }))
      }
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this branch?')) return
    try {
      await api.deleteBranch(id);
      setBranches(prev => prev.filter(b => b.id !== id));
      showToast('Branch removed', 'danger');
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const filtered = branches.filter(b => {
    const mgr = getBranchManager(b.id)
    const q = search.toLowerCase()
    return !q || 
      b.name.toLowerCase().includes(q) || 
      b.location.toLowerCase().includes(q) || 
      (mgr?.username || '').toLowerCase().includes(q)
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
                <td>{getBranchManager(br.id)?.username || '—'}</td>
                <td>
                  <span style={{ fontWeight:600, color:'var(--text-primary)' }}>{getEmployeeCount(br.id)}</span>
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
                  <input placeholder="Branch name" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input placeholder="Province / City" value={form.location} onChange={e => setForm(p=>({...p, location: e.target.value}))} />
                </div>
              </div>
              <div className="field">
                <label>Branch Manager</label>
                <select value={form.manager_id} onChange={e => setForm(p=>({...p, manager_id: e.target.value}))}>
                  <option value="">No Manager Assigned</option>
                  {(managers || []).map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                </select>
              </div>

              <div className="field-row">
                <div className="field" style={{ flex: 1.5 }}>
                  <label>Operating Schedule Model</label>
                  <select 
                    value={form.operating_model || 'corporate_5day'} 
                    onChange={e => {
                      const val = e.target.value;
                      let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                      if (val === 'retail_5_5day') {
                        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      } else if (val === 'retail_6day') {
                        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      } else if (val === 'factory_24_7') {
                        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      }
                      const curDaily = form.daily_hours || 8.0;
                      const newWk = parseFloat((curDaily * days.length).toFixed(1));
                      setForm(p => ({ ...p, operating_model: val, working_days: days, weekly_hours: newWk }));
                    }}
                  >
                    <option value="corporate_5day">Corporate 5-Day (Mon–Fri)</option>
                    <option value="retail_5_5day">Commercial 5.5-Day (Mon–Fri + Sat Half Day)</option>
                    <option value="retail_6day">Operational / Retail 6-Day (Mon–Sat)</option>
                    <option value="factory_24_7">Continuous Coverage (All 7 Days)</option>
                  </select>
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>Daily Hours (hrs/day)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    min="1" 
                    max="24"
                    value={form.daily_hours ?? 8.0} 
                    onChange={e => {
                      const dHrs = parseFloat(e.target.value) || 0;
                      const dayCount = (form.working_days || []).length || 5;
                      const newWk = parseFloat((dHrs * dayCount).toFixed(1));
                      setForm(p => ({ ...p, daily_hours: dHrs, weekly_hours: newWk }));
                    }} 
                  />
                </div>

                <div className="field" style={{ flex: 1 }}>
                  <label>Weekly Hours</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    value={form.weekly_hours ?? 40.0} 
                    onChange={e => {
                      const wHrs = parseFloat(e.target.value) || 0;
                      const dayCount = (form.working_days || []).length || 5;
                      const newDaily = parseFloat((wHrs / dayCount).toFixed(1));
                      setForm(p => ({ ...p, weekly_hours: wHrs, daily_hours: newDaily }));
                    }} 
                  />
                </div>
              </div>
              <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '-6px', marginBottom: '14px', lineHeight: 1.4 }}>
                💡 <strong>Custom Facility Hours</strong>: Institutes with longer daily hours (e.g. 9h, 10h, or 12h) can set their baseline daily hours here. For employees working multi-shift rotations (e.g. 12-hr hospital/security shifts), configure exact durations in <strong>Shift Masters</strong>.
              </p>

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
  const EMPTY_MGR = { username:'', branch_id: '', status:'active', role: 'manager' }
  const [form, setForm]           = useState(EMPTY_MGR)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const openAdd  = ()    => { setForm(EMPTY_MGR); setModal('add') }
  const openEdit = (mgr) => { setForm({ ...mgr }); setModal(mgr) }
  const closeModal = ()  => setModal(null)

  const handleSave = async () => {
    if (!form.username.trim()) return
    try {
      if (modal === 'add') {
        const newMgr = await api.addManager(form);
        setManagers(prev => [...prev, newMgr]);
        showToast('Manager added successfully');
      } else {
        const updatedMgr = await api.updateManager(modal.id, form);
        setManagers(prev => prev.map(m => m.id === modal.id ? updatedMgr : m));
        showToast('Manager updated');
      }
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this manager?')) return
    try {
      await api.deleteManager(id);
      setManagers(prev => prev.filter(m => m.id !== id));
      showToast('Manager removed', 'danger');
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const filtered = managers.filter(m => {
    const q = search.toLowerCase()
    const bName = branches.find(br => br.id === m.branch_id)?.name || ''
    return !q ||
      m.username.toLowerCase().includes(q) ||
      bName.toLowerCase().includes(q) ||
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
                <td>{branches.find(b => b.id === mgr.branch_id)?.name || '—'}</td>

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
                  <input placeholder="Enter username" value={form.username} onChange={e => setForm(p=>({...p, username: e.target.value}))} />
                </div>
                <div className="field">
                  {/* Branch assignment happens during branch creation, so no field here. */}
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

  const handleSave = async () => {
    if (!form.name.trim()) return
    try {
      if (modal === 'add') {
        const newDept = await api.addDepartment(form);
        setDepartments(prev => [...prev, newDept]);
        showToast('Department added successfully');
      } else {
        const updatedDept = await api.updateDepartment(modal.id, form);
        setDepartments(prev => prev.map(d => d.id === modal.id ? updatedDept : d));
        showToast('Department updated');
      }
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this department?')) return
    try {
      await api.deleteDepartment(id);
      setDepartments(prev => prev.filter(d => d.id !== id));
      showToast('Department removed', 'danger');
    } catch (err) {
      alert("Error: " + err.message);
    }
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
                  <input placeholder="Department name" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} />
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
  const EMPTY_ROLE = { title:'', department_id: departments[0]?.id || '', description:'', status:'active' }
  const [form, setForm]         = useState(EMPTY_ROLE)

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  const openAdd  = ()    => { setForm(EMPTY_ROLE); setModal('add') }
  const openEdit = (role)  => { setForm({ ...role }); setModal(role) }
  const closeModal = ()  => setModal(null)

  const handleSave = async () => {
    if (!form.title.trim()) return
    try {
      if (modal === 'add') {
        const newRole = await api.addRole(form);
        setRoles(prev => [...prev, newRole]);
        showToast('Role added successfully');
      } else {
        const updatedRole = await api.updateRole(modal.id, form);
        setRoles(prev => prev.map(r => r.id === modal.id ? updatedRole : r));
        showToast('Role updated');
      }
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this role?')) return
    try {
      await api.deleteRole(id);
      setRoles(prev => prev.filter(r => r.id !== id));
      showToast('Role removed', 'danger');
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  const filtered = roles.filter(r => {
    const matchDept = deptFilter === 'all' || r.department_id === deptFilter
    const q = search.toLowerCase()
    const dept = departments.find(d => d.id === r.department_id);
    const matchSearch = !q ||
      r.title.toLowerCase().includes(q) ||
      (dept?.name || '').toLowerCase().includes(q) ||
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
                  <input placeholder="Role title" value={form.title} onChange={e => setForm(p=>({...p, title: e.target.value}))} />
                </div>
                <div className="field">
                  <label>Department</label>
                  <select value={form.department_id} onChange={e => setForm(p=>({...p, department_id: e.target.value}))}>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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

  const handleSave = async () => {
    if (!form.username.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setError('All fields are required')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setError('')
    try {
      const updatedMgr = await api.updateManager(currentUser.id, { ...currentUser, username: form.username, password: form.password });
      setManagers(prev => prev.map(m => m.id === currentUser.id ? updatedMgr : m));
      setCurrentUser(updatedMgr);
      setToast('Account settings updated');
      setTimeout(() => {
        setToast(null)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to update credentials');
    }
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

/* ─────────────────────────────────────────────────────
   SystemSettings
───────────────────────────────────────────────────── */
export function SystemSettings() {
  const [logoBase64, setLogoBase64] = useState(null)
  const [themeColor, setThemeColor] = useState('orange')
  const [themeColorSecondary, setThemeColorSecondary] = useState('orange')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings()
        if (data.company_logo) setLogoBase64(data.company_logo)
        if (data.theme_color) setThemeColor(data.theme_color)
        if (data.theme_color_secondary) setThemeColorSecondary(data.theme_color_secondary)
      } catch (err) {
        console.error("Failed to load settings", err)
      }
    }
    fetchSettings()
  }, [])

  const handleThemeSelect = (colorName) => {
    setThemeColor(colorName)
    applyTheme(colorName, 'primary')
  }

  const handleSecondaryThemeSelect = (colorName) => {
    setThemeColorSecondary(colorName)
    applyTheme(colorName, 'secondary')
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("Image too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoBase64(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.updateSettings({ company_logo: logoBase64, theme_color: themeColor, theme_color_secondary: themeColorSecondary })
      setToast({ msg: 'Settings saved successfully', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast({ msg: err.message || 'Failed to save settings', type: 'danger' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-content" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Branding Section */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--bg-card-border)' }}>
          <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Brand Identity
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Customize the system's appearance with your organization's logo.
          </p>
        </div>
        <div className="admin-card-body" style={{ paddingTop: '24px' }}>
          <div className="field">
            <label style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'block' }}>Company Logo</label>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '24px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px dashed var(--bg-card-border)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: '24px'
            }}>
              <div style={{ 
                width: '100px', height: '100px', borderRadius: '16px', 
                background: 'var(--bg-card)', 
                border: '1px solid var(--bg-card-border)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {logoBase64 ? (
                  <img src={logoBase64} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '40px', height: '40px', color: 'var(--text-muted)' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input type="file" id="logo-upload" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <label htmlFor="logo-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', padding: '8px 16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload New Image
                </label>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: '0 0 4px 0' }}>• Recommended dimensions: <strong>256x256px</strong></p>
                  <p style={{ margin: 0 }}>• Maximum file size: <strong>2MB</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-form-group" style={{ marginTop: '32px' }}>
          <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Primary Accent Theme Color</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.keys(APP_THEMES).map(themeName => (
              <div
                key={themeName}
                onClick={() => handleThemeSelect(themeName)}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
                  background: APP_THEMES[themeName]['--accent-gradient'],
                  border: themeColor === themeName ? '2px solid white' : '2px solid transparent',
                  boxShadow: themeColor === themeName ? `0 0 16px ${APP_THEMES[themeName]['--accent-glow']}` : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: themeColor === themeName ? 'scale(1.15)' : 'scale(1)'
                }}
                title={themeName.charAt(0).toUpperCase() + themeName.slice(1)}
              />
            ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.5' }}>
            Select the primary brand color for the entire dashboard. This setting applies globally to all users.
          </p>
        </div>

        <div className="admin-form-group" style={{ marginTop: '32px' }}>
          <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Secondary Accent Theme Color</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.keys(APP_THEMES).map(themeName => (
              <div
                key={themeName}
                onClick={() => handleSecondaryThemeSelect(themeName)}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer',
                  background: APP_THEMES[themeName]['--accent-gradient'],
                  border: themeColorSecondary === themeName ? '2px solid white' : '2px solid transparent',
                  boxShadow: themeColorSecondary === themeName ? `0 0 16px ${APP_THEMES[themeName]['--accent-glow']}` : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: themeColorSecondary === themeName ? 'scale(1.15)' : 'scale(1)'
                }}
                title={themeName.charAt(0).toUpperCase() + themeName.slice(1)}
              />
            ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.5' }}>
            Select the secondary brand color for buttons, chips, and highlights. This setting applies globally to all users.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--bg-card-border)' }}>
        <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ padding: '10px 24px', fontSize: '14px' }}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   Leave Overview
───────────────────────────────────────────────────── */
export function LeaveOverview({ applications, employees, branches, departments, roles }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [branchFilter, setBranchFilter] = useState('all')
  const [monthsRange, setMonthsRange] = useState(12)
  const [monthOffset, setMonthOffset] = useState(0)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i)

  // Generate days of the selected year
  const daysInYear = []
  const startOfYear = new Date(selectedYear, monthOffset, 1)
  const endOfYear = new Date(selectedYear, monthOffset + monthsRange, 0)
  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    daysInYear.push(new Date(d))
  }

  const monthDaysArray = Array.from({ length: monthsRange }, (_, i) => new Date(selectedYear, monthOffset + i + 1, 0).getDate());

  const filteredEmps = (branchFilter === 'all' ? employees : employees.filter(e => e.branch_id === branchFilter))
    .sort((a, b) => a.name.localeCompare(b.name))
  const filteredEmpIds = new Set(filteredEmps.map(e => e.id))

  // Pre-calculate approved leaves for fast lookup
  const approvedLeaves = applications.filter(a => a.status === 'approved')
  const leaveMap = {} // { employee_id: { 'YYYY-MM-DD': type } }
  const empLeaveCounts = {} // { employee_id: total_leaves_in_year }
  const monthLeaveCounts = new Array(12).fill(0) // total leaves per month globally
  const empMonthStats = {} // { employee_id: [{total, annual, sick, casual}, ...] }
  let totalAnnual = 0; let totalSick = 0; let totalCasual = 0;

  employees.forEach(emp => {
    empMonthStats[emp.id] = Array.from({ length: 12 }, () => ({ total: 0, annual: 0, sick: 0, casual: 0 }))
  })

  approvedLeaves.forEach(app => {
    if (!filteredEmpIds.has(app.employee_id)) return;

    if (!leaveMap[app.employee_id]) leaveMap[app.employee_id] = {}
    if (!empLeaveCounts[app.employee_id]) empLeaveCounts[app.employee_id] = 0
    if (app.leaveDates) {
      app.leaveDates.forEach(dateStr => {
        // Only count if it's in the selected year
        if (dateStr.startsWith(selectedYear.toString())) {
          leaveMap[app.employee_id][dateStr] = app.leave_type
          
          const monthIdx = parseInt(dateStr.split('-')[1], 10) - 1
          
          monthLeaveCounts[monthIdx]++
          empMonthStats[app.employee_id][monthIdx].total++

          if (app.leave_type === 'annual') { totalAnnual++; empMonthStats[app.employee_id][monthIdx].annual++ }
          if (app.leave_type === 'sick') { totalSick++; empMonthStats[app.employee_id][monthIdx].sick++ }
          if (app.leave_type === 'casual') { totalCasual++; empMonthStats[app.employee_id][monthIdx].casual++ }
          
          empLeaveCounts[app.employee_id]++
        }
      })
    }
  })

  const totalLeaves = totalAnnual + totalSick + totalCasual

  const dateStrLocal = (d) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return (
    <div className="admin-content-inner">
      <div className="controls-bar" style={{ marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Leave Overview
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {branches.length > 1 && (
            <select className="admin-filter-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select className="admin-filter-select" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
            {[12, 6, 3].map(val => (
              <button 
                key={val}
                onClick={() => { setMonthsRange(val); setMonthOffset(0); }}
                style={{
                  minWidth: '48px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '6px',
                  background: monthsRange === val ? 'var(--theme-color)' : 'transparent',
                  color: monthsRange === val ? '#fff' : 'var(--text-muted)',
                  fontWeight: monthsRange === val ? 600 : 500,
                  border: 'none', outline: 'none',
                  boxShadow: monthsRange === val ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {val}M
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '12px', gap: '12px' }}>
        <div className="stat-card" style={{ padding: '10px 16px' }}>
          <div className="stat-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Total Leaves ({selectedYear})</div>
          <div className="stat-val" style={{ fontSize: '20px' }}>{totalLeaves}</div>
        </div>
        <div className="stat-card" style={{ padding: '10px 16px' }}>
          <div className="stat-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Total Annual</div>
          <div className="stat-val" style={{ color: '#a78bfa', fontSize: '20px' }}>{totalAnnual}</div>
        </div>
        <div className="stat-card" style={{ padding: '10px 16px' }}>
          <div className="stat-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Total Sick</div>
          <div className="stat-val" style={{ color: '#f472b6', fontSize: '20px' }}>{totalSick}</div>
        </div>
        <div className="stat-card" style={{ padding: '10px 16px' }}>
          <div className="stat-label" style={{ fontSize: '10px', marginBottom: '2px' }}>Total Casual</div>
          <div className="stat-val" style={{ color: '#34d399', fontSize: '20px' }}>{totalCasual}</div>
        </div>
      </div>

      {monthsRange < 12 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 16px', fontSize: '14px', borderRadius: '6px' }}
            disabled={monthOffset === 0}
            onClick={() => setMonthOffset(Math.max(0, monthOffset - monthsRange))}
          >
            &larr;
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '4px 16px', fontSize: '14px', borderRadius: '6px' }}
            disabled={monthOffset + monthsRange >= 12}
            onClick={() => setMonthOffset(Math.min(12 - monthsRange, monthOffset + monthsRange))}
          >
            &rarr;
          </button>
        </div>
      )}

      <div className="overview-container" style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--bg-card-border)', overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
        <div className="leave-heatmap-grid" style={{ minWidth: monthsRange === 12 ? '800px' : monthsRange === 6 ? '400px' : '200px' }}>
          
          {/* Header Row (Months) */}
          <div style={{ display: 'flex', paddingLeft: '180px', paddingRight: '16px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, paddingTop: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInYear.length}, 1fr)`, gap: '1px', flex: 1 }}>
              {monthDaysArray.map((monthDays, i) => {
                const absoluteMonthIdx = monthOffset + i;
                return (
                  <div key={absoluteMonthIdx} style={{ gridColumn: `span ${monthDays}`, fontSize: '10px', color: 'var(--text-muted)', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{new Date(selectedYear, absoluteMonthIdx).toLocaleString('default', { month: 'short' })}</span>
                    {monthLeaveCounts[absoluteMonthIdx] > 0 && (
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px', fontSize: '8px', color: 'var(--text-primary)' }}>
                        {monthLeaveCounts[absoluteMonthIdx]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Employee Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 16px 16px 16px' }}>
            {filteredEmps.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--text-muted)' }}>No employees found.</div>
            ) : filteredEmps.map((emp, idx) => (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'flex-start', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', padding: '6px 4px', borderRadius: '6px' }}>
                <div style={{ width: '160px', flexShrink: 0, fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '10px', height: '6px', marginTop: '2px' }} title={emp.name}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
                  <span style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, color: 'var(--text-primary)' }}>{empLeaveCounts[emp.id] || 0}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '2px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInYear.length}, 1fr)`, gap: '1px' }}>
                    {daysInYear.map(day => {
                      const dStr = dateStrLocal(day);
                      const lType = leaveMap[emp.id]?.[dStr];
                      const isAltMonth = day.getMonth() % 2 === 1;
                      let sqClass = isAltMonth ? 'sq-empty-alt' : 'sq-empty';
                      if (lType === 'annual') sqClass = 'sq-annual';
                      else if (lType === 'sick') sqClass = 'sq-sick';
                      else if (lType === 'casual') sqClass = 'sq-casual';
                      
                      return (
                        <div 
                          key={dStr} 
                          className={`overview-sq ${sqClass}`} 
                          title={`${dStr}${lType ? ` - ${lType}` : ''}`}
                        ></div>
                      )
                    })}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInYear.length}, 1fr)`, gap: '1px' }}>
                    {monthDaysArray.map((monthDays, i) => {
                      const absoluteMonthIdx = monthOffset + i;
                      const stats = empMonthStats[emp.id][absoluteMonthIdx];
                      return (
                        <div key={absoluteMonthIdx} style={{ gridColumn: `span ${monthDays}`, display: 'flex', alignItems: 'center', gap: '3px', fontSize: '7px', color: 'var(--text-muted)', overflow: 'hidden' }}>
                          {stats.total > 0 && (
                            <>
                              <span style={{ fontWeight: 600 }}>{stats.total}</span>
                              <div style={{ display: 'flex', gap: '1px' }}>
                                {stats.annual > 0 && <span style={{ color: '#a78bfa' }}>●{stats.annual}</span>}
                                {stats.sick > 0 && <span style={{ color: '#f472b6' }}>●{stats.sick}</span>}
                                {stats.casual > 0 && <span style={{ color: '#34d399' }}>●{stats.casual}</span>}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────
   ManageLeaveTypes
───────────────────────────────────────────────────── */
export function ManageLeaveTypes({ leaveTypes, setLeaveTypes }) {
  const [modal, setModal] = useState(null); // null | 'add' | lt object
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    color: '#7c3aed',
    description: '',
    status: 'active',
    notice_days_required: 0,
    max_consecutive_days: 0,
    doc_required_after_days: 0,
    carry_forward_max_days: 0,
    min_service_days_required: 0,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setForm({ 
      name: '', 
      code: '', 
      color: '#7c3aed', 
      description: '', 
      status: 'active',
      notice_days_required: 0,
      max_consecutive_days: 0,
      doc_required_after_days: 0,
      carry_forward_max_days: 0,
      min_service_days_required: 0,
    });
    setError('');
    setModal('add');
  };

  const openEdit = (lt) => {
    setForm({ 
      ...lt,
      notice_days_required: lt.notice_days_required ?? 0,
      max_consecutive_days: lt.max_consecutive_days ?? 0,
      doc_required_after_days: lt.doc_required_after_days ?? 0,
      carry_forward_max_days: lt.carry_forward_max_days ?? 0,
      min_service_days_required: lt.min_service_days_required ?? 0,
    });
    setError('');
    setModal(lt);
  };

  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Leave type name is required');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      if (modal === 'add') {
        const created = await api.addLeaveType(form);
        setLeaveTypes(prev => [...prev, created]);
        showToast('Leave type created successfully');
      } else {
        const updated = await api.updateLeaveType(modal.id, form);
        setLeaveTypes(prev => prev.map(lt => lt.id === modal.id ? updated : lt));
        showToast('Leave type updated successfully');
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the leave type "${name}"?`)) return;
    try {
      await api.deleteLeaveType(id);
      setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
      showToast('Leave type deleted successfully', 'danger');
    } catch (err) {
      alert(err.message || 'Failed to delete leave type');
    }
  };

  const filtered = leaveTypes.filter(lt => {
    const q = search.toLowerCase();
    return !q || lt.name.toLowerCase().includes(q) || (lt.code || '').toLowerCase().includes(q);
  });

  return (
    <div className="admin-content">
      {/* Top Controls */}
      <div className="controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div className="admin-search-box" style={{ flex: 1, maxWidth: '400px' }}>
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search leave types by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ gap: '6px', whiteSpace: 'nowrap' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Leave Type
        </button>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>Code</th>
              <th>Color Tag</th>
              <th>Policy Rules</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No leave types found</td></tr>
            ) : filtered.map(lt => (
              <tr key={lt.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: lt.color || '#7c3aed' }}></span>
                    {lt.name}
                  </div>
                </td>
                <td><code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{lt.code}</code></td>
                <td>
                  <span style={{ background: lt.color || '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px' }}>
                    {lt.color || '#7c3aed'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      📅 Notice: <strong style={{ color: (lt.notice_days_required > 0) ? '#60a5fa' : 'var(--text-muted)' }}>{lt.notice_days_required > 0 ? `${lt.notice_days_required}d advance` : '0d (Immediate)'}</strong>
                    </span>
                    {lt.max_consecutive_days > 0 && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        ⏱️ Max: <strong style={{ color: '#fbbf24' }}>{lt.max_consecutive_days} consecutive days</strong>
                      </span>
                    )}
                    {lt.doc_required_after_days > 0 && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        📄 Doc: <strong style={{ color: '#34d399' }}>After {lt.doc_required_after_days} days</strong>
                      </span>
                    )}
                    {lt.carry_forward_max_days > 0 && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        🔄 Carry: <strong style={{ color: '#c084fc' }}>Max {lt.carry_forward_max_days}d</strong>
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '250px' }}>{lt.description || '—'}</td>
                <td>
                  <span className={`badge badge-${lt.status === 'active' ? 'approved' : 'rejected'}`}>
                    {lt.status}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" onClick={() => openEdit(lt)} title="Edit Leave Type">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(lt.id, lt.name)} title="Delete Leave Type">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Leave Type' : 'Edit Leave Type'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                  <div style={{ color: '#ff5252', fontSize: '13px', background: 'rgba(255,82,82,0.1)', padding: '10px 14px', borderRadius: '8px' }}>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Leave Type Name <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    placeholder="e.g. Maternity Leave, Paternity Leave"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>

                {modal === 'add' && (
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      System Code (Optional)
                    </label>
                    <input
                      type="text"
                      className="admin-filter-select"
                      style={{ width: '100%' }}
                      placeholder="e.g. maternity (Auto-generated if empty)"
                      value={form.code}
                      onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    />
                  </div>
                )}


                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Badge Color
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                      style={{ width: '48px', height: '38px', padding: '2px', cursor: 'pointer', borderRadius: '6px', background: 'none', border: '1px solid var(--bg-card-border)' }}
                    />
                    <input
                      type="text"
                      className="admin-filter-select"
                      value={form.color}
                      onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* ── Policy Rules & Thresholds ── */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚙️</span>
                    <span>Company Policy Rules & Thresholds</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Advance Notice (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="admin-filter-select"
                        style={{ width: '100%' }}
                        value={form.notice_days_required}
                        onChange={e => setForm(p => ({ ...p, notice_days_required: e.target.value }))}
                      />
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 = Immediate (e.g. Sick)</small>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Max Consecutive Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="admin-filter-select"
                        style={{ width: '100%' }}
                        value={form.max_consecutive_days}
                        onChange={e => setForm(p => ({ ...p, max_consecutive_days: e.target.value }))}
                      />
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>0 = No upper limit</small>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Doc Required After (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="admin-filter-select"
                        style={{ width: '100%' }}
                        value={form.doc_required_after_days}
                        onChange={e => setForm(p => ({ ...p, doc_required_after_days: e.target.value }))}
                      />
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>e.g. Medical certificate</small>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Carry Forward Limit (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="admin-filter-select"
                        style={{ width: '100%' }}
                        value={form.carry_forward_max_days}
                        onChange={e => setForm(p => ({ ...p, carry_forward_max_days: e.target.value }))}
                      />
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Roll over to next year</small>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    className="admin-filter-select"
                    style={{ width: '100%', minHeight: '80px', fontFamily: 'inherit' }}
                    rows={3}
                    placeholder="Brief description of this leave policy..."
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modal === 'add' ? 'Create Leave Type' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ManageLeaveProfiles
───────────────────────────────────────────────────── */
export function ManageLeaveProfiles({ leaveProfiles = [], setLeaveProfiles = () => {}, leaveTypes = [] }) {
  const [modal, setModal] = useState(null); // null | 'add' | profile object
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    entitlements: {},
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Use real leave types from database
  const effectiveLeaveTypes = Array.isArray(leaveTypes) ? leaveTypes : [];

  const openAdd = () => {
    const initialEntitlements = {};
    effectiveLeaveTypes.forEach(lt => {
      initialEntitlements[lt.code] = 0;
    });

    setForm({
      name: '',
      code: '',
      description: '',
      status: 'active',
      entitlements: initialEntitlements,
    });
    setError('');
    setModal('add');
  };

  const openEdit = (profile) => {
    const currentEntitlements = {};
    effectiveLeaveTypes.forEach(lt => {
      const savedVal = profile.entitlements?.[lt.code] ?? profile.entitlements?.[lt.id];
      currentEntitlements[lt.code] = savedVal !== undefined ? Number(savedVal) : 0;
    });

    setForm({
      id: profile.id,
      name: profile.name,
      code: profile.code,
      description: profile.description || '',
      status: profile.status || 'active',
      entitlements: currentEntitlements,
    });
    setError('');
    setModal(profile);
  };

  const closeModal = () => {
    setModal(null);
    setError('');
  };

  const handleNameChange = (val) => {
    setForm(prev => {
      const updated = { ...prev, name: val };
      const autoCode = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (modal === 'add' && (!prev.code || prev.code === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))) {
        updated.code = autoCode;
      }
      return updated;
    });
  };

  const handleDaysChange = (code, rawVal) => {
    const num = Math.max(0, parseInt(rawVal, 10) || 0);
    setForm(prev => ({
      ...prev,
      entitlements: {
        ...prev.entitlements,
        [code]: num
      }
    }));
  };

  const stepDays = (code, delta) => {
    setForm(prev => {
      const current = Number(prev.entitlements[code]) || 0;
      const next = Math.max(0, current + delta);
      return {
        ...prev,
        entitlements: {
          ...prev.entitlements,
          [code]: next
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Profile name is required');
      return;
    }
    const finalCode = form.code.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!finalCode) {
      setError('A valid profile code is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      code: finalCode,
      description: form.description.trim(),
      status: form.status,
      entitlements: form.entitlements,
    };

    try {
      if (modal === 'add') {
        const created = await api.addLeaveProfile(payload);
        setLeaveProfiles(prev => [...prev, created]);
        showToast('Leave profile created successfully');
      } else {
        const updated = await api.updateLeaveProfile(modal.id, payload);
        setLeaveProfiles(prev => prev.map(p => p.id === modal.id ? updated : p));
        showToast('Leave profile updated successfully');
      }
      closeModal();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete profile "${name}"?`)) return;
    try {
      await api.deleteLeaveProfile(id);
      setLeaveProfiles(prev => prev.filter(p => p.id !== id));
      showToast('Leave profile deleted successfully', 'danger');
    } catch (err) {
      alert(err.message || 'Failed to delete leave profile');
    }
  };

  const filtered = leaveProfiles.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  const totalConfiguredDays = Object.values(form.entitlements || {}).reduce((s, d) => s + (Number(d) || 0), 0);

  return (
    <div className="admin-content">
      {/* Stats bar */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{leaveProfiles.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Leave Profiles</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {leaveProfiles.filter(p => p.status === 'active').length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Profiles</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {effectiveLeaveTypes.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Available Leave Types</div>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div className="admin-search-box" style={{ flex: 1, maxWidth: '400px' }}>
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search profiles by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ gap: '6px', whiteSpace: 'nowrap' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Leave Profile
        </button>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Profile Name & Code</th>
              <th>Description</th>
              <th>Configured Leave Entitlements</th>
              <th>Total Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  {search ? 'No leave profiles matching search' : 'No leave profiles created yet. Click "Create Leave Profile" to get started.'}
                </td>
              </tr>
            ) : filtered.map(p => {
              const totalDays = Object.values(p.entitlements || {}).reduce((s, v) => s + (Number(v) || 0), 0);
              const unconfiguredCount = effectiveLeaveTypes.filter(lt => {
                return p.entitlements?.[lt.code] === undefined && p.entitlements?.[lt.id] === undefined;
              }).length;

              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {p.name}
                    </div>
                    <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      {p.code}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '240px' }}>
                    {p.description || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {effectiveLeaveTypes.map(lt => {
                        const days = p.entitlements?.[lt.code] ?? p.entitlements?.[lt.id];
                        if (days === undefined) return null;
                        return (
                          <span key={lt.id || lt.code} className="profile-entitlement-chip">
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: lt.color || '#7c3aed' }}></span>
                            <span>{lt.name}:</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{days}d</strong>
                          </span>
                        );
                      })}
                      {unconfiguredCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          style={{
                            border: '1px dashed color-mix(in srgb, var(--accent) 50%, transparent)',
                            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                            color: 'var(--accent-light)',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="New leave types were added to the system. Click to configure their days for this profile."
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                          </svg>
                          +{unconfiguredCount} new {unconfiguredCount === 1 ? 'type' : 'types'} to set
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-light)' }}>
                      {totalDays} days/yr
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${p.status === 'active' ? 'approved' : 'rejected'}`}>
                      {p.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => openEdit(p)} title="Edit Profile & Leave Days">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(p.id, p.name)} title="Delete Profile">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{modal === 'add' ? 'Create Leave Profile' : 'Edit Leave Profile'}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {modal === 'add' 
                    ? 'Define a leave package and configure allocated days for each leave type'
                    : 'Modify profile details and adjust days allocated for existing or newly added leave types'}
                </p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', marginBottom: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                  </div>
                )}

                <div className="field-row">
                  <div className="field" style={{ flex: 1 }}>
                    <label>Profile Name *</label>
                    <input
                      placeholder="e.g. Full-Time Staff, Executive, Probation"
                      value={form.name}
                      onChange={e => handleNameChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Profile Code *</label>
                    <input
                      placeholder="e.g. full_time_staff"
                      value={form.code}
                      onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field" style={{ flex: 2 }}>
                    <label>Description</label>
                    <input
                      placeholder="Brief notes or applicability guidelines"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Status</label>
                    <select
                      className="admin-filter-select"
                      style={{ width: '100%' }}
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Leave Days Configuration Section */}
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--bg-card-border)' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Leave Days per Leave Type
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Configure the annual allowed days for each available leave type below. If new leave types were added to the system, they appear here ready to configure.
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {effectiveLeaveTypes.length === 0 ? (
                      <div style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        border: '1px dashed var(--bg-card-border)',
                        color: 'var(--text-muted)',
                        fontSize: '13px'
                      }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          No Leave Types Found in Database
                        </p>
                        <span>
                          Please add leave types first under <strong>Leave Configuration &gt; Manage Leave Types</strong>. Once added, they will appear here automatically.
                        </span>
                      </div>
                    ) : (
                      effectiveLeaveTypes.map(lt => {
                        const isNewType = modal !== 'add' && modal?.entitlements && modal.entitlements[lt.code] === undefined && modal.entitlements[lt.id] === undefined;
                        const currentDays = form.entitlements[lt.code] ?? 0;

                        return (
                          <div key={lt.id || lt.code} className={`profile-leave-card ${isNewType ? 'is-new-type' : ''}`}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: lt.color || '#7c3aed', flexShrink: 0 }}></span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {lt.name}
                                {isNewType && (
                                  <span className="profile-new-badge" title="This leave type was added to the system after this profile was created">
                                    New Leave Type
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Code: <code>{lt.code}</code> {lt.description ? `• ${lt.description}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => stepDays(lt.code, -1)}
                              style={{
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                border: '1px solid var(--bg-card-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '14px'
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={currentDays}
                              onChange={e => handleDaysChange(lt.code, e.target.value)}
                              style={{
                                width: '64px',
                                textAlign: 'center',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--bg-card-border)',
                                color: 'var(--text-primary)',
                                fontWeight: 600
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => stepDays(lt.code, 1)}
                              style={{
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                border: '1px solid var(--bg-card-border)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '14px'
                              }}
                            >
                              +
                            </button>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '32px' }}>days</span>
                          </div>
                        </div>
                      );
                    }))}
                  </div>

                  {/* Total Entitlement Preview */}
                  <div className="leave-total-preview" style={{ marginTop: '16px' }}>
                    <span>Total Annual Leave Entitlement</span>
                    <span className="leave-total-value">{totalConfiguredDays} days / year</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-card-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modal === 'add' ? 'Create Leave Profile' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ManageBranchHolidays: Regional & Statutory Holiday Calendar Management
// =============================================================================
export function ManageBranchHolidays({ branches = [] }) {
  const [holidays, setHolidays] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'add' | holiday object
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const EMPTY_FORM = {
    branch_id: branches[0]?.id || '',
    holiday_date: '',
    name: '',
    holiday_type: 'public'
  };
  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const params = selectedBranch !== 'all' ? { branch_id: selectedBranch } : {};
      const data = await api.getHolidays(params);
      setHolidays(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load holidays:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [selectedBranch]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      branch_id: selectedBranch !== 'all' ? selectedBranch : branches[0]?.id || ''
    });
    setModal('add');
  };

  const openEdit = (h) => {
    setForm({
      id: h.id,
      branch_id: h.branch_id,
      holiday_date: h.holiday_date,
      name: h.name,
      holiday_type: h.holiday_type || 'public'
    });
    setModal(h);
  };

  const closeModal = () => {
    setModal(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.holiday_date || !form.branch_id) {
      alert('Please fill in all required fields (Branch, Date, Name)');
      return;
    }

    try {
      setIsSubmitting(true);
      if (modal === 'add') {
        const created = await api.addHoliday(form);
        const branchName = branches.find(b => b.id === form.branch_id)?.name || '';
        setHolidays(prev => [...prev, { ...created, branch_name: branchName }]);
        showToast('Branch holiday added successfully');
      } else {
        const updated = await api.updateHoliday(modal.id, form);
        const branchName = branches.find(b => b.id === form.branch_id)?.name || '';
        setHolidays(prev => prev.map(h => h.id === modal.id ? { ...updated, branch_name: branchName } : h));
        showToast('Holiday updated successfully');
      }
      setIsSubmitting(false);
      closeModal();
    } catch (err) {
      setIsSubmitting(false);
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this holiday?')) return;
    try {
      await api.deleteHoliday(id);
      setHolidays(prev => prev.filter(h => h.id !== id));
      showToast('Holiday removed', 'danger');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filteredHolidays = holidays.filter(h => {
    const q = search.toLowerCase();
    return !q || h.name.toLowerCase().includes(q) || h.holiday_date.includes(q) || (h.branch_name || '').toLowerCase().includes(q);
  });

  const publicCount = holidays.filter(h => h.holiday_type === 'public').length;
  const mercantileCount = holidays.filter(h => h.holiday_type === 'mercantile').length;
  const bankCount = holidays.filter(h => h.holiday_type === 'bank').length;

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h2>Branch Public & Mercantile Holidays</h2>
          <p>Configure regional and statutory holidays per branch to automatically exclude them from employee leave deductions.</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={selectedBranch} 
            onChange={e => setSelectedBranch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--bg-card-border)',
              fontSize: '13px'
            }}
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Holiday
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="profile-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="profile-stat-card">
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{holidays.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Branch Holidays</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{publicCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Public Holidays</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{mercantileCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mercantile Holidays</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{bankCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bank Holidays</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              placeholder="Search holidays by name or date..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Branch</th>
              <th>Holiday Date</th>
              <th>Holiday Name</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading holidays...</td></tr>
            ) : filteredHolidays.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No branch holidays found. Click "Add Holiday" to register official off-days.</td></tr>
            ) : filteredHolidays.map(h => (
              <tr key={h.id}>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.branch_name || 'All'}</span>
                </td>
                <td>
                  <span style={{ fontFamily: 'monospace', color: 'var(--accent-light)', fontWeight: 600 }}>
                    {h.holiday_date}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{h.name}</span>
                </td>
                <td>
                  <span className={`badge badge-${h.holiday_type || 'public'}`} style={{ textTransform: 'capitalize' }}>
                    {h.holiday_type || 'Public'}
                  </span>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" onClick={() => openEdit(h)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(h.id)}>
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
              <h3>{modal === 'add' ? 'Add Branch Holiday' : 'Edit Branch Holiday'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="field">
                  <label>Branch *</label>
                  <select 
                    value={form.branch_id} 
                    onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.location || 'Local'})</option>
                    ))}
                  </select>
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>Holiday Date *</label>
                    <input 
                      type="date" 
                      value={form.holiday_date} 
                      onChange={e => setForm(p => ({ ...p, holiday_date: e.target.value }))} 
                      required 
                    />
                  </div>
                  <div className="field">
                    <label>Holiday Type *</label>
                    <select 
                      value={form.holiday_type} 
                      onChange={e => setForm(p => ({ ...p, holiday_type: e.target.value }))}
                    >
                      <option value="public">National / Public Holiday</option>
                      <option value="mercantile">Mercantile / Commercial</option>
                      <option value="bank">Bank Holiday Only</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Holiday Name *</label>
                  <input 
                    placeholder="e.g. Duruthu Full Moon Poya Day" 
                    value={form.name} 
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modal === 'add' ? 'Add Holiday' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}