import { useState } from 'react'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
    branch: '',
    date: '',
    name: '',
    post: '',
    department: '',
    leaveDates: [''],
    returningDate: '',
    substituteName: '',
  })

  const [showToast, setShowToast] = useState(false)

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
      leaveDates: [...prev.leaveDates, ''],
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
    console.log('Leave Application Submitted:', formData)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)

    // Reset form
    setFormData({
      branch: '',
      date: '',
      name: '',
      post: '',
      department: '',
      leaveDates: [''],
      returningDate: '',
      substituteName: '',
    })
  }

  return (
    <div className="leave-page">
      <div className="leave-card">
        {/* ── Header ── */}
        <header className="leave-header">
          <div className="leave-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          </div>
          <h1>Leave Application</h1>
          <p>Fill in the details below to submit your leave request</p>
        </header>

        {/* ── Form ── */}
        <form className="leave-form" id="leave-application-form" onSubmit={handleSubmit}>
          {/* Row 1: Branch & Date */}
          <div className="form-group">
            <label htmlFor="branch">
              Branch <span className="required">*</span>
            </label>
            <input
              type="text"
              id="branch"
              name="branch"
              placeholder="Enter branch name"
              value={formData.branch}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">
              Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 2: Name & Post */}
          <div className="form-group">
            <label htmlFor="name">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post">
              Post <span className="required">*</span>
            </label>
            <input
              type="text"
              id="post"
              name="post"
              placeholder="Designation / Post"
              value={formData.post}
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 3: Department (full width) */}
          <div className="form-group full-width">
            <label htmlFor="department">
              Department <span className="required">*</span>
            </label>
            <input
              type="text"
              id="department"
              name="department"
              placeholder="Department name"
              value={formData.department}
              onChange={handleChange}
              required
            />
          </div>

          {/* Divider */}
          <div className="form-divider">
            <span>Leave Details</span>
          </div>

          {/* Row 4: Leave Dates (multiple) & Returning Date */}
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
              onChange={handleChange}
              required
            />
          </div>

          {/* Row 5: Substitute Name (full width) */}
          <div className="form-group full-width">
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
          <div className="submit-wrapper">
            <button type="submit" className="submit-btn" id="submit-leave-btn">
              Submit Application
            </button>
          </div>

          {/* ── Conditions ── */}
          <div className="conditions-section">
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
                Leaves should be applied before 3 working days.
              </li>
              <li data-num="2.">
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
