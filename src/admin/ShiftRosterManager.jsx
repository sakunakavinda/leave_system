import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

/* ─────────────────────────────────────────────────────────
   1. ManageShiftMasters — Shift templates configuration
───────────────────────────────────────────────────────── */
export function ManageShiftMasters({ branches = [] }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'add' | shift object
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const EMPTY_SHIFT = {
    code: '',
    name: '',
    branch_id: '',
    start_time: '08:30',
    end_time: '17:00',
    crosses_midnight: false,
    duration_hours: 8.5,
    color_code: '#3b82f6'
  };
  const [form, setForm] = useState(EMPTY_SHIFT);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await api.getShifts(branchFilter !== 'all' ? { branch_id: branchFilter } : {});
      setShifts(data);
    } catch (err) {
      console.error('Failed to load shifts', err);
      showToast('Error loading shifts', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [branchFilter]);

  const openAdd = () => {
    setForm(EMPTY_SHIFT);
    setModal('add');
  };

  const openEdit = (shift) => {
    setForm({
      ...shift,
      branch_id: shift.branch_id || '',
      crosses_midnight: Boolean(shift.crosses_midnight),
      duration_hours: parseFloat(shift.duration_hours) || 8.0
    });
    setModal(shift);
  };

  // Auto-calculate duration hours when times change
  const handleTimeChange = (field, val) => {
    const updated = { ...form, [field]: val };
    const st = field === 'start_time' ? val : form.start_time;
    const et = field === 'end_time' ? val : form.end_time;
    const cm = field === 'crosses_midnight' ? val : form.crosses_midnight;
    
    if (st && et) {
      const [sh, sm] = st.split(':').map(Number);
      const [eh, em] = et.split(':').map(Number);
      let sMins = sh * 60 + sm;
      let eMins = eh * 60 + em;
      if (cm || eMins < sMins) {
        eMins += 24 * 60;
      }
      const diff = parseFloat(((eMins - sMins) / 60).toFixed(1));
      if (diff > 0) updated.duration_hours = diff;
    }
    setForm(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Shift Code and Shift Name are required', true);
      return;
    }

    try {
      const payload = {
        ...form,
        branch_id: form.branch_id || null,
        duration_hours: parseFloat(form.duration_hours) || 8.0,
        crosses_midnight: Boolean(form.crosses_midnight)
      };

      if (modal === 'add') {
        const created = await api.addShift(payload);
        setShifts(prev => [...prev, created]);
        showToast('Shift template created successfully');
      } else {
        const updated = await api.updateShift(modal.id, payload);
        setShifts(prev => prev.map(s => s.id === modal.id ? updated : s));
        showToast('Shift updated successfully');
      }
      setModal(null);
    } catch (err) {
      showToast(err.message || 'Failed to save shift', true);
    }
  };

  const handleDelete = async (shift) => {
    if (!window.confirm(`Are you sure you want to delete shift "${shift.name}" (${shift.code})?`)) return;
    try {
      await api.deleteShift(shift.id);
      setShifts(prev => prev.filter(s => s.id !== shift.id));
      showToast('Shift template deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete shift', true);
    }
  };

  const filteredShifts = shifts.filter(s => {
    const q = search.toLowerCase();
    const bName = branches.find(b => b.id === s.branch_id)?.name || 'Global';
    return !q || 
      s.name?.toLowerCase().includes(q) || 
      s.code?.toLowerCase().includes(q) || 
      bName.toLowerCase().includes(q);
  });

  return (
    <div className="admin-content" style={{ padding: '24px 28px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.isError ? '#dc2626' : '#059669',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          fontSize: '13px'
        }}>
          <span>{toast.isError ? '⚠️' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Controls Bar: Responsive Toolbar */}
      <div className="controls-bar" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '240px' }}>
          {/* Search Box */}
          <div className="admin-search-box" style={{ minWidth: '200px', flex: 1 }}>
            <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              placeholder="Search shifts by code or name…" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>

          {/* Branch Filter */}
          <select 
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--bg-card-border, #cbd5e1)',
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <option value="all">🏢 All Branches (Global & Local)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card, #f1f5f9)', borderRadius: '8px', padding: '2px', border: '1px solid var(--bg-card-border, #e2e8f0)' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              style={{
                background: viewMode === 'table' ? 'var(--accent, #3b82f6)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--text-muted, #64748b)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Cards View"
              style={{
                background: viewMode === 'cards' ? 'var(--accent, #3b82f6)' : 'transparent',
                color: viewMode === 'cards' ? '#fff' : 'var(--text-muted, #64748b)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Cards
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button 
          className="btn-primary" 
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            padding: '9px 16px',
            fontWeight: 600
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Shift Template
        </button>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted, #64748b)' }}>
          <p>Loading shift definitions...</p>
        </div>
      ) : filteredShifts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'var(--bg-card, #f8fafc)',
          borderRadius: '12px',
          border: '1px dashed var(--bg-card-border, #cbd5e1)'
        }}>
          <span style={{ fontSize: '36px' }}>⏱️</span>
          <h3 style={{ margin: '12px 0 6px 0', color: 'var(--text-primary, #1e293b)' }}>No Shift Definitions Found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            {search ? 'No shifts match your search term.' : 'Click "+ Add Shift Template" to configure work shifts.'}
          </p>
          <button 
            className="btn-secondary" 
            onClick={openAdd} 
            style={{ marginTop: '16px', padding: '8px 16px', fontSize: '13px' }}
          >
            + Create First Shift
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* ── Compact Table View ── */
        <div className="data-table-wrap" style={{ borderRadius: '10px', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Code</th>
                <th>Shift Name</th>
                <th>Working Hours</th>
                <th>Duration</th>
                <th>Overnight / Midnight</th>
                <th>Branch Scope</th>
                <th>Deduction Unit</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => {
                const branchName = shift.branch_id 
                  ? branches.find(b => b.id === shift.branch_id)?.name || 'Specific Branch'
                  : 'All Branches (Global)';
                const isOvernight = Boolean(shift.crosses_midnight);

                return (
                  <tr key={shift.id}>
                    <td>
                      <span style={{
                        background: shift.color_code || '#3b82f6',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                        letterSpacing: '0.5px'
                      }}>
                        {shift.code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                        {shift.name}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary, #334155)' }}>
                        {shift.start_time?.substring(0, 5)} – {shift.end_time?.substring(0, 5)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#2563eb',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {shift.duration_hours} hrs
                      </span>
                    </td>
                    <td>
                      {isOvernight ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(139, 92, 246, 0.12)',
                          color: '#7c3aed',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          🌙 Crosses Midnight
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '12px' }}>
                          Standard Daytime
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary, #475569)' }}>
                        {shift.branch_id ? `🏢 ${branchName}` : '🌐 Global (All Branches)'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                        1.0 Shift Unit
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-btns" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                        <button 
                          className="btn-edit" 
                          onClick={() => openEdit(shift)}
                          title="Edit Shift"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-danger" 
                          onClick={() => handleDelete(shift)}
                          title="Delete Shift"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
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
      ) : (
        /* ── Compact Cards Grid View ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '14px'
        }}>
          {filteredShifts.map(shift => {
            const branchName = shift.branch_id 
              ? branches.find(b => b.id === shift.branch_id)?.name || 'Specific Branch'
              : 'All Branches (Global)';
            const isOvernight = Boolean(shift.crosses_midnight);

            return (
              <div 
                key={shift.id} 
                style={{
                  background: 'var(--bg-card, #fff)',
                  border: '1px solid var(--bg-card-border, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: shift.color_code || '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '5px'
                    }}>
                      {shift.code}
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary, #0f172a)' }}>
                      {shift.name}
                    </strong>
                  </div>
                  {isOvernight && (
                    <span style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                      🌙 Overnight
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hours:</span>
                    <strong style={{ color: 'var(--text-primary, #1e293b)' }}>
                      {shift.start_time?.substring(0, 5)} – {shift.end_time?.substring(0, 5)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Duration:</span>
                    <strong style={{ color: '#2563eb' }}>{shift.duration_hours} hrs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Scope:</span>
                    <span style={{ color: 'var(--text-primary, #334155)', fontWeight: 500 }}>{branchName}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--bg-card-border, #f1f5f9)'
                }}>
                  <button 
                    className="btn-edit" 
                    onClick={() => openEdit(shift)} 
                    style={{ flex: 1, padding: '5px 8px', fontSize: '12px', justifyContent: 'center' }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-danger" 
                    onClick={() => handleDelete(shift)} 
                    style={{ padding: '5px 8px', fontSize: '12px' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Responsive Modal Dialog */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div 
            className="modal-box" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '500px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Create Shift Template' : 'Edit Shift Template'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="field">
                    <label>Shift Code *</label>
                    <input 
                      type="text" 
                      value={form.code} 
                      onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                      placeholder="e.g. NGT" 
                      maxLength={6}
                      required 
                      style={{ textTransform: 'uppercase', fontWeight: 700 }}
                    />
                  </div>
                  <div className="field">
                    <label>Shift Name *</label>
                    <input 
                      type="text" 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g. Overnight Night Shift" 
                      required 
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Branch Assignment</label>
                  <select 
                    value={form.branch_id} 
                    onChange={e => setForm({ ...form, branch_id: e.target.value })}
                  >
                    <option value="">🌐 All Branches (Global Shift Template)</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>🏢 {b.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div className="field">
                    <label>Start Time *</label>
                    <input 
                      type="time" 
                      value={form.start_time} 
                      onChange={e => handleTimeChange('start_time', e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="field">
                    <label>End Time *</label>
                    <input 
                      type="time" 
                      value={form.end_time} 
                      onChange={e => handleTimeChange('end_time', e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="field">
                    <label>Duration (hrs)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      min="1"
                      max="24"
                      value={form.duration_hours} 
                      onChange={e => setForm({ ...form, duration_hours: parseFloat(e.target.value) || 8.0 })} 
                      required 
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Color Badge</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                    {PRESET_COLORS.map(c => (
                      <div 
                        key={c}
                        onClick={() => setForm({ ...form, color_code: c })}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: c,
                          cursor: 'pointer',
                          boxShadow: form.color_code === c ? '0 0 0 3px rgba(59, 130, 246, 0.4)' : 'none',
                          border: form.color_code === c ? '2px solid #fff' : '1px solid rgba(0,0,0,0.1)',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-card, #f8fafc)',
                  border: '1px solid var(--bg-card-border, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={form.crosses_midnight} 
                      onChange={e => handleTimeChange('crosses_midnight', e.target.checked)} 
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                      🌙 Crosses Midnight (Overnight Shift)
                    </span>
                  </label>
                  <small style={{ color: 'var(--text-muted, #64748b)', display: 'block', marginTop: '4px', fontSize: '11.5px', lineHeight: 1.4 }}>
                    Leave applications covering this shift deduct strictly <strong>1.0 shift unit</strong>, avoiding double-counting across the midnight transition.
                  </small>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {modal === 'add' ? 'Create Shift' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   2. ManageShiftRosters — Interactive Monthly Workforce Matrix
───────────────────────────────────────────────────────── */
export function ManageShiftRosters({ branches = [], employees = [] }) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || 'all');
  const [shifts, setShifts] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Active cell popover for shift assignment: { employeeId, dateStr, x, y }
  const [activeCell, setActiveCell] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Calculate days in selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = async () => {
    try {
      setLoading(true);
      const start_date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const end_date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const [shiftList, rosterList] = await Promise.all([
        api.getShifts(),
        api.getRosters({
          branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
          start_date,
          end_date
        })
      ]);

      setShifts(shiftList);
      setRosters(rosterList);
    } catch (err) {
      console.error('Failed to load roster data', err);
      showToast('Error loading roster matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth, selectedBranch]);

  // Filter employees for the selected branch
  const filteredEmployees = employees.filter(e => {
    if (e.status !== 'active') return false;
    if (selectedBranch !== 'all' && e.branch_id !== selectedBranch) return false;
    return true;
  });

  // Quick lookup map: `${employee_id}_${dateStr}` -> roster entry
  const rosterMap = new Map();
  rosters.forEach(r => {
    rosterMap.set(`${r.employee_id}_${r.roster_date}`, r);
  });

  const handleCellClick = (e, employeeId, dayNum) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setActiveCell({
      employeeId,
      dateStr,
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
  };

  const handleAssignShift = async (shiftId, isRdo = false) => {
    if (!activeCell) return;
    const { employeeId, dateStr } = activeCell;
    setActiveCell(null);

    try {
      const updated = await api.saveRoster({
        employee_id: employeeId,
        roster_date: dateStr,
        shift_id: isRdo ? null : shiftId,
        is_rdo: isRdo
      });

      setRosters(prev => {
        const filtered = prev.filter(r => !(r.employee_id === employeeId && r.roster_date === dateStr));
        return [...filtered, updated];
      });

      showToast(`Assigned ${isRdo ? 'RDO' : updated.shift_code || 'Shift'} on ${dateStr}`);
    } catch (err) {
      alert(err.message || 'Failed to assign shift');
    }
  };

  const handleClearCell = async () => {
    if (!activeCell) return;
    const { employeeId, dateStr } = activeCell;
    const existing = rosterMap.get(`${employeeId}_${dateStr}`);
    setActiveCell(null);

    if (existing && existing.id) {
      try {
        await api.deleteRoster(existing.id);
        setRosters(prev => prev.filter(r => r.id !== existing.id));
        showToast('Roster entry cleared');
      } catch (err) {
        alert(err.message || 'Failed to clear roster');
      }
    }
  };

  // Employee-specific Auto-Fill & Clear state
  const [autoFillModal, setAutoFillModal] = useState(null); // null | { employeeId, employeeName, branchId, branchName, workingDays, offDays }
  const [autoFillShiftId, setAutoFillShiftId] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [isSubmittingAutoFill, setIsSubmittingAutoFill] = useState(false);

  const handleClearEmployeeRoster = async (emp) => {
    const monthName = MONTH_NAMES[selectedMonth - 1];
    if (!window.confirm(`Are you sure you want to clear all roster assignments and RDOs for ${emp.name} in ${monthName} ${selectedYear}?`)) {
      return;
    }

    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      
      await api.clearEmployeeRoster(emp.id, { start_date: startDate, end_date: endDate });
      showToast(`Cleared ${monthName} ${selectedYear} roster for ${emp.name}`, 'info');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to clear employee roster');
    }
  };

  const openAutoFillModal = (emp) => {
    const availableShifts = shifts.filter(s => !s.branch_id || s.branch_id === emp.branch_id);
    if (availableShifts.length === 0) {
      const bName = branches.find(b => b.id === emp.branch_id)?.name || 'their branch';
      alert(`No shifts available for ${emp.name}'s branch (${bName}). Please create a shift in Shift Masters for this branch or for All Branches.`);
      return;
    }
    const defaultShift = availableShifts.find(s => s.code === 'GEN') || availableShifts[0];
    setAutoFillShiftId(defaultShift ? defaultShift.id : '');
    setOverwriteExisting(true);

    const empBranch = branches.find(b => b.id === emp.branch_id);
    let branchWorkingDays = empBranch?.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (typeof branchWorkingDays === 'string') {
      try { branchWorkingDays = JSON.parse(branchWorkingDays); } catch (e) {}
    }
    if (!Array.isArray(branchWorkingDays) || branchWorkingDays.length === 0) {
      branchWorkingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }
    const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const offDays = ALL_DAYS.filter(d => !branchWorkingDays.includes(d));

    setAutoFillModal({
      employeeId: emp.id,
      employeeName: emp.name,
      branchId: emp.branch_id,
      branchName: empBranch?.name || 'Branch',
      workingDays: branchWorkingDays,
      offDays: offDays
    });
  };

  const handleConfirmAutoFill = async (e) => {
    if (e) e.preventDefault();
    if (!autoFillModal || !autoFillShiftId) {
      alert('Please select a shift to auto-fill.');
      return;
    }
    const selectedShift = shifts.find(s => s.id === autoFillShiftId);
    if (!selectedShift) return;

    setIsSubmittingAutoFill(true);
    try {
      const entries = [];
      const empId = autoFillModal.employeeId;
      const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const branchWorkingDays = autoFillModal.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeekName = DAY_NAMES[dateObj.getDay()];
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const existing = rosterMap.get(`${empId}_${dateStr}`);
        if (existing && !overwriteExisting) {
          // Keep existing entry if overwrite is unchecked
          continue;
        }

        const isWorkingDate = branchWorkingDays.includes(dayOfWeekName);

        if (isWorkingDate) {
          // Working date for this employee's branch: assign selected shift
          entries.push({
            employee_id: empId,
            roster_date: dateStr,
            shift_id: selectedShift.id,
            is_rdo: false
          });
        } else {
          // Non-working date for this employee's branch: assign RDO
          entries.push({
            employee_id: empId,
            roster_date: dateStr,
            shift_id: null,
            is_rdo: true
          });
        }
      }

      await api.bulkSaveRoster(entries);
      showToast(`Auto-assigned ${selectedShift.name} for ${autoFillModal.employeeName} (${MONTH_NAMES[selectedMonth - 1]} ${selectedYear})!`);
      setAutoFillModal(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to auto-assign schedule');
    } finally {
      setIsSubmittingAutoFill(false);
    }
  };

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="admin-content" style={{ padding: '24px 28px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#059669',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: 600,
          fontSize: '13px'
        }}>
          {toast}
        </div>
      )}

      {/* Responsive Controls Toolbar */}
      <div className="controls-bar" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--bg-card-border, #cbd5e1)',
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <option value="all">🏢 All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select 
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--bg-card-border, #cbd5e1)',
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>

          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--bg-card-border, #cbd5e1)',
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {[2025, 2026, 2027].map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading roster matrix...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="admin-empty-state">
          <p>No active employees found for the selected branch filter.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '16px', borderRadius: '10px', border: '1px solid var(--border-color, #334155)', background: 'var(--card-bg, #1e293b)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid var(--border-color, #334155)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '240px', position: 'sticky', left: 0, background: 'var(--card-bg, #1e293b)', zIndex: 2 }}>
                  Employee
                </th>
                {daysArray.map(day => {
                  const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                  const dayName = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dateObj.getDay()];
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                  return (
                    <th 
                      key={day} 
                      style={{
                        padding: '8px 4px',
                        minWidth: '38px',
                        background: isWeekend ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        color: isWeekend ? '#f87171' : 'var(--text-secondary, #94a3b8)',
                        borderLeft: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{day}</div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase' }}>{dayName}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontWeight: 600,
                    position: 'sticky',
                    left: 0,
                    background: 'var(--card-bg, #1e293b)',
                    zIndex: 1,
                    borderRight: '1px solid var(--border-color, #334155)',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary, #fff)', fontSize: '13px' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>
                          {branches.find(b => b.id === emp.branch_id)?.name || 'Branch'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-autofill-emp"
                          id={`btn-autofill-${emp.id}`}
                          title={`Auto-fill ${MONTH_NAMES[selectedMonth - 1]} schedule for ${emp.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openAutoFillModal(emp);
                          }}
                        >
                          <span style={{ fontSize: '12px' }}>⚡</span>
                          <span>Auto-Fill</span>
                        </button>
                        <button
                          type="button"
                          className="btn-clear-emp"
                          id={`btn-clear-${emp.id}`}
                          title={`Clear all roster assignments in ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} for ${emp.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearEmployeeRoster(emp);
                          }}
                        >
                          <span style={{ fontSize: '11px' }}>🗑️</span>
                          <span>Clear All</span>
                        </button>
                      </div>
                    </div>
                  </td>

                  {daysArray.map(day => {
                    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const entry = rosterMap.get(`${emp.id}_${dateStr}`);
                    const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                    let badgeContent = '-';
                    let badgeBg = 'transparent';
                    let badgeColor = 'var(--text-secondary, #64748b)';

                    if (entry) {
                      if (entry.is_rdo) {
                        badgeContent = 'RDO';
                        badgeBg = 'rgba(245, 158, 11, 0.2)';
                        badgeColor = '#fbbf24';
                      } else if (entry.shift_code) {
                        badgeContent = entry.shift_code;
                        badgeBg = entry.color_code || '#3b82f6';
                        badgeColor = '#fff';
                      }
                    }

                    return (
                      <td 
                        key={day}
                        onClick={(e) => handleCellClick(e, emp.id, day)}
                        style={{
                          padding: '6px 2px',
                          cursor: 'pointer',
                          background: isWeekend ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          borderLeft: '1px solid rgba(255,255,255,0.03)',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = isWeekend ? 'rgba(255, 255, 255, 0.02)' : 'transparent'}
                        title={`Click to assign shift for ${emp.name} on ${dateStr}`}
                      >
                        <span style={{
                          display: 'inline-block',
                          minWidth: '32px',
                          padding: '3px 2px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badgeBg,
                          color: badgeColor
                        }}>
                          {badgeContent}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Popover for Quick Shift Assignment */}
      {activeCell && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'transparent'
          }}
          onClick={() => setActiveCell(null)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: `${Math.min(window.innerHeight - 260, activeCell.y)}px`,
              left: `${Math.min(window.innerWidth - 220, activeCell.x)}px`,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minWidth: '200px',
              zIndex: 10000
            }}
          >
            <div style={{ fontSize: '11px', color: '#94a3b8', padding: '2px 4px', borderBottom: '1px solid #1e293b' }}>
              Assign Shift: <strong>{activeCell.dateStr}</strong>
            </div>

            {(() => {
              const cellEmp = employees.find(emp => emp.id === activeCell.employeeId);
              const cellShifts = shifts.filter(s => !s.branch_id || (cellEmp && s.branch_id === cellEmp.branch_id));
              return cellShifts.map(s => (
                <button 
                  key={s.id}
                  onClick={() => handleAssignShift(s.id, false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '12px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    background: s.color_code || '#3b82f6',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {s.code}
                  </span>
                  <span>{s.name}</span>
                </button>
              ));
            })()}

            <button 
              onClick={() => handleAssignShift(null, true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <span>🏖️</span>
              <span>RDO (Rest Day Off)</span>
            </button>

            <button 
              onClick={handleClearCell}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                padding: '6px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
                borderTop: '1px solid #1e293b'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✕ Clear Shift
            </button>
          </div>
        </div>
      )}

      {/* ── Individual Employee Auto-Fill Month Modal ── */}
      {autoFillModal && (
        <div className="modal-backdrop" onClick={() => setAutoFillModal(null)} style={{ zIndex: 9999 }}>
          <div 
            className="modal-box" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '520px', 
              width: '90%', 
              background: 'var(--bg-secondary, #131927)', 
              border: '1px solid rgba(99, 102, 241, 0.3)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
              zIndex: 10000,
              borderRadius: '16px'
            }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '18px 24px' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary, #fff)' }}>
                  <span>⚡</span>
                  Auto-Fill Month Schedule
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0' }}>
                  Assign selected shift for weekdays and RDO for weekends.
                </p>
              </div>
              <button className="modal-close" onClick={() => setAutoFillModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleConfirmAutoFill}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Employee & Month Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color, #334155)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>Employee</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{autoFillModal.employeeName}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{autoFillModal.branchName}</div>
                  </div>

                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color, #334155)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>Target Period</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                      {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{daysInMonth} days in month</div>
                  </div>
                </div>

                {/* Choose Shift */}
                {(() => {
                  const branchShifts = shifts.filter(s => !s.branch_id || s.branch_id === autoFillModal.branchId);
                  return (
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '8px' }}>
                        Choose Shift to Auto-Fill <span style={{ color: '#f87171' }}>*</span>
                        <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-secondary, #94a3b8)', marginLeft: '8px' }}>
                          (Available to {autoFillModal.branchName} & All Branches)
                        </span>
                      </label>
                      <select
                        className="admin-filter-select"
                        style={{ width: '100%', padding: '10px 12px', fontSize: '13px' }}
                        value={autoFillShiftId}
                        onChange={e => setAutoFillShiftId(e.target.value)}
                        required
                      >
                        {branchShifts.length === 0 ? (
                          <option value="" disabled>No shifts configured for this branch</option>
                        ) : (
                          branchShifts.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code}) — {s.start_time} to {s.end_time} ({s.duration_hours || 8} hrs){!s.branch_id ? ' • Global' : ''}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  );
                })()}

                {/* Selected Shift Preview Card */}
                {(() => {
                  const currentShift = shifts.find(s => s.id === autoFillShiftId);
                  if (!currentShift) return null;
                  return (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px 14px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      border: '1px solid var(--border-color, #334155)', 
                      borderRadius: '8px' 
                    }}>
                      <span style={{ 
                        background: currentShift.color_code || '#3b82f6', 
                        color: '#fff', 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {currentShift.code}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #fff)' }}>{currentShift.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                          ⏰ {currentShift.start_time} - {currentShift.end_time} ({currentShift.duration_hours || 8} hrs)
                          {currentShift.crosses_midnight ? ' • Crosses Midnight' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Pattern Explanation Box */}
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.08)', 
                  border: '1px solid rgba(99, 102, 241, 0.25)', 
                  borderRadius: '8px', 
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary, #cbd5e1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: '#34d399', fontWeight: 600, minWidth: '155px' }}>
                      🏢 Branch Working Days:
                    </span>
                    <span>
                      <strong>{autoFillModal.workingDays?.join(', ')}</strong> → Assigned to <strong>{shifts.find(s => s.id === autoFillShiftId)?.name || 'Selected Shift'}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 600, minWidth: '155px' }}>
                      🏖️ Non-Working Days:
                    </span>
                    <span>
                      <strong>{autoFillModal.offDays?.length > 0 ? autoFillModal.offDays.join(', ') : 'None'}</strong> → Assigned as <strong>RDO (Rostered Day Off)</strong>
                    </span>
                  </div>
                </div>

                {/* Overwrite Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={e => setOverwriteExisting(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>Overwrite existing shifts & RDOs already scheduled this month</span>
                </label>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setAutoFillModal(null)}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSubmittingAutoFill || shifts.filter(s => !s.branch_id || s.branch_id === autoFillModal.branchId).length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>⚡</span>
                  {isSubmittingAutoFill ? 'Applying...' : `Auto-Fill for ${autoFillModal.employeeName}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: 'var(--card-bg, #1e293b)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #334155)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        fontSize: '12px'
      }}>
        <strong style={{ color: 'var(--text-primary, #fff)' }}>Shift Legend:</strong>
        {shifts.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: s.color_code || '#3b82f6',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              {s.code}
            </span>
            <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>{s.name}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '3px',
            border: '1px solid rgba(245, 158, 11, 0.4)'
          }}>
            RDO
          </span>
          <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>Rest Day Off (0 Leave Units)</span>
        </div>
      </div>
    </div>
  );
}
