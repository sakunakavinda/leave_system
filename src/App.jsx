import { useState, useEffect } from 'react'
import './App.css'
import './admin/admin.css'
import LeaveList from './LeaveList.jsx'
import LeaveOverview from './LeaveOverview.jsx'
import SubstitutionsList from './SubstitutionsList.jsx'
import { api } from './api.js'
import { applyTheme } from './admin/theme.js'

const getMinLeaveDate = () => {
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 3)
  const year = minDate.getFullYear()
  const month = String(minDate.getMonth() + 1).padStart(2, '0')
  const day = String(minDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App() {
  const [page, setPage] = useState('form') // 'form' | 'list' | 'substitutions'
  const [formData, setFormData] = useState({
    secretCode: '',
    leaveDates: [getMinLeaveDate()],
    returningDate: '',
    substitute_employee_id: '',
    leave_type: 'annual',
  })

  const [branches, setBranches] = useState([])
  const [roles, setRoles] = useState([])
  const [employees, setEmployees] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [brs, rls, emps, apps, sysSettings, lTypes] = await Promise.all([
          api.getBranches(),
          api.getRoles(),
          api.getEmployees(),
          api.getApplications(),
          api.getSettings().catch(() => ({})),
          api.getLeaveTypes().catch(() => [])
        ]);
        setBranches(brs);
        setRoles(rls);
        setEmployees(emps);
        setSubmissions(apps);
        setSettings(sysSettings);
        setLeaveTypes(lTypes);
        if (sysSettings.theme_color) {
          applyTheme(sysSettings.theme_color, 'primary');
        }
        if (sysSettings.theme_color_secondary) {
          applyTheme(sysSettings.theme_color_secondary, 'secondary');
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

  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [error, setError] = useState('')
  const [subBranchFilter, setSubBranchFilter] = useState('all')

  // Substitution agreement modal state
  const [agreeModal, setAgreeModal] = useState(null) // { submission, secretCode, error }
  const [verifiedApplicant, setVerifiedApplicant] = useState(null)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [deductionPreview, setDeductionPreview] = useState(null)
  const [calculatingDeduction, setCalculatingDeduction] = useState(false)
  const [candidateSubstitutes, setCandidateSubstitutes] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  // Verify secret code dynamically
  useEffect(() => {
    const code = formData.secretCode?.trim();
    if (!code || code.length < 3) {
      setVerifiedApplicant(null);
      setCodeError('');
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setVerifyingCode(true);
        setCodeError('');
        const res = await api.verifyEmployeeCode(code);
        if (isMounted) {
          setVerifiedApplicant(res.employee);
        }
      } catch (err) {
        if (isMounted) {
          setVerifiedApplicant(null);
          setCodeError(err.message || 'Invalid secret code');
        }
      } finally {
        if (isMounted) setVerifyingCode(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.secretCode]);

  // Live calculation preview of leave deduction based on branch holidays & schedules
  useEffect(() => {
    const validDates = formData.leaveDates.filter(d => d);
    if (!verifiedApplicant || validDates.length === 0) {
      setDeductionPreview(null);
      return;
    }

    let isMounted = true;
    setCalculatingDeduction(true);
    api.calculateDeduction(verifiedApplicant.branch_id, validDates, verifiedApplicant.id)
      .then(res => {
        if (isMounted) setDeductionPreview(res);
      })
      .catch(() => {
        if (isMounted) setDeductionPreview(null);
      })
      .finally(() => {
        if (isMounted) setCalculatingDeduction(false);
      });

    return () => { isMounted = false; };
  }, [verifiedApplicant, formData.leaveDates]);

  useEffect(() => {
    const validDates = formData.leaveDates.filter(d => d);
    if (validDates.length > 0) {
      const maxDateStr = validDates.reduce((max, current) => current > max ? current : max, validDates[0]);
      const maxDate = new Date(maxDateStr);
      maxDate.setDate(maxDate.getDate() + 1);
      
      const year = maxDate.getFullYear();
      const month = String(maxDate.getMonth() + 1).padStart(2, '0');
      const day = String(maxDate.getDate()).padStart(2, '0');
      const nextDayStr = `${year}-${month}-${day}`;
      
      setFormData(prev => prev.returningDate !== nextDayStr ? { ...prev, returningDate: nextDayStr } : prev);
    } else {
      setFormData(prev => prev.returningDate !== '' ? { ...prev, returningDate: '' } : prev);
    }
  }, [formData.leaveDates]);

  const showToastMsg = (msg) => {
    setToastMsg(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLeaveDateChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.leaveDates]
      updated[index] = value
      return { ...prev, leaveDates: updated }
    })
  }

  const addLeaveDate = () => {
    setFormData((prev) => ({
      ...prev,
      leaveDates: [...prev.leaveDates, getMinLeaveDate()],
    }))
  }

  const removeLeaveDate = (index) => {
    setFormData((prev) => ({
      ...prev,
      leaveDates: prev.leaveDates.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!applicant) {
      setError('Invalid secret code. Please enter your correct secret code.')
      return
    }

    // Dynamic Leave Type Policy Validations
    const selectedLt = leaveTypes?.find(lt => lt.code === formData.leave_type) || {};
    const noticeDays = selectedLt.notice_days_required !== undefined ? parseInt(selectedLt.notice_days_required) : (formData.leave_type === 'annual' ? 3 : 0);
    const maxConsec = parseInt(selectedLt.max_consecutive_days) || 0;

    // Advance notice validation
    if (noticeDays > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + noticeDays);

      for (let dateStr of formData.leaveDates) {
        if (!dateStr) continue;
        const [y, m, d] = dateStr.split('-').map(Number);
        const leaveDate = new Date(y, m - 1, d);
        leaveDate.setHours(0, 0, 0, 0);
        if (leaveDate < minDate) {
          setError(`${selectedLt.name || formData.leave_type} requires at least ${noticeDays} day(s) advance notice according to company policy.`);
          return;
        }
      }
    }

    // Max consecutive days validation
    const validDatesList = formData.leaveDates.filter(Boolean);
    if (maxConsec > 0 && validDatesList.length > maxConsec) {
      setError(`${selectedLt.name || formData.leave_type} allows a maximum of ${maxConsec} consecutive day(s) per application according to company policy.`);
      return;
    }

    // Minimum service tenure / probation check
    const minServiceDays = parseInt(selectedLt.min_service_days_required) || 0;
    if (minServiceDays > 0 && applicant.joined_date) {
      const [jy, jm, jd] = applicant.joined_date.split('T')[0].split('-').map(Number);
      const joinedDate = new Date(jy, jm - 1, jd);
      joinedDate.setHours(0, 0, 0, 0);

      const sortedDates = [...validDatesList].sort();
      if (sortedDates.length > 0) {
        const [ly, lm, ld] = sortedDates[0].split('-').map(Number);
        const firstLeaveDate = new Date(ly, lm - 1, ld);
        firstLeaveDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((firstLeaveDate - joinedDate) / (1000 * 60 * 60 * 24));
        if (diffDays < minServiceDays) {
          setError(
            `${selectedLt.name || formData.leave_type} requires at least ${minServiceDays} days of service / probation completion. You have served ${Math.max(0, diffDays)} day(s) since joining on ${applicant.joined_date.split('T')[0]}.`
          );
          return;
        }
      }
    }

    setError('')

    try {
      const payload = {
        secretCode: formData.secretCode,
        leaveDates: formData.leaveDates.filter(d => d),
        returningDate: formData.returningDate,
        substitute_employee_id: formData.substitute_employee_id,
        leave_type: formData.leave_type,
        appliedDate: new Date().toISOString().split('T')[0],
      };
      
      await api.addApplication(payload);
      
      showToastMsg('Leave application submitted successfully!')

      // Refresh applications
      const apps = await api.getApplications();
      setSubmissions(apps);
      
      // Reset form
      setFormData({
        secretCode: '',
        leaveDates: [getMinLeaveDate()],
        returningDate: '',
        substitute_employee_id: '',
        leave_type: 'annual',
      })
    } catch (err) {
      setError(err.message || 'Failed to submit application.');
    }
  }

  const handleAgreeSubstitution = (submission) => {
    setAgreeModal({ submission, secretCode: '', error: '' })
  }

  const confirmAgreement = async () => {
    const modal = agreeModal
    if (!modal) return

    try {
      await api.confirmApplication(modal.submission.id, modal.secretCode);
      
      showToastMsg(`Substitution confirmed!`)
      
      // Refresh applications
      const apps = await api.getApplications();
      setSubmissions(apps);
      setAgreeModal(null)
    } catch (err) {
      setAgreeModal({ ...modal, error: err.message || 'Failed to confirm substitution.' })
    }
  }

  const applicant = verifiedApplicant || employees.find(e => e.secretCode === formData.secretCode);

  // Evaluate candidate substitutes with Fatigue Protection Guard (< 11 hours rest interval)
  useEffect(() => {
    if (!applicant || !applicant.branch_id || !applicant.role_id) {
      setCandidateSubstitutes([]);
      return;
    }
    const cleanDates = formData.leaveDates.filter(Boolean);
    let isMounted = true;
    setLoadingCandidates(true);
    api.getAvailableSubstitutes({
      applicant_id: applicant.id,
      branch_id: applicant.branch_id,
      role_id: applicant.role_id,
      leave_dates: cleanDates
    })
      .then(res => {
        if (isMounted) setCandidateSubstitutes(res);
      })
      .catch(() => {
        if (isMounted) setCandidateSubstitutes([]);
      })
      .finally(() => {
        if (isMounted) setLoadingCandidates(false);
      });

    return () => { isMounted = false; };
  }, [applicant?.id, applicant?.branch_id, applicant?.role_id, formData.leaveDates]);

  const availableSubstitutes = candidateSubstitutes.length > 0 
    ? candidateSubstitutes 
    : (applicant 
      ? employees.filter(e => {
          if (e.branch_id !== applicant.branch_id || e.role_id !== applicant.role_id || e.id === applicant.id || e.status !== 'active') {
            return false;
          }
          const hasLeaveOverlap = submissions.some(sub => 
            sub.employee_id === e.id && 
            ['pending', 'approved'].includes(sub.status) &&
            sub.leaveDates.some(d => formData.leaveDates.includes(d))
          );
          const hasSubOverlap = submissions.some(sub => 
            sub.substitute_employee_id === e.id && 
            ['pending', 'approved'].includes(sub.status) &&
            sub.leaveDates.some(d => formData.leaveDates.includes(d))
          );
          return !hasLeaveOverlap && !hasSubOverlap;
        }).map(e => ({ ...e, isAvailable: true }))
      : []);

  const pendingSubstitutions = applicant ? submissions.filter(s => !s.substituteConfirmed && s.substitute_employee_id === applicant.id) : []

  return (
    <>
      {page === 'list' ? (
        <LeaveList onBack={() => setPage('form')} submissions={submissions} employees={employees} branches={branches} roles={roles} applicant={applicant} />
      ) : page === 'substitutions' ? (
        <SubstitutionsList onBack={() => setPage('form')} onAgree={handleAgreeSubstitution} submissions={submissions} employees={employees} branches={branches} roles={roles} applicant={applicant} />
      ) : page === 'overview' ? (
        <LeaveOverview onBack={() => setPage('form')} secretCode={formData.secretCode} />
      ) : (
        <div className="leave-page">
          <div className="leave-card">
        {/* ── Header ── */}
        <header className="leave-header">
          <div className="leave-header-top">
            {/* Left spacer to balance the layout */}
            <div className="header-spacer" />

            {/* Centered logo with neon running border */}
            <div className="leave-logo-wrap">
              {settings.company_logo ? (
                <img src={settings.company_logo} alt="Company Logo" className="leave-header-icon" style={{ objectFit: 'contain', background: 'transparent', padding: '0' }} />
              ) : (
                <div className="leave-header-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div className="header-nav-btns">
              <button
                type="button"
                className="view-list-btn"
                id="view-overview-btn"
                onClick={() => {
                  if (!applicant) {
                    setError('Please enter your valid secret code first to view your overview.');
                  } else {
                    setError('');
                    setPage('overview');
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                My Overview
              </button>
              <button
                type="button"
                className="view-list-btn"
                id="view-applications-btn"
                onClick={() => {
                  if (!applicant) {
                    setError('Please enter your valid secret code first to view your applications.');
                  } else {
                    setError('');
                    setPage('list');
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                View Applications
              </button>
              <button
                type="button"
                className="admin-panel-btn"
                id="view-substitutions-btn"
                onClick={() => {
                  if (!applicant) {
                    setError('Please enter your valid secret code first to view your substitutions.');
                  } else {
                    setError('');
                    setPage(page === 'substitutions' ? 'form' : 'substitutions');
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {page === 'substitutions' ? 'Close Substitutions' : 'Substitutions'}
              </button>
            </div>
          </div>
          <h1>Leave Application</h1>
          <p>Fill in the details below to submit your leave request</p>
        </header>

          {/* ── Leave Application Form ── */}
          <form className="leave-form" id="leave-application-form" onSubmit={handleSubmit}>
            
            {/* Row 1: Secret Code */}
            <div className="form-group">
              <label htmlFor="secretCode">
                Employee Secret Code <span className="required">*</span>
              </label>
                <input
                type="password"
                id="secretCode"
                name="secretCode"
                placeholder="••••••••"
                value={formData.secretCode}
                onChange={handleChange}
                required
              />
              {verifyingCode && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                  Verifying code...
                </div>
              )}
              {applicant && !verifyingCode && (
                <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Verified: <strong>{applicant.name}</strong> • {branches.find(b => b.id === applicant.branch_id)?.name || 'Branch'}</span>
                </div>
              )}
              {codeError && !verifyingCode && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#ef4444' }}>
                  {codeError}
                </div>
              )}
            </div>
            {/* Leave Type */}
            <div className="form-group full-width">
              <label htmlFor="leave_type">
                Leave Type <span className="required">*</span>
              </label>
              <select
                id="leave_type"
                name="leave_type"
                value={formData.leave_type}
                onChange={handleChange}
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
                    <option value="unpaid">Loss of Pay (Unpaid Leave)</option>
                  </>
                )}
              </select>
              {(() => {
                const currentLt = leaveTypes?.find(lt => lt.code === formData.leave_type);
                if (!currentLt) return null;
                return (
                  <div style={{ marginTop: '7px', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <span>📅 Notice: <strong style={{ color: (currentLt.notice_days_required > 0) ? '#38bdf8' : '#34d399' }}>{currentLt.notice_days_required > 0 ? `${currentLt.notice_days_required} days advance` : 'Immediate (0 days)'}</strong></span>
                    {currentLt.max_consecutive_days > 0 && (
                      <span>⏱️ Max consecutive: <strong style={{ color: '#fbbf24' }}>{currentLt.max_consecutive_days} days</strong></span>
                    )}
                    {currentLt.min_service_days_required > 0 && (
                      <span>⏳ Min service: <strong style={{ color: '#f59e0b' }}>{currentLt.min_service_days_required} days probation/tenure</strong></span>
                    )}
                    {currentLt.doc_required_after_days > 0 && (
                      <span>📄 Proof doc required: <strong style={{ color: '#a78bfa' }}>After {currentLt.doc_required_after_days} days</strong></span>
                    )}
                  </div>
                );
              })()}
            </div>

            {error && (
              <div className="form-group full-width" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                <div style={{ color: '#ff5252', fontSize: '13px', background: 'rgba(255,82,82,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,82,82,0.2)' }}>
                  {error}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="form-divider" style={{ marginTop: '16px' }}>
              <span>Leave Details</span>
            </div>

            {/* Row 2: Leave Dates (multiple) & Returning Date */}
            <div className="form-group full-width">
              <label>
                Leave Dates <span className="required">*</span>
              </label>
              <div className="leave-dates-list">
                {formData.leaveDates.map((ld, idx) => (
                  <div className="leave-date-row" key={idx}>
                    <input
                      type="date"
                      id={`leaveDate-${idx}`}
                      value={ld}
                      onChange={(e) => handleLeaveDateChange(idx, e.target.value)}
                      required
                    />
                    {formData.leaveDates.length > 1 && (
                      <button
                        type="button"
                        className="remove-date-btn"
                        onClick={() => removeLeaveDate(idx)}
                        aria-label="Remove this leave date"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="add-date-btn"
                  onClick={addLeaveDate}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add another date
                </button>
              </div>

              {/* Live Holiday & Working Day Deduction Preview */}
              {deductionPreview && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: deductionPreview.breakdown.some(b => !b.isWorkingDay) ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                  border: `1px solid ${deductionPreview.breakdown.some(b => !b.isWorkingDay) ? 'rgba(16, 185, 129, 0.28)' : 'rgba(59, 130, 246, 0.25)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                      Deduction: <span style={{ color: '#10b981', fontSize: '14.5px' }}>{deductionPreview.netWorkingDaysDeducted} working day{deductionPreview.netWorkingDaysDeducted === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                      ({deductionPreview.calendarDaysTotal} calendar day{deductionPreview.calendarDaysTotal === 1 ? '' : 's'} selected)
                    </div>
                  </div>
                  {deductionPreview.breakdown.filter(b => !b.isWorkingDay).length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {deductionPreview.breakdown.filter(b => !b.isWorkingDay).map((item, idx) => (
                        <div key={idx} style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🏖️</span>
                          <span><strong>{item.date}</strong>: {item.reason} — <strong style={{ color: '#34d399' }}>0 days deducted!</strong></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="returningDate">
                Returning Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="returningDate"
                name="returningDate"
                value={formData.returningDate}
                readOnly
                style={{ cursor: 'not-allowed', opacity: 0.7 }}
                required
              />
            </div>

            {/* Row 3: Substitute */}
            <div className="form-group full-width">
              <label htmlFor="substitute_employee_id">
                Substitute <span className="required">*</span>
              </label>
              <select
                id="substitute_employee_id"
                name="substitute_employee_id"
                value={formData.substitute_employee_id}
                onChange={handleChange}
                required
                disabled={!applicant}
              >
                {!applicant ? (
                  <option value="">Please enter your valid secret code first…</option>
                ) : loadingCandidates ? (
                  <option value="">Evaluating candidate peers & fatigue guards…</option>
                ) : (
                  <>
                    <option value="">Select a substitute…</option>
                    {availableSubstitutes.length === 0 ? (
                      <option value="" disabled>No available substitutes in your role and branch</option>
                    ) : (
                      availableSubstitutes.map(e => (
                        <option 
                          key={e.id} 
                          value={e.id} 
                          disabled={e.isAvailable === false}
                        >
                          {e.name} {e.hasFatigueWarning ? '⚠️ (Fatigue Guard Alert)' : ''} {e.isAvailable === false ? `(${e.unavailableReason || 'Unavailable'})` : ''}
                        </option>
                      ))
                    )}
                  </>
                )}
              </select>

              {/* Fatigue Protection Guard Alert */}
              {(() => {
                const selectedCandidate = availableSubstitutes.find(s => s.id === formData.substitute_employee_id);
                if (!selectedCandidate || !selectedCandidate.hasFatigueWarning) return null;
                return (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#fbbf24',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <div>
                      <strong style={{ color: '#fef08a' }}>Fatigue Protection Guard Alert:</strong>
                      <div style={{ marginTop: '2px', color: '#fde68a' }}>{selectedCandidate.fatigueNotice}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Submit */}
            <div className="submit-wrapper full-width">
              <button type="submit" className="submit-btn" id="submit-leave-btn">
                Submit Application
              </button>
            </div>

            {/* ── Conditions ── */}
            <div className="conditions-section full-width">
              <div className="conditions-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Important Conditions
              </div>
              <ol className="conditions-list">
                <li data-num="1.">
                  If the person who took leave fails to report for duty on the designated day, the substitute must perform the duties in their place.
                </li>
              </ol>
            </div>
          </form>
        </div>
      </div>
      )}
      {/* ── Agreement Modal ── */}
      {agreeModal && (
        <div className="modal-backdrop" onClick={() => setAgreeModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Confirm Substitution</h3>
              <button className="modal-close" onClick={() => setAgreeModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ gap: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 8px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{agreeModal.submission.employeeName}</strong> has requested you 
                  (<strong style={{ color: 'var(--text-primary)' }}>{agreeModal.submission.substituteName}</strong>) 
                  to substitute during their leave on <strong style={{ color: 'var(--text-primary)' }}>{agreeModal.submission.leaveDates.join(', ')}</strong>.
                </p>
                <p style={{ margin: '0' }}>Enter your secret code to confirm you agree to this substitution.</p>
              </div>
              <div className="field">
                <label>Your Secret Code</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={agreeModal.secretCode}
                  onChange={e => setAgreeModal(prev => ({ ...prev, secretCode: e.target.value, error: '' }))}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') confirmAgreement() }}
                />
              </div>
              {agreeModal.error && (
                <div style={{ color: '#ff5252', fontSize: '13px', background: 'rgba(255,82,82,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,82,82,0.2)' }}>
                  {agreeModal.error}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setAgreeModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmAgreement}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Confirm Substitution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <div className={`toast ${showToast ? 'show' : ''}`} role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        {toastMsg || 'Leave application submitted successfully!'}
      </div>
    </>
  )
}

export default App