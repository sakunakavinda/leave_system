import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const EVENT_TYPE_BADGES = {
  curfew: { label: 'Curfew / Lockdown', bg: '#fee2e2', color: '#991b1b', icon: '🚨' },
  cyclone: { label: 'Extreme Weather / Cyclone', bg: '#e0f2fe', color: '#075985', icon: '🌪️' },
  flood: { label: 'Severe Flooding', bg: '#dbeafe', color: '#1e40af', icon: '🌊' },
  power_outage: { label: 'Grid / Power Failure', bg: '#fef3c7', color: '#92400e', icon: '⚡' },
  transport_strike: { label: 'Public Transport Strike', bg: '#ffedd5', color: '#9a3412', icon: '🚌' },
  civil_unrest: { label: 'Civil Disturbance / Protest', bg: '#fce7f3', color: '#9d174d', icon: '🛑' },
  other: { label: 'General Emergency', bg: '#f3f4f6', color: '#374151', icon: '⚠️' }
};

export function ContingencyShieldManager({ branches = [] }) {
  const [contingencies, setContingencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'add' | contingency object
  const [toast, setToast] = useState(null);
  const [retroShielding, setRetroShielding] = useState(null); // id currently processing

  const EMPTY_FORM = {
    branch_id: branches[0]?.id || '',
    event_type: 'curfew',
    title: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    description: '',
    exempt_leave_deductions: true,
    status: 'ACTIVE'
  };

  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = (msg, isError = false) => {
    setToast({ text: msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const loadContingencies = async () => {
    try {
      setLoading(true);
      const params = {};
      if (branchFilter !== 'all') params.branch_id = branchFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await api.getContingencies(params);
      setContingencies(data);
    } catch (err) {
      console.error('Failed to load contingencies', err);
      showToast('Error loading operational contingencies', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContingencies();
  }, [branchFilter, statusFilter]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      branch_id: branchFilter !== 'all' ? branchFilter : (branches[0]?.id || '')
    });
    setModal('add');
  };

  const openEdit = (item) => {
    setForm({
      id: item.id,
      branch_id: item.branch_id,
      event_type: item.event_type || 'other',
      title: item.title,
      start_date: item.start_date,
      end_date: item.end_date,
      description: item.description || '',
      exempt_leave_deductions: Boolean(item.exempt_leave_deductions),
      status: item.status || 'ACTIVE'
    });
    setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.branch_id || !form.start_date || !form.end_date) {
      showToast('Please fill all mandatory fields (Branch, Title, Dates)', true);
      return;
    }
    if (form.start_date > form.end_date) {
      showToast('Start date cannot be after end date', true);
      return;
    }

    try {
      if (modal === 'add') {
        await api.addContingency(form);
        showToast('Operational Emergency declared successfully!');
      } else {
        await api.updateContingency(form.id, form);
        showToast('Contingency record updated successfully');
      }
      setModal(null);
      loadContingencies();
    } catch (err) {
      console.error('Failed to save contingency', err);
      showToast(err.message || 'Operation failed', true);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete contingency "${title}"?`)) return;
    try {
      await api.deleteContingency(id);
      showToast('Contingency removed');
      loadContingencies();
    } catch (err) {
      showToast(err.message || 'Failed to delete', true);
    }
  };

  const handleRetroactiveShield = async (item) => {
    const confirmMsg = `🛡️ RETROACTIVE SHIELD ACTIVATION:\n\n` +
      `This will scan all approved leave applications for branch "${item.branch_name}" ` +
      `between ${item.start_date} and ${item.end_date}.\n\n` +
      `Any days deducted during this emergency will be REFUNDED back to employees' leave balances automatically via signed ledger credits.\n\n` +
      `Do you wish to proceed?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setRetroShielding(item.id);
      const res = await api.applyRetroactiveShield(item.id);
      showToast(`✅ Shield Applied! ${res.refunded_count} employee leave deductions successfully refunded.`);
      loadContingencies();
    } catch (err) {
      console.error('Failed to apply retroactive shield', err);
      showToast(err.message || 'Failed to apply retroactive shield', true);
    } finally {
      setRetroShielding(null);
    }
  };

  const activeCount = contingencies.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="admin-section cs-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          maxWidth: 'calc(100vw - 40px)',
          zIndex: 9999,
          background: toast.isError ? '#dc2626' : '#059669',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span>{toast.isError ? '⚠️' : '✓'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="cs-header-banner">
        <div className="cs-header-main">
          <div className="cs-header-info">
            <div className="cs-title-row">
              <span style={{ fontSize: '26px' }}>🛡️</span>
              <h2>Operational Contingency Shield</h2>
              {activeCount > 0 && (
                <span className="cs-emergency-pill">
                  ● {activeCount} ACTIVE EMERGENCY
                </span>
              )}
            </div>
            <p className="cs-header-desc">
              Protect staff from unfair leave balance deductions during domestic emergencies (curfews, cyclones, power grid outages, transport strikes). Applications falling within declared dates deduct 0 days, and existing approved leaves can be refunded retroactively with a single click.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="cs-declare-btn"
          >
            <span>🚨</span>
            <span>Declare Emergency / Disruption</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="cs-stats-grid">
          <div className="cs-stat-card">
            <div className="cs-stat-label">Active Contingencies</div>
            <div className="cs-stat-val" style={{ color: activeCount > 0 ? '#fca5a5' : '#86efac' }}>
              {activeCount} Active
            </div>
          </div>
          <div className="cs-stat-card">
            <div className="cs-stat-label">Total Recorded</div>
            <div className="cs-stat-val">
              {contingencies.length} Events
            </div>
          </div>
          <div className="cs-stat-card">
            <div className="cs-stat-label">Staff Deduction Policy</div>
            <div className="cs-stat-val" style={{ fontSize: '13.5px', color: '#93c5fd' }}>
              Zero Balance Deduction (Protected)
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="cs-filters-bar">
        <div className="cs-filter-group">
          <label>Branch Facility:</label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">🏢 All Domestic Facilities</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="cs-filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">● ACTIVE Only</option>
            <option value="RESOLVED">✓ RESOLVED Only</option>
            <option value="CANCELLED">✗ CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Contingencies Display (Table for desktop, Cards for mobile) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
          <p>Loading operational contingencies...</p>
        </div>
      ) : contingencies.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'var(--bg-card, rgba(255,255,255,0.02))',
          borderRadius: '12px',
          border: '1px dashed var(--bg-card-border, #cbd5e1)'
        }}>
          <span style={{ fontSize: '40px' }}>🛡️</span>
          <h3 style={{ margin: '12px 0 6px 0', color: 'var(--text-primary, #334155)' }}>No Contingency Events Declared</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            All domestic branches are operating under normal operational conditions.
          </p>
          <button
            onClick={openAdd}
            className="btn btn-secondary"
            style={{ marginTop: '16px' }}
          >
            + Declare New Contingency
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="cs-desktop-table data-table-wrap">
            <table className="data-table" style={{ minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Emergency Title & Details</th>
                  <th>Branch</th>
                  <th>Effective Dates</th>
                  <th>Leave Shield</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contingencies.map(item => {
                  const badge = EVENT_TYPE_BADGES[item.event_type] || EVENT_TYPE_BADGES.other;
                  const isActive = item.status === 'ACTIVE';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isActive ? 'rgba(239, 68, 68, 0.04)' : undefined
                      }}
                    >
                      <td style={{ verticalAlign: 'top' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isActive ? 'rgba(239, 68, 68, 0.2)' : item.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isActive ? '#f87171' : item.status === 'RESOLVED' ? '#34d399' : 'var(--text-muted)'
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: badge.bg,
                            color: badge.color,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{item.title}</div>
                        {item.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4, maxWidth: '420px' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', fontWeight: 600, color: 'var(--text-primary)' }}>
                        🏢 {item.branch_name}
                      </td>
                      <td style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.start_date}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>to {item.end_date}</div>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        {item.exempt_leave_deductions ? (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            🛡️ 0-Day Deduction Active
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Normal deductions</span>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {item.exempt_leave_deductions && (
                            <button
                              onClick={() => handleRetroactiveShield(item)}
                              disabled={retroShielding === item.id}
                              title="Refund already deducted leave days to staff during this event"
                              className="btn-primary"
                              style={{
                                padding: '5px 9px',
                                fontSize: '11.5px',
                                background: '#3b82f6',
                                borderColor: '#2563eb'
                              }}
                            >
                              <span>🛡️</span>
                              <span>{retroShielding === item.id ? 'Refunding...' : 'Retro-Refund'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(item)}
                            className="btn-edit"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="btn-danger"
                            style={{ padding: '5px 9px', fontSize: '11.5px' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (App-like for small screens) */}
          <div className="cs-mobile-cards">
            {contingencies.map(item => {
              const badge = EVENT_TYPE_BADGES[item.event_type] || EVENT_TYPE_BADGES.other;
              const isActive = item.status === 'ACTIVE';

              return (
                <div key={item.id} className={`cs-card-item ${isActive ? 'is-active' : ''}`}>
                  <div className="cs-card-top">
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: badge.bg,
                      color: badge.color,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>

                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      background: isActive ? 'rgba(239, 68, 68, 0.2)' : item.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#f87171' : item.status === 'RESOLVED' ? '#34d399' : 'var(--text-muted)'
                    }}>
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <div className="cs-card-title">{item.title}</div>
                    {item.description && (
                      <div className="cs-card-desc" style={{ marginTop: '4px' }}>
                        {item.description}
                      </div>
                    )}
                  </div>

                  <div className="cs-card-meta">
                    <div>🏢 <strong>{item.branch_name}</strong></div>
                    <div>📅 {item.start_date} to {item.end_date}</div>
                    {item.exempt_leave_deductions ? (
                      <div style={{ color: '#34d399', fontWeight: 600 }}>🛡️ 0-Day Leave Shield Active</div>
                    ) : (
                      <div>Normal Leave Deductions</div>
                    )}
                  </div>

                  <div className="cs-card-actions">
                    {item.exempt_leave_deductions && (
                      <button
                        onClick={() => handleRetroactiveShield(item)}
                        disabled={retroShielding === item.id}
                        className="btn-primary"
                        style={{ background: '#3b82f6', borderColor: '#2563eb', fontSize: '12px', padding: '8px' }}
                      >
                        🛡️ {retroShielding === item.id ? 'Refunding...' : 'Retro-Refund'}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(item)}
                      className="btn-edit"
                      style={{ justifyContent: 'center', padding: '8px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="btn-danger"
                      style={{ justifyContent: 'center', padding: '8px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal: Add/Edit Contingency (Responsive) */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div 
            className="modal-box" 
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '100%', maxHeight: 'calc(100vh - 30px)' }}
          >
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="modal-header" style={{
                background: modal === 'add' ? 'color-mix(in srgb, #ef4444 8%, var(--bg-secondary))' : undefined
              }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: modal === 'add' ? '#f87171' : 'var(--text-primary)' }}>
                  {modal === 'add' ? '🚨 Declare Operational Emergency / Disruption' : 'Edit Operational Contingency'}
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                <div className="field">
                  <label>Affected Domestic Branch *</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Emergency Event Type *</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                    required
                  >
                    <option value="curfew">🚨 Curfew / Government Lockdown</option>
                    <option value="cyclone">🌪️ Extreme Weather / Cyclone Alert</option>
                    <option value="flood">🌊 Severe Flooding / Road Inundation</option>
                    <option value="power_outage">⚡ Grid Failure / Fuel Shortage</option>
                    <option value="transport_strike">🚌 Public Transport / Rail Strike</option>
                    <option value="civil_unrest">🛑 Civil Unrest / Road Closures</option>
                    <option value="other">⚠️ Other Domestic Force Majeure</option>
                  </select>
                </div>

                <div className="field">
                  <label>Emergency Headline / Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Colombo District Police Curfew"
                    required
                  />
                </div>

                {/* Date pickers auto-stack on narrow screens */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div className="field">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Operational Details & Directives</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Provide context for managers and employees, special transport advice, or branch closure details..."
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                {modal === 'edit' && (
                  <div className="field">
                    <label>Declaration Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE (Shield in effect)</option>
                      <option value="RESOLVED">RESOLVED (Operations normal)</option>
                      <option value="CANCELLED">CANCELLED (Revoked)</option>
                    </select>
                  </div>
                )}

                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <input
                    type="checkbox"
                    id="exempt_checkbox"
                    checked={form.exempt_leave_deductions}
                    onChange={(e) => setForm({ ...form, exempt_leave_deductions: e.target.checked })}
                    style={{ marginTop: '3px', transform: 'scale(1.2)', cursor: 'pointer' }}
                  />
                  <label htmlFor="exempt_checkbox" style={{ fontSize: '13px', color: '#34d399', cursor: 'pointer', lineHeight: 1.4 }}>
                    <strong style={{ color: '#fff' }}>Exempt Leave Deductions (Contingency Shield)</strong><br />
                    When checked, any employee leave taken during these dates will deduct <strong>0 balance days</strong>. Staff will NOT lose their annual or casual balances due to force majeure events.
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    background: modal === 'add' ? '#dc2626' : undefined,
                    borderColor: modal === 'add' ? '#b91c1c' : undefined
                  }}
                >
                  {modal === 'add' ? '🚨 Declare Emergency' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Active Contingency Banner for Dashboard
 */
export function ActiveContingencyAlertBanner({ branchId = null }) {
  const [activeEvents, setActiveEvents] = useState([]);

  useEffect(() => {
    async function checkActive() {
      try {
        const data = await api.getContingencies({ status: 'ACTIVE' });
        const filtered = branchId && branchId !== 'all' 
          ? data.filter(e => e.branch_id === branchId)
          : data;
        setActiveEvents(filtered);
      } catch (err) {
        // silent fail on banner
      }
    }
    checkActive();
  }, [branchId]);

  if (activeEvents.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)',
      color: '#fff',
      padding: 'clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 20px)',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      animation: 'pulse 2s infinite'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🚨</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px' }}>
            OPERATIONAL EMERGENCY ACTIVE ({activeEvents.length} Branch{activeEvents.length > 1 ? 'es' : ''})
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            {activeEvents.map(e => `${e.branch_name}: ${e.title} (${e.start_date} to ${e.end_date})`).join(' | ')}
            {activeEvents.some(e => e.exempt_leave_deductions) && (
              <span style={{ marginLeft: '8px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                🛡️ Leave Shield Active (0 Days Deducted)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
