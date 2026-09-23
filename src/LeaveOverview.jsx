import { useState, useEffect } from 'react'
import { api } from './api'
import './LeaveOverview.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const DEFAULT_LEAVE_TYPES = [
  { code: 'annual', name: 'Annual Leave', color: '#a78bfa' },
  { code: 'sick', name: 'Sick Leave', color: '#f472b6' },
  { code: 'casual', name: 'Casual Leave', color: '#34d399' },
]

function getLeaveTypeInfo(code, leaveTypesList = []) {
  const norm = (code || '').toLowerCase().trim()
  const found = (leaveTypesList || []).find(
    lt => lt.code?.toLowerCase() === norm || lt.name?.toLowerCase() === norm
  )
  if (found) {
    const color = found.color || '#a78bfa'
    return {
      label: found.name || code,
      color: color,
      gradient: `linear-gradient(135deg, ${color}, #a78bfa)`,
      is_paid: found.is_paid !== 0,
      code: found.code
    }
  }
  if (norm === 'annual') return { label: 'Annual Leave', color: '#a78bfa', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)', code: 'annual' }
  if (norm === 'sick') return { label: 'Sick Leave', color: '#f472b6', gradient: 'linear-gradient(135deg, #db2777, #f472b6)', code: 'sick' }
  if (norm === 'casual') return { label: 'Casual Leave', color: '#34d399', gradient: 'linear-gradient(135deg, #059669, #34d399)', code: 'casual' }
  if (norm === 'unpaid' || norm === 'loss of pay') return { label: 'Loss of Pay', color: '#f97316', gradient: 'linear-gradient(135deg, #ea580c, #f97316)', code: 'unpaid' }

  return {
    label: code ? code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ') : 'Leave',
    color: '#818cf8',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    code: code
  }
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  className: 'status-pending' },
  approved: { label: 'Approved', className: 'status-approved' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
}

