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
    <div className="admin-section">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.isError ? '#dc2626' : '#059669',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 15px rgba(30, 27, 75, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>🛡️</span>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Operational Contingency Shield</h2>
              {activeCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px'
                }}>
                  ● {activeCount} ACTIVE EMERGENCY
                </span>
              )}
            </div>
            <p style={{ margin: 0, opacity: 0.85, fontSize: '14px', maxWidth: '750px', lineHeight: 1.5 }}>
              Protect staff from unfair leave balance deductions during domestic emergencies (curfews, cyclones, power grid outages, transport strikes). Applications falling within declared dates deduct 0 days, and existing approved leaves can be refunded retroactively with a single click.
            </p>
          </div>

          <button
            onClick={openAdd}
            className="btn"
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
            }}
          >
            <span>🚨</span>
            <span>Declare Emergency / Disruption</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.75, textTransform: 'uppercase' }}>Active Contingencies</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: activeCount > 0 ? '#fca5a5' : '#86efac' }}>
              {activeCount} Active
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.75, textTransform: 'uppercase' }}>Total Recorded</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>
              {contingencies.length} Events
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.75, textTransform: 'uppercase' }}>Staff Deduction Policy</div>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px', color: '#93c5fd' }}>
              Zero Balance Deduction (Protected)
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="filter-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="filter-item" style={{ minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            Branch Facility:
          </label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="form-select"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">🏢 All Domestic Facilities</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item" style={{ minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">● ACTIVE Only</option>
            <option value="RESOLVED">✓ RESOLVED Only</option>
            <option value="CANCELLED">✗ CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Contingencies Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <p>Loading operational contingencies...</p>
        </div>
      ) : contingencies.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <span style={{ fontSize: '40px' }}>🛡️</span>
          <h3 style={{ margin: '12px 0 6px 0', color: '#334155' }}>No Contingency Events Declared</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
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
        <div className="table-container" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Emergency Title & Details</th>
                <th style={{ padding: '12px 16px' }}>Branch</th>
                <th style={{ padding: '12px 16px' }}>Effective Dates</th>
                <th style={{ padding: '12px 16px' }}>Leave Shield</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
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
                      borderBottom: '1px solid #f1f5f9',
                      background: isActive ? '#fffbfa' : '#fff'
                    }}
                  >
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: isActive ? '#fee2e2' : item.status === 'RESOLVED' ? '#ecfdf5' : '#f1f5f9',
                        color: isActive ? '#991b1b' : item.status === 'RESOLVED' ? '#065f46' : '#475569'
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
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
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{item.title}</div>
                      {item.description && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', lineHeight: 1.4, maxWidth: '400px' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', fontWeight: 600, color: '#334155' }}>
                      🏢 {item.branch_name}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.start_date}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>to {item.end_date}</div>
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                      {item.exempt_leave_deductions ? (
                        <span style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          🛡️ 0-Day Deduction Active
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Normal deductions</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {item.exempt_leave_deductions && (
                          <button
                            onClick={() => handleRetroactiveShield(item)}
                            disabled={retroShielding === item.id}
                            title="Refund already deducted leave days to staff during this event"
                            style={{
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: retroShielding === item.id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>🛡️</span>
                            <span>{retroShielding === item.id ? 'Refunding...' : 'Retro-Refund'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          style={{
                            background: '#fff',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
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
      )}

      {/* Modal: Add/Edit Contingency */}
      {modal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <form onSubmit={handleSave}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: modal === 'add' ? '#fef2f2' : '#f8fafc'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: modal === 'add' ? '#991b1b' : '#1e293b' }}>
                  {modal === 'add' ? '🚨 Declare Operational Emergency / Disruption' : 'Edit Operational Contingency'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Affected Domestic Branch *
                  </label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Emergency Event Type *
                  </label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
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

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Emergency Headline / Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Colombo District Police Curfew"
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Operational Details & Directives
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Provide context for managers and employees, special transport advice, or branch closure details..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  />
                </div>

                {modal === 'edit' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Declaration Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="ACTIVE">ACTIVE (Shield in effect)</option>
                      <option value="RESOLVED">RESOLVED (Operations normal)</option>
                      <option value="CANCELLED">CANCELLED (Revoked)</option>
                    </select>
                  </div>
                )}

                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  padding: '14px',
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
                  <label htmlFor="exempt_checkbox" style={{ fontSize: '13px', color: '#166534', cursor: 'pointer', lineHeight: 1.4 }}>
                    <strong>Exempt Leave Deductions (Contingency Shield)</strong><br />
                    When checked, any employee leave taken during these dates will deduct <strong>0 balance days</strong>. Staff will NOT lose their annual or casual balances due to force majeure events.
                  </label>
                </div>
              </div>

              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  style={{
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: modal === 'add' ? '#dc2626' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer'
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
      padding: '14px 20px',
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
