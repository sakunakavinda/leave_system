import { useState, useEffect } from 'react'
import './App.css'
import './admin/admin.css'
import LeaveList from './LeaveList.jsx'
import SubstitutionsList from './SubstitutionsList.jsx'
import { api } from './api.js'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [brs, rls, emps, apps] = await Promise.all([
          api.getBranches(),
          api.getRoles(),
          api.getEmployees(),
          api.getApplications()
        ]);
        setBranches(brs);
        setRoles(rls);
        setEmployees(emps);
        setSubmissions(apps);
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

    // Validate that all leave dates are at least 3 days from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() + 3)

    for (let dateStr of formData.leaveDates) {
      if (!dateStr) continue
      const leaveDate = new Date(dateStr)
      leaveDate.setHours(0, 0, 0, 0)
      if (leaveDate < minDate) {
        setError('Leaves must be applied at least 3 days in advance.')
        return
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

  const applicant = employees.find(e => e.secretCode === formData.secretCode);
  const availableSubstitutes = applicant 
    ? employees.filter(e => e.branch_id === applicant.branch_id && e.role_id === applicant.role_id && e.id !== applicant.id && e.status === 'active')
    : [];

  const pendingSubstitutions = applicant ? submissions.filter(s => !s.substituteConfirmed && s.substitute_employee_id === applicant.id) : []

  if (page === 'list') {
    return <LeaveList onBack={() => setPage('form')} submissions={submissions} employees={employees} branches={branches} roles={roles} applicant={applicant} />
  }

  return (
    <div className="leave-page">
      <div className="leave-card">
        {/* ── Header ── */}
        <header className="leave-header">
          <div className="leave-header-top">
            <div className="leave-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            </div>
            <div className="header-nav-btns">
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
                {page === 'substitutions' ? 'Close Substitutions' : `Substitutions (${pendingSubstitutions.length})`}
              </button>
            </div>
          </div>
          <h1>Leave Application</h1>
          <p>Fill in the details below to submit your leave request</p>
        </header>

        {page === 'substitutions' ? (
          <SubstitutionsList
            onBack={() => setPage('form')}
            onAgree={handleAgreeSubstitution}
            submissions={submissions}
            employees={employees}
            branches={branches}
            roles={roles}
            applicant={applicant}
          />
        ) : (
          /* ── Leave Application Form ── */
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
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
              </select>
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
                ) : (
                  <>
                    <option value="">Select a substitute…</option>
                    {availableSubstitutes.length === 0 ? (
                      <option value="" disabled>No available substitutes in your role and branch</option>
                    ) : (
                      availableSubstitutes.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))
                    )}
                  </>
                )}
              </select>
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
        )}
      </div>

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
    </div>
  )
}

export default App