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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await api.getShifts(branchFilter !== 'all' ? { branch_id: branchFilter } : {});
      setShifts(data);
    } catch (err) {
      console.error('Failed to load shifts', err);
      showToast('Error loading shifts');
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
      crosses_midnight: Boolean(shift.crosses_midnight)
    });
    setModal(shift);
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
        showToast('Shift created successfully');
      } else {
        const updated = await api.updateShift(modal.id, payload);
        setShifts(prev => prev.map(s => s.id === modal.id ? updated : s));
        showToast('Shift updated successfully');
      }
      setModal(null);
    } catch (err) {
      alert(err.message || 'Failed to save shift');
    }
  };

  const handleDelete = async (shift) => {
    if (!window.confirm(`Are you sure you want to delete shift "${shift.name}" (${shift.code})?`)) return;
    try {
      await api.deleteShift(shift.id);
      setShifts(prev => prev.filter(s => s.id !== shift.id));
      showToast('Shift deleted');
    } catch (err) {
      alert(err.message || 'Failed to delete shift');
    }
  };

  return (
    <div className="admin-page-container">
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="admin-page-header">
        <div>
          <h2>Shift Masters</h2>
          <p className="admin-page-sub">Define work schedules, overnight night shifts, and duration hours.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="filter-select"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">All Branches (Global & Local)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="primary-btn" onClick={openAdd}>
            + Add New Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading shifts...</div>
      ) : shifts.length === 0 ? (
        <div className="admin-empty-state">
          <p>No shift definitions found. Click "+ Add New Shift" to create your first shift.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {shifts.map(shift => {
            const branchName = shift.branch_id 
              ? branches.find(b => b.id === shift.branch_id)?.name || 'Specific Branch'
              : 'All Branches (Global Default)';

            return (
              <div 
                key={shift.id} 
                style={{
                  background: 'var(--card-bg, #1e293b)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      background: shift.color_code || '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      {shift.code}
                    </span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary, #fff)' }}>{shift.name}</strong>
                  </div>
                  {Boolean(shift.crosses_midnight) && (
                    <span style={{ fontSize: '11px', background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                      🌙 Overnight
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Hours:</strong> {shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)} ({shift.duration_hours} hrs)</div>
                  <div><strong>Scope:</strong> {branchName}</div>
                  <div><strong>Leave Deduction:</strong> 1.00 Shift Unit</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color, #334155)' }}>
                  <button className="action-btn-small" onClick={() => openEdit(shift)} style={{ flex: 1 }}>
                    Edit
                  </button>
                  <button className="action-btn-small danger" onClick={() => handleDelete(shift)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {modal && (
        <div className="admin-modal-backdrop" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3>{modal === 'add' ? 'Create Shift Master' : 'Edit Shift Master'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Shift Code <span className="required">*</span></label>
                <input 
                  type="text" 
                  value={form.code} 
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                  placeholder="e.g. NGT" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Shift Name <span className="required">*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g. Night Production Shift" 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Branch Assignment</label>
                <select 
                  value={form.branch_id} 
                  onChange={e => setForm({ ...form, branch_id: e.target.value })}
                >
                  <option value="">All Branches (Global Shift)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Start Time <span className="required">*</span></label>
                  <input 
                    type="time" 
                    value={form.start_time} 
                    onChange={e => setForm({ ...form, start_time: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>End Time <span className="required">*</span></label>
                  <input 
                    type="time" 
                    value={form.end_time} 
                    onChange={e => setForm({ ...form, end_time: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Duration Hours</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    value={form.duration_hours} 
                    onChange={e => setForm({ ...form, duration_hours: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Color Badge</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                    {PRESET_COLORS.map(c => (
                      <div 
                        key={c}
                        onClick={() => setForm({ ...form, color_code: c })}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: c,
                          cursor: 'pointer',
                          border: form.color_code === c ? '2px solid #fff' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={form.crosses_midnight} 
                    onChange={e => setForm({ ...form, crosses_midnight: e.target.checked })} 
                  />
                  <span><strong>Crosses Midnight (Overnight Shift)</strong></span>
                </label>
                <small style={{ color: 'var(--text-secondary, #94a3b8)', display: 'block', marginTop: '4px' }}>
                  Leave applications spanning an overnight shift deduct strictly 1 shift unit, never double counting days.
                </small>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="action-btn-small" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Shift</button>
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

  // Bulk Auto-Assign Tools
  const handleAutoFillDefaultShift = async () => {
    if (shifts.length === 0) {
      alert('Please create at least one shift in Shift Masters first.');
      return;
    }
    const defaultShift = shifts.find(s => s.code === 'GEN') || shifts[0];
    if (!window.confirm(`Auto-assign weekdays to "${defaultShift.name}" (${defaultShift.code}) for ${filteredEmployees.length} employees?`)) return;

    try {
      const entries = [];
      filteredEmployees.forEach(emp => {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateObj = new Date(selectedYear, selectedMonth - 1, day);
          const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Weekend RDO
            entries.push({
              employee_id: emp.id,
              roster_date: dateStr,
              shift_id: null,
              is_rdo: true
            });
          } else {
            // Weekday standard shift
            entries.push({
              employee_id: emp.id,
              roster_date: dateStr,
              shift_id: defaultShift.id,
              is_rdo: false
            });
          }
        }
      });

      await api.bulkSaveRoster(entries);
      showToast(`Auto-assigned month schedule for ${filteredEmployees.length} staff!`);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to bulk assign roster');
    }
  };

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="admin-page-container">
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="admin-page-header">
        <div>
          <h2>Shift Rostering Matrix</h2>
          <p className="admin-page-sub">Monthly shift scheduling with cross-midnight tracking and RDO management.</p>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="filter-select"
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select 
            className="filter-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>

          <select 
            className="filter-select"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {[2025, 2026, 2027].map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <button className="primary-btn" onClick={handleAutoFillDefaultShift}>
            ⚡ Auto-Fill Month (Weekdays Shift / Weekends RDO)
          </button>
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
                <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '180px', position: 'sticky', left: 0, background: 'var(--card-bg, #1e293b)', zIndex: 2 }}>
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
                    <div style={{ color: 'var(--text-primary, #fff)' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>
                      {branches.find(b => b.id === emp.branch_id)?.name || 'Branch'}
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

            {shifts.map(s => (
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
            ))}

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
