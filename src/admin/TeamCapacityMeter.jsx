import React, { useState, useEffect } from 'react';
import { api, formatBranchName } from '../api.js';

export function TeamCapacityMeter({ branches = [], activeBranch = 'all' }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedBranch, setSelectedBranch] = useState(activeBranch || 'all');
  const [capacityData, setCapacityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDrilldown, setShowDrilldown] = useState(false);

  const fetchCapacity = async () => {
    try {
      setLoading(true);
      const data = await api.getTeamCapacity({
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
        date: selectedDate
      });
      setCapacityData(data);
    } catch (err) {
      console.error('Failed to fetch team capacity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacity();
  }, [selectedDate, selectedBranch]);

  // Sync if parent passes activeBranch
  useEffect(() => {
    if (activeBranch && activeBranch !== selectedBranch) {
      setSelectedBranch(activeBranch);
    }
  }, [activeBranch]);

  if (!capacityData && loading) {
    return (
      <div style={{
        padding: '16px 20px',
        background: 'var(--card-bg, #1e293b)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #334155)',
        marginBottom: '20px',
        color: 'var(--text-secondary, #94a3b8)',
        fontSize: '13px'
      }}>
        Calculating live workforce capacity...
      </div>
    );
  }

  if (!capacityData) return null;

  const pct = capacityData.capacityPercentage;
  const statusColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const statusBg = pct >= 75 ? 'rgba(16, 185, 129, 0.1)' : pct >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  const statusBorder = pct >= 75 ? 'rgba(16, 185, 129, 0.3)' : pct >= 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)';

  return (
    <div style={{
      background: 'var(--card-bg, #1e293b)',
      borderRadius: '12px',
      border: '1px solid var(--border-color, #334155)',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
              Live Team Capacity Meter
            </h3>
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '12px',
              background: statusBg,
              border: `1px solid ${statusBorder}`,
              color: statusColor,
              fontWeight: 700
            }}>
              {capacityData.statusLabel}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
            Real-time on-duty headcount vs approved/pending leaves for operational coverage.
          </p>
        </div>

        {/* Date and Branch filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #334155)',
              background: 'rgba(0,0,0,0.2)',
              color: '#fff',
              fontSize: '12px'
            }}
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{formatBranchName(b)}</option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #334155)',
              background: 'rgba(0,0,0,0.2)',
              color: '#fff',
              fontSize: '12px'
            }}
          />

          <button
            onClick={fetchCapacity}
            title="Refresh capacity gauge"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '6px',
              color: 'var(--text-secondary, #94a3b8)',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Main KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Gauge card */}
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Radial progress ring */}
          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="3.8"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={statusColor}
                strokeWidth="3.8"
                strokeDasharray={`${pct}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '13px',
              color: statusColor
            }}>
              {pct}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.05em' }}>
              Operational Capacity
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #fff)', marginTop: '2px' }}>
              {capacityData.onDutyCount} / {capacityData.totalStaff} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary, #94a3b8)' }}>active staff</span>
            </div>
          </div>
        </div>

        {/* On-Duty Staff KPI */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#34d399', letterSpacing: '0.05em', fontWeight: 600 }}>
            On-Duty Coverage
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {capacityData.onDutyCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
            Available to run operations
          </div>
        </div>

        {/* On-Leave Staff KPI */}
        <div 
          onClick={() => setShowDrilldown(!showDrilldown)}
          style={{
            background: capacityData.onLeaveCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${capacityData.onLeaveCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
            borderRadius: '10px',
            padding: '16px',
            cursor: capacityData.onLeaveCount > 0 ? 'pointer' : 'default',
            transition: 'border-color 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: capacityData.onLeaveCount > 0 ? '#f87171' : 'var(--text-secondary, #94a3b8)', letterSpacing: '0.05em', fontWeight: 600 }}>
              On Leave Today
            </span>
            {capacityData.onLeaveCount > 0 && (
              <span style={{ fontSize: '11px', color: '#60a5fa' }}>{showDrilldown ? '▲ Hide' : '▼ Details'}</span>
            )}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: capacityData.onLeaveCount > 0 ? '#ef4444' : 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
            {capacityData.onLeaveCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
            {capacityData.onLeaveCount > 0 ? 'Click to view absent staff' : 'Full team attendance'}
          </div>
        </div>
      </div>

      {/* Role Staffing Breakdown Bars */}
      {capacityData.roleBreakdown && capacityData.roleBreakdown.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #334155)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '10px' }}>
            Staffing by Designation / Role:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {capacityData.roleBreakdown.map(role => {
              const roleColor = role.status === 'healthy' ? '#10b981' : role.status === 'warning' ? '#f59e0b' : '#ef4444';
              return (
                <div key={role.role_id} style={{
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-primary, #fff)', fontWeight: 500 }}>{role.role_name}</span>
                    <strong style={{ color: roleColor }}>{role.onDuty}/{role.total} ({role.capacityPercentage}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${role.capacityPercentage}%`, height: '100%', background: roleColor, borderRadius: '2px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drill-down of staff on leave */}
      {showDrilldown && capacityData.onLeaveList && capacityData.onLeaveList.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '14px',
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '8px' }}>
            Staff on Leave on {capacityData.date}:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {capacityData.onLeaveList.map((item, idx) => (
              <div key={idx} style={{
                fontSize: '12px',
                color: 'var(--text-primary, #fff)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px'
              }}>
                <div>
                  <strong>{item.employee_name}</strong> • <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>{item.role_name}</span> ({item.branch_name})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    textTransform: 'capitalize',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa'
                  }}>
                    {item.leave_type} Leave
                  </span>
                  {item.substitute_name && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                      Cover: <strong>{item.substitute_name}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
