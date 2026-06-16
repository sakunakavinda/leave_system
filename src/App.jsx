import { useState, useEffect } from 'react'
import './App.css'
import LeaveList from './LeaveList.jsx'

const getMinLeaveDate = () => {
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 3)
  const year = minDate.getFullYear()
  const month = String(minDate.getMonth() + 1).padStart(2, '0')
  const day = String(minDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App() {
  const [page, setPage] = useState('form') // 'form' | 'list'
  const [formData, setFormData] = useState({
    secretCode: '',
    confirmSecretCode: '',
    leaveDates: [getMinLeaveDate()],
    returningDate: '',
    substituteName: '',
  })

  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (formData.secretCode !== formData.confirmSecretCode) {
      setError('Secret codes do not match. Please re-enter carefully.')
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

    const submissionData = {
      ...formData,
      appliedDate: new Date().toISOString().split('T')[0],
      // In a real application, the backend would use the secretCode
      // to resolve the employee's name, branch, post, and department.
    }

    console.log('Leave Application Submitted:', submissionData)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)

    // Reset form
    setFormData({
      secretCode: '',
      confirmSecretCode: '',
      leaveDates: [getMinLeaveDate()],
      returningDate: '',
      substituteName: '',
    })
  }

  if (page === 'list') {
    return <LeaveList onBack={() => setPage('form')} />
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
            <button
              type="button"
              className="view-list-btn"
              id="view-applications-btn"
              onClick={() => setPage('list')}
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
          </div>
          <h1>Leave Application</h1>
          <p>Fill in the details below to submit your leave request</p>
        </header>

        {/* ── Form ── */}
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

          <div className="form-group">
            <label htmlFor="confirmSecretCode">
              Re-enter Secret Code <span className="required">*</span>
            </label>
            <input
              type="password"
              id="confirmSecretCode"
              name="confirmSecretCode"
              placeholder="••••••••"
              value={formData.confirmSecretCode}
              onChange={handleChange}
              required
            />
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

          {/* Row 3: Substitute Name */}
          <div className="form-group">
            <label htmlFor="substituteName">
              Substitute Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="substituteName"
              name="substituteName"
              placeholder="Name of the substitute"
              value={formData.substituteName}
              onChange={handleChange}
              required
            />
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

      {/* ── Success Toast ── */}
      <div className={`toast ${showToast ? 'show' : ''}`} role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Leave application submitted successfully!
      </div>
    </div>
  )
}

export default App
