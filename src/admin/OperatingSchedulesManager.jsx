import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
};

const DAY_PRESETS = [
  { label: 'Corporate 5-Day (Mon–Fri)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  { label: '4-Day Compressed (Mon–Thu)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] },
  { label: 'Commercial 6-Day (Mon–Sat)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  { label: 'Continuous 7-Day (All Days)', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  { label: 'Weekend Operations (Sat–Sun)', days: ['Saturday', 'Sunday'] },
];

export function ManageOperatingSchedules({ onScheduleCreated }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'default' | 'custom'
  const [modal, setModal] = useState(null); // null | 'add' | schedule object
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const EMPTY_FORM = {
    name: '',
    description: '',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    daily_hours: 8.0,
    weekly_hours: 40.0,
    status: 'active'
  };

  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await api.getOperatingSchedules();
      setSchedules(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load operating schedules:', err);
      showToast(err.message || 'Failed to load operating schedules', 'danger');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal('add');
  };

  const openEdit = (sched) => {
    const rawDays = sched.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const parsedDays = Array.isArray(rawDays) ? rawDays : (typeof rawDays === 'string' ? JSON.parse(rawDays) : []);
    const daily = parseFloat(sched.daily_hours) || 8.0;
    const weekly = parseFloat(sched.weekly_hours) || parseFloat((daily * parsedDays.length).toFixed(1));

    setForm({
      id: sched.id,
      name: sched.name,
      description: sched.description || '',
      working_days: parsedDays,
      daily_hours: daily,
      weekly_hours: weekly,
      status: sched.status || 'active',
      is_default: sched.is_default
    });
    setModal(sched);
  };

  const closeModal = () => {
    setModal(null);
  };

  const toggleDay = (day) => {
    let nextDays;
    if (form.working_days.includes(day)) {
      if (form.working_days.length === 1) {
        alert('An operating schedule must contain at least one working day.');
        return;
      }
      nextDays = form.working_days.filter(d => d !== day);
    } else {
      nextDays = [...form.working_days, day];
    }
    const dHrs = form.daily_hours || 8.0;
    const newWk = parseFloat((dHrs * nextDays.length).toFixed(1));
    setForm(prev => ({
      ...prev,
      working_days: nextDays,
      weekly_hours: newWk
    }));
  };

  const applyPreset = (presetDays) => {
    const dHrs = form.daily_hours || 8.0;
    const newWk = parseFloat((dHrs * presetDays.length).toFixed(1));
    setForm(prev => ({
      ...prev,
      working_days: presetDays,
      weekly_hours: newWk
    }));
  };

  const handleDailyHoursChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    const dayCount = (form.working_days || []).length || 5;
    const newWk = parseFloat((val * dayCount).toFixed(1));
    setForm(prev => ({
      ...prev,
      daily_hours: val,
      weekly_hours: newWk
    }));
  };

  const handleWeeklyHoursChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    const dayCount = (form.working_days || []).length || 5;
    const newDaily = dayCount > 0 ? parseFloat((val / dayCount).toFixed(1)) : 8.0;
    setForm(prev => ({
      ...prev,
      weekly_hours: val,
      daily_hours: newDaily
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter a schedule name.');
      return;
    }
    if (!form.working_days || form.working_days.length === 0) {
      alert('Please select at least one working day.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (modal === 'add') {
        const created = await api.addOperatingSchedule(form);
        setSchedules(prev => [...prev, created]);
        showToast(`Created custom schedule "${created.name}"`);
        if (onScheduleCreated) onScheduleCreated(created);
      } else {
        const updated = await api.updateOperatingSchedule(modal.id, form);
        setSchedules(prev => prev.map(s => s.id === modal.id ? updated : s));
        showToast(`Updated schedule "${updated.name}"`);
      }
      closeModal();
    } catch (err) {
      alert('Error saving schedule: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sched) => {
    if (sched.is_default) {
      alert('Built-in default system schedules cannot be removed.');
      return;
    }
    if (sched.branch_count > 0) {
      alert(`Cannot remove schedule "${sched.name}" because it is currently assigned to ${sched.branch_count} branch(es). Please reassign those branches first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to remove the custom operating schedule "${sched.name}"?`)) {
      return;
    }

    try {
      await api.deleteOperatingSchedule(sched.id);
      setSchedules(prev => prev.filter(s => s.id !== sched.id));
      showToast('Operating schedule removed', 'danger');
    } catch (err) {
      alert('Error removing schedule: ' + err.message);
    }
  };

  const filtered = schedules.filter(s => {
    if (filterType === 'default' && !s.is_default) return false;
    if (filterType === 'custom' && s.is_default) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
  });

  const totalSchedules = schedules.length;
  const defaultCount = schedules.filter(s => s.is_default).length;
  const customCount = schedules.filter(s => !s.is_default).length;
  const totalAssignedBranches = schedules.reduce((acc, s) => acc + (s.branch_count || 0), 0);

  return (
    <div className="admin-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            ⏰
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Schedules
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #fff)', marginTop: '2px' }}>
              {totalSchedules}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            🔒
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Built-In Defaults
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#c084fc', marginTop: '2px' }}>
              {defaultCount}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            ✨
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Custom Schedules
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
              {customCount}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', fontWeight: 600 }}>
              Branches Configured
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24', marginTop: '2px' }}>
              {totalAssignedBranches}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div className="admin-search-box" style={{ flex: '1 1 240px' }}>
          <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search schedules by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', background: 'var(--card-bg, #1e293b)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-color, #334155)' }}>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'all' ? '#3b82f6' : 'transparent',
              color: filterType === 'all' ? '#fff' : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All ({totalSchedules})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('default')}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'default' ? '#3b82f6' : 'transparent',
              color: filterType === 'default' ? '#fff' : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            System Defaults ({defaultCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('custom')}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'custom' ? '#3b82f6' : 'transparent',
              color: filterType === 'custom' ? '#fff' : 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Custom Models ({customCount})
          </button>
        </div>

        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Custom Schedule
        </button>
      </div>

      {/* Table Wrap */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Schedule Name & Code</th>
              <th>Working Days</th>
              <th>Working Hours</th>
              <th>Classification</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #94a3b8)' }}>
                  Loading operating schedules…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted, #94a3b8)' }}>
                  No operating schedules found matching criteria
                </td>
              </tr>
            ) : (
              filtered.map((sched, i) => {
                const rawDays = sched.working_days || [];
                const daysArr = Array.isArray(rawDays) ? rawDays : (typeof rawDays === 'string' ? JSON.parse(rawDays) : []);
                const dayCount = daysArr.length;
                const dHrs = parseFloat(sched.daily_hours) || 8.0;
                const wHrs = parseFloat(sched.weekly_hours) || parseFloat((dHrs * dayCount).toFixed(1));

                return (
                  <tr key={sched.id} style={{ animationDelay: `${i * 0.03}s` }}>
                    {/* Name & Code */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: sched.is_default ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: sched.is_default ? '#c084fc' : '#34d399',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0
                        }}>
                          {sched.is_default ? '🔒' : '🗓️'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary, #fff)' }}>
                            {sched.name}
                          </div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                            {sched.code}
                          </div>
                          {sched.description && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px', maxWidth: '300px', lineHeight: 1.35 }}>
                              {sched.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Working Days Badges */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {ALL_DAYS.map(day => {
                          const isActive = daysArr.includes(day);
                          return (
                            <span
                              key={day}
                              title={day}
                              style={{
                                display: 'inline-block',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                color: isActive ? '#38bdf8' : '#475569',
                                border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)'
                              }}
                            >
                              {SHORT_DAYS[day]}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                        {dayCount} {dayCount === 1 ? 'day' : 'days'} / week
                      </div>
                    </td>

                    {/* Hours */}
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                        <span style={{ color: '#38bdf8' }}>{dHrs}h</span> / day
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                        {wHrs}h / week
                      </div>
                    </td>

                    {/* Classification */}
                    <td>
                      {sched.is_default ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                          <span>🔒</span> System Default
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <span>✨</span> Custom Schedule
                        </span>
                      )}
                    </td>

                    {/* Usage */}
                    <td>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: sched.branch_count > 0 ? '#fbbf24' : 'var(--text-muted, #94a3b8)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        🏢 {sched.branch_count} {sched.branch_count === 1 ? 'branch' : 'branches'}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge badge-${sched.status || 'active'}`}>
                        {sched.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-btns" style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-edit"
                          onClick={() => openEdit(sched)}
                          title="Edit Schedule"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Edit
                        </button>

                        {!sched.is_default ? (
                          <button
                            className="btn-danger"
                            disabled={sched.branch_count > 0}
                            onClick={() => handleDelete(sched)}
                            title={sched.branch_count > 0 ? 'Assigned to active branches' : 'Remove schedule'}
                            style={{
                              opacity: sched.branch_count > 0 ? 0.45 : 1,
                              cursor: sched.branch_count > 0 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                            Remove
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', padding: '4px' }}>
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Schedule Modal */}
      {modal !== null && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  {modal === 'add' ? 'Add Custom Operating Schedule' : `Edit Schedule: ${modal.name}`}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0' }}>
                  Configure weekly operating pattern and working hours for branches.
                </p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {modal.is_default && (
                  <div style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🔒</span>
                    <span><strong>System Default Model</strong>: Default schedule models are built-in and guaranteed across all branch workflows.</span>
                  </div>
                )}

                {/* Schedule Name */}
                <div className="field">
                  <label>Schedule Name *</label>
                  <input
                    placeholder="e.g. 4-Day Compressed (Mon–Thu) or Rotating Weekend"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>

                {/* Description */}
                <div className="field">
                  <label>Description / Facility Context</label>
                  <input
                    placeholder="Brief description of when or where this operating model applies…"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                    Quick Pattern Presets:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {DAY_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset.days)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-color, #334155)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: 'var(--text-secondary, #cbd5e1)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color, #334155)'}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Working Days Selector Chips */}
                <div className="field">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Scheduled Working Days *</span>
                    <span style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 600 }}>
                      {form.working_days.length} days selected
                    </span>
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                    gap: '8px',
                    marginTop: '4px'
                  }}>
                    {ALL_DAYS.map(day => {
                      const isSelected = form.working_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border-color, #334155)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                            color: isSelected ? '#fff' : 'var(--text-secondary, #94a3b8)',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{SHORT_DAYS[day]}</span>
                          <span style={{ fontSize: '10px', opacity: 0.75 }}>
                            {isSelected ? '✓ Work' : '— Off'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <small style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '11px', display: 'block', marginTop: '6px' }}>
                    Days marked <strong>Off</strong> will be treated as regular non-working days for leave deductions in branches using this schedule.
                  </small>
                </div>

                {/* Hours Row */}
                <div className="field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>Daily Working Hours (hrs/day) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      value={form.daily_hours}
                      onChange={handleDailyHoursChange}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Total Weekly Hours (hrs/week) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="168"
                      value={form.weekly_hours}
                      onChange={handleWeeklyHoursChange}
                      required
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active (Available for branches)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : (modal === 'add' ? 'Create Schedule' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`admin-toast admin-toast-${toast.type} show`}>
          {toast.type === 'success' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