export default function LeaveOverview({ onBack, secretCode }) {
  const [overview, setOverview] = useState(null)
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [heatmapExpanded, setHeatmapExpanded] = useState(true)
  const [uploadingDocId, setUploadingDocId] = useState(null)
  const [docUploadMsg, setDocUploadMsg] = useState({})

  const handleUploadDoc = async (appId, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB')
      return
    }

    setUploadingDocId(appId)
    setDocUploadMsg(prev => ({ ...prev, [appId]: { type: 'info', text: 'Uploading document...' } }))

    try {
      const reader = new FileReader()
      reader.onload = async (readEvt) => {
        const base64Data = readEvt.target.result
        try {
          const res = await api.uploadApplicationDocument(appId, {
            documentData: base64Data,
            documentName: file.name
          })

          setDocUploadMsg(prev => ({ ...prev, [appId]: { type: 'success', text: 'Document submitted for review!' } }))
          
          // Update local overview state so UI updates immediately
          setOverview(prev => {
            if (!prev) return prev
            const updatedApps = (prev.applications || []).map(a => {
              if (a.id === appId) {
                return {
                  ...a,
                  document_path: res.document_path || a.document_path,
                  document_name: file.name,
                  document_status: 'submitted',
                  is_no_pay: 0
                }
              }
              return a
            })
            return { ...prev, applications: updatedApps }
          })
        } catch (err) {
          setDocUploadMsg(prev => ({ ...prev, [appId]: { type: 'error', text: err.message || 'Failed to upload document' } }))
        } finally {
          setUploadingDocId(null)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setUploadingDocId(null)
      setDocUploadMsg(prev => ({ ...prev, [appId]: { type: 'error', text: err.message || 'Error reading file' } }))
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [data, typesData] = await Promise.all([
          api.getLeaveOverview(secretCode),
          api.getLeaveTypes().catch(() => [])
        ])
        setOverview(data)
        if (Array.isArray(typesData) && typesData.length > 0) {
          setLeaveTypes(typesData)
        }
      } catch (err) {
        setError(err.message || 'Failed to load overview')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [secretCode])

  if (loading) {
    return (
      <div className="overview-page">
        <div className="overview-loading">
          <div className="overview-spinner" />
          <p>Loading your leave overview…</p>
        </div>
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="overview-page">
        <div className="overview-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>{error || 'Could not load your overview.'}</p>
          <button className="back-btn" onClick={onBack}>Go Back</button>
        </div>
      </div>
    )
  }

  const { employee, balance, rules, applications } = overview
  const currentYear = new Date().getFullYear()

  const effectiveLeaveTypes = (leaveTypes && leaveTypes.length > 0)
    ? leaveTypes
    : DEFAULT_LEAVE_TYPES

  const balanceCards = effectiveLeaveTypes.map(lt => {
    const code = (lt.code || '').toLowerCase()
    const ruleKey = `${code}_leave`
    const takenKey = `${code}_taken`

    let taken = (balance && balance[takenKey] !== undefined) ? Number(balance[takenKey]) : null
    if (taken === null || isNaN(taken)) {
      taken = (applications || []).reduce((acc, app) => {
        if (app.status === 'approved' && (app.leave_type?.toLowerCase() === code || app.leave_type?.toLowerCase() === lt.name?.toLowerCase())) {
          const inYearDates = (app.leaveDates || []).filter(d => d.startsWith(currentYear.toString()))
          return acc + inYearDates.length
        }
        return acc
      }, 0)
    }

    let total = (rules && rules[ruleKey] !== undefined) ? Number(rules[ruleKey]) : null
    if (total === null || isNaN(total)) {
      total = code === 'annual' ? 14 : code === 'sick' ? 10 : code === 'casual' ? 7 : 0
    }

    const typeInfo = getLeaveTypeInfo(lt.code, effectiveLeaveTypes)

    return {
      type: lt.code,
      label: lt.name || typeInfo.label,
      color: lt.color || typeInfo.color,
      gradient: typeInfo.gradient,
      taken,
      total,
    }
  })

  const filteredApps = historyFilter === 'all'
    ? applications
    : applications.filter(a => a.status === historyFilter)

  // -- Heatmap Data Generation --
  const leaveMap = {}
  applications.forEach(app => {
    // Show approved leaves in heatmap (could also include pending in a different style if desired, but let's stick to approved/pending with opacity maybe? Let's just use the color)
    if (app.status !== 'rejected') {
      app.leaveDates.forEach(d => {
        const dStr = new Date(d).toISOString().split('T')[0]
        leaveMap[dStr] = { type: app.leave_type, status: app.status }
      })
    }
  })

  const heatmapMonths = []
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(currentYear, m + 1, 0).getDate()
    const monthDays = []
    for (let d = 1; d <= daysInMonth; d++) {
      // Local time formatting to avoid timezone offset issues
      const dateObj = new Date(currentYear, m, d)
      // shift timezone offset to get local YYYY-MM-DD
      const offset = dateObj.getTimezoneOffset()
      const dStr = new Date(dateObj.getTime() - (offset*60*1000)).toISOString().split('T')[0]
      monthDays.push({
        date: dStr,
        dayNum: d,
        leave: leaveMap[dStr] || null
      })
    }
    heatmapMonths.push({ 
      name: new Date(currentYear, m, 1).toLocaleString('default', { month: 'long' }), 
      days: monthDays 
    })
  }

  return (
    <div className="overview-page">
      {/* ── Header ── */}
      <div className="overview-header-bar">
        <button className="back-btn" onClick={onBack} id="overview-back-btn" aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="overview-title-area">
          <div className="overview-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1>Leave Overview</h1>
            <p>Your leave summary for {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* ── Employee Info ── */}
      <div className="overview-employee-card">
        <div className="overview-employee-avatar">
          {employee.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="overview-employee-info">
          <div className="overview-employee-name">{employee.name}</div>
          <div className="overview-employee-meta">
            <span>{employee.role}</span>
            <span className="meta-dot">·</span>
            <span>{employee.branch}</span>
            {employee.department && (
              <>
                <span className="meta-dot">·</span>
                <span>{employee.department}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance Cards ── */}
      <div className="overview-section-title">Leave Balance — {new Date().getFullYear()}</div>
      <div className="overview-balance-grid">
        {balanceCards.map(({ type, label, color, gradient, taken, total }) => {
          const remaining = Math.max(0, total - taken)
          const pct = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0
          return (
            <div className="overview-balance-card" key={type}>
              <div className="balance-card-top">
                <div className="balance-type-label" style={{ color: color }}>{label}</div>
                <div className="balance-remaining">
                  <span className="balance-remaining-num">{remaining}</span>
                  <span className="balance-remaining-of">/ {total} remaining</span>
                </div>
              </div>
              <div className="balance-progress-wrap">
                <div className="balance-progress-bg">
                  <div
                    className="balance-progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: gradient,
                    }}
                  />
                </div>
                <div className="balance-progress-labels">
                  <span>{taken} taken</span>
                  <span>{pct}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Annual Heatmap ── */}
      <button 
        className="overview-section-title heatmap-toggle-btn" 
        onClick={() => setHeatmapExpanded(!heatmapExpanded)}
        style={{ marginTop: '36px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>Leave Heatmap — {currentYear}</span>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ 
            width: '16px', height: '16px', 
            transition: 'transform 0.2s ease', 
            transform: heatmapExpanded ? 'rotate(180deg)' : 'rotate(0deg)' 
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {heatmapExpanded && (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginTop: '10px',
            marginBottom: '14px',
            padding: '8px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Leave Types:
            </span>
            {effectiveLeaveTypes.map(lt => (
              <div key={lt.code} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: lt.color || '#a78bfa' }} />
                <span>{lt.name}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent' }} />
              <span>Pending</span>
            </div>
          </div>

          <div className="overview-heatmap-container">
            {heatmapMonths.map(month => (
              <div key={month.name} className="heatmap-month-block">
              <div className="heatmap-month-label">{month.name}</div>
              <div className="heatmap-days-grid">
                {month.days.map(d => {
                  let bg = 'rgba(255,255,255,0.05)'
                  let border = '1px solid rgba(255,255,255,0.02)'
                  let tooltip = formatDate(d.date)
                  if (d.leave) {
                    const conf = getLeaveTypeInfo(d.leave.type, effectiveLeaveTypes)
                    bg = conf.color
                    border = `1px solid ${conf.color}`
                    tooltip += ` — ${conf.label} (${d.leave.status})`
                    if (d.leave.status === 'pending') {
                      bg = 'transparent' // hollow square for pending
                    }
                  }
                  return (
                    <div 
                      key={d.date} 
                      className={`heatmap-day-sq ${d.leave ? 'has-leave' : ''}`}
                      style={{ background: bg, border: border }} 
                      title={tooltip}
                    />
                  )
                })}
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* ── Leave History ── */}
      <div className="overview-section-title" style={{ marginTop: '36px' }}>
        Leave History
        <span className="overview-history-count">{applications.length} total</span>
      </div>

      {/* Filter tabs */}
      <div className="overview-filter-tabs">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            className={`overview-filter-tab ${historyFilter === f ? 'active' : ''} ${f !== 'all' ? `tab-${f}` : ''}`}
            onClick={() => setHistoryFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="tab-count">
              {f === 'all' ? applications.length : applications.filter(a => a.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {filteredApps.length === 0 ? (
        <div className="overview-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
            <path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
          </svg>
          <p>No {historyFilter === 'all' ? '' : historyFilter} applications found.</p>
        </div>
      ) : (
        <div className="overview-history-list">
          {filteredApps.map((app, i) => {
            const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
            const typeConf = getLeaveTypeInfo(app.leave_type, effectiveLeaveTypes)
            const isExpanded = expandedId === app.id
            return (
              <div
                key={app.id}
                className={`overview-app-card ${isExpanded ? 'expanded' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <button
                  className="overview-app-header"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  <div className="overview-app-type-dot" style={{ background: typeConf.gradient }} />

                  <div className="overview-app-type">
                    <div className="overview-app-type-label" style={{ color: typeConf.color }}>
                      {typeConf.label}
                    </div>
                    <div className="overview-app-days">
                      {app.leaveDates.length} day{app.leaveDates.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="overview-app-dates">
                    <div className="overview-app-date-range">
                      {app.leaveDates.length === 1
                        ? formatDate(app.leaveDates[0])
                        : `${formatDate(app.leaveDates[0])} → ${formatDate(app.leaveDates[app.leaveDates.length - 1])}`
                      }
                    </div>
                    <div className="overview-app-applied">Applied {formatDate(app.appliedDate)}</div>
                  </div>

                  <span className={`status-badge ${status.className}`}>
                    {status.label}
                  </span>

                  {app.document_status && (
                    <span className={`status-badge doc-badge ${
                      app.document_status === 'verified' ? 'doc-badge-verified' :
                      app.document_status === 'submitted' ? 'doc-badge-submitted' :
                      (app.document_status === 'overdue' || app.is_no_pay) ? 'doc-badge-overdue' :
                      app.document_status === 'rejected' ? 'doc-badge-rejected' : 'doc-badge-pending'
                    }`}>
                      {app.document_status === 'verified' ? '✓ Doc Verified' :
                       app.document_status === 'submitted' ? '📄 Doc Submitted' :
                       (app.document_status === 'overdue' || app.is_no_pay) ? '⚠️ No Pay (Overdue)' :
                       app.document_status === 'rejected' ? '❌ No Pay (Rejected)' : '⏳ Doc Required'}
                    </span>
                  )}

                  <div className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="overview-app-detail">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Leave Dates</span>
                        <div className="detail-dates">
                          {app.leaveDates.map(d => (
                            <span key={d} className="date-chip">{formatDate(d)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Returning Date</span>
                        <span className="detail-value">{formatDate(app.returningDate)}</span>
                      </div>
                      {app.substituteName && (
                        <div className="detail-item">
                          <span className="detail-label">Substitute</span>
                          <span className="detail-value">
                            {app.substituteName}
                            <span className={`sub-confirmed ${app.substituteConfirmed ? 'yes' : 'no'}`}>
                              {app.substituteConfirmed ? ' ✓ Confirmed' : ' · Pending confirmation'}
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">Application ID</span>
                        <span className="detail-value mono">{app.id}</span>
                      </div>
                    </div>

                    {/* Medical / Supporting Document Section */}
                    {(app.document_status || app.document_deadline || app.document_path) && (
                      <div className="overview-doc-section">
                        <div className="overview-doc-header">
                          <div className="overview-doc-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10 9 9 9 8 9"/>
                            </svg>
                            Medical / Supporting Document
                          </div>
                          <span className={`status-badge doc-badge ${
                            app.document_status === 'verified' ? 'doc-badge-verified' :
                            app.document_status === 'submitted' ? 'doc-badge-submitted' :
                            (app.document_status === 'overdue' || app.is_no_pay) ? 'doc-badge-overdue' :
                            app.document_status === 'rejected' ? 'doc-badge-rejected' : 'doc-badge-pending'
                          }`}>
                            {app.document_status === 'verified' ? '✓ Verified by Admin/Manager' :
                             app.document_status === 'submitted' ? '📄 Submitted (Awaiting Review)' :
                             (app.document_status === 'overdue' || app.is_no_pay) ? '⚠️ Overdue (Converted to No Pay)' :
                             app.document_status === 'rejected' ? '❌ Rejected (Converted to No Pay)' :
                             `⏳ Required by ${app.document_deadline || 'return date'}`}
                          </span>
                        </div>

                        {/* Document Overdue / Rejected Warning */}
                        {(app.is_no_pay === 1 || app.document_status === 'overdue' || app.document_status === 'rejected') && (
                          <div className="overview-nopay-alert">
                            <strong>⚠️ Loss of Pay (No Pay Leave):</strong>
                            {app.document_status === 'rejected'
                              ? ` Your document was rejected: "${app.document_rejection_reason || 'Does not meet requirements'}". This leave is counted as unpaid Loss of Pay.`
                              : ` The document submission deadline (${app.document_deadline}) has passed without a verified document. This leave is marked as unpaid Loss of Pay.`}
                          </div>
                        )}

                        <div className="overview-doc-body">
                          {app.document_path ? (
                            <div className="overview-doc-file-info">
                              <span className="doc-file-name">📄 {app.document_name || 'Uploaded Document'}</span>
                              <a
                                href={app.document_path}
                                target="_blank"
                                rel="noreferrer"
                                className="doc-view-btn"
                              >
                                View / Download
                              </a>
                            </div>
                          ) : (
                            <div className="overview-doc-missing-text">
                              No document uploaded yet. Deadline: <strong>{app.document_deadline || 'Upon return'}</strong>
                            </div>
                          )}

                          {/* Upload / Replace Button */}
                          <div className="overview-doc-actions">
                            <label className={`overview-doc-upload-btn ${uploadingDocId === app.id ? 'disabled' : ''}`}>
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/webp"
                                style={{ display: 'none' }}
                                disabled={uploadingDocId === app.id}
                                onChange={(e) => handleUploadDoc(app.id, e)}
                              />
                              {uploadingDocId === app.id
                                ? 'Uploading...'
                                : app.document_path
                                ? 'Replace Document'
                                : 'Upload Medical Certificate'}
                            </label>

                            {docUploadMsg[app.id] && (
                              <span className={`doc-inline-msg msg-${docUploadMsg[app.id].type}`}>
                                {docUploadMsg[app.id].text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
