import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function PayrollExportManager({ branches = [] }) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [branchFilter, setBranchFilter] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ text: msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPayrollSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getPayrollSummary({
        branch_id: branchFilter,
        month: selectedMonth,
        year: selectedYear
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load payroll summary', err);
      showToast('Error loading payroll summary', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollSummary();
  }, [branchFilter, selectedMonth, selectedYear]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await api.downloadPayrollCsv({
        branch_id: branchFilter,
        month: selectedMonth,
        year: selectedYear
      });
      showToast('Payroll CSV exported successfully!');
    } catch (err) {
      console.error('Export CSV error', err);
      showToast(err.message || 'Failed to export CSV', true);
    } finally {
      setExporting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="admin-section payroll-container">
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
      <div className="payroll-header-banner">
        <div className="payroll-header-main">
          <div className="payroll-header-info">
            <div className="payroll-title-row">
              <span style={{ fontSize: '26px' }}>📊</span>
              <h2>Payroll &amp; Loss of Pay (LOP) Exporter</h2>
            </div>
            <p className="payroll-header-desc">
              Monthly reconciliation of employee attendance, paid leaves, and Loss of Pay (LOP) deductions for standard domestic payroll processing. All calculations account for branch weekend schedules, gazetted holidays, roster assignments, and contingency shields.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="payroll-export-btn"
          >
            <span>📥</span>
            <span>{exporting ? 'Generating CSV...' : 'Export Payroll CSV'}</span>
          </button>
        </div>

        {/* Aggregate KPI Summary Cards */}
        {data && (
          <div className="payroll-kpi-grid">
            <div className="payroll-kpi-card">
              <div className="payroll-kpi-label">Staff Headcount</div>
              <div className="payroll-kpi-val">{data.totalEmployees}</div>
            </div>

            <div className="payroll-kpi-card">
              <div className="payroll-kpi-label">Scheduled Days</div>
              <div className="payroll-kpi-val">
                {data.records?.reduce((acc, r) => acc + r.scheduledWorkingDays, 0) || 0}
              </div>
            </div>

            <div className="payroll-kpi-card">
              <div className="payroll-kpi-label">Total Paid Leaves</div>
              <div className="payroll-kpi-val" style={{ color: '#93c5fd' }}>
                {data.records?.reduce((acc, r) => acc + r.paidLeaveDays, 0).toFixed(1) || 0}
              </div>
            </div>

            <div className="payroll-kpi-card">
              <div className="payroll-kpi-label">Total LOP Deductions</div>
              <div className="payroll-kpi-val" style={{ color: data.totalLopDays > 0 ? '#fca5a5' : '#86efac' }}>
                {data.totalLopDays?.toFixed(1) || 0}
              </div>
            </div>

            <div className="payroll-kpi-card">
              <div className="payroll-kpi-label">Net Payable Days</div>
              <div className="payroll-kpi-val" style={{ color: '#6ee7b7' }}>
                {data.totalPayableDays?.toFixed(1) || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="payroll-filters-bar">
        <div className="payroll-filter-item">
          <label>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div className="payroll-filter-item">
          <label>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="payroll-filter-item" style={{ flexGrow: 1.5 }}>
          <label>Branch Facility:</label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="all">🏢 All Domestic Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={loadPayrollSummary}
          className="btn-secondary payroll-refresh-btn"
          style={{ marginLeft: 'auto' }}
        >
          🔄 Refresh Summary
        </button>
      </div>

      {/* Payroll Display (Table for desktop, Cards for mobile) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
          <p>Calculating month payroll records &amp; LOP deductions...</p>
        </div>
      ) : !data || data.records.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'var(--bg-card, rgba(255,255,255,0.02))',
          borderRadius: '12px',
          border: '1px dashed var(--bg-card-border, #cbd5e1)'
        }}>
          <span style={{ fontSize: '40px' }}>📋</span>
          <h3 style={{ margin: '12px 0 6px 0', color: 'var(--text-primary, #334155)' }}>No Active Employees Found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            There are no active employees assigned to the selected branch.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="payroll-desktop-table data-table-wrap">
            <table className="data-table" style={{ minWidth: '820px' }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch &amp; Role</th>
                  <th style={{ textAlign: 'center' }}>Calendar</th>
                  <th style={{ textAlign: 'center' }}>Off / Holiday</th>
                  <th style={{ textAlign: 'center' }}>Work Days</th>
                  <th style={{ textAlign: 'center' }}>Paid Leaves</th>
                  <th style={{ textAlign: 'center' }}>LOP (Unpaid)</th>
                  <th style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>Net Payable Days</th>
                  <th>Leave Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map(rec => {
                  const hasLop = rec.lopDays > 0;
                  return (
                    <tr
                      key={rec.employee_id}
                      style={{
                        background: hasLop ? 'rgba(239, 68, 68, 0.04)' : undefined
                      }}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {rec.employee_name}
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>🏢 {rec.branch_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rec.role_name}</div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        {rec.calendarDays}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        {rec.offDays + rec.holidays}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rec.scheduledWorkingDays}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#60a5fa' }}>
                        {rec.paidLeaveDays > 0 ? `${rec.paidLeaveDays.toFixed(1)}d` : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {hasLop ? (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '12.5px'
                          }}>
                            -{rec.lopDays.toFixed(1)}d
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: '15px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#34d399'
                      }}>
                        {rec.netPayableDays.toFixed(1)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {rec.leaveBreakdown && Object.keys(rec.leaveBreakdown).length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {Object.entries(rec.leaveBreakdown).map(([typeName, days]) => (
                              <span
                                key={typeName}
                                style={{
                                  background: typeName.toLowerCase().includes('unpaid') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                  color: typeName.toLowerCase().includes('unpaid') ? '#f87171' : '#60a5fa',
                                  border: `1px solid ${typeName.toLowerCase().includes('unpaid') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}
                              >
                                {typeName}: {days}d
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No leaves taken</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="payroll-mobile-cards">
            {data.records.map(rec => {
              const hasLop = rec.lopDays > 0;
              return (
                <div key={rec.employee_id} className={`payroll-card ${hasLop ? 'has-lop' : ''}`}>
                  <div className="payroll-card-header">
                    <div>
                      <div className="payroll-card-name">{rec.employee_name}</div>
                      <div className="payroll-card-sub">🏢 {rec.branch_name} • {rec.role_name}</div>
                    </div>
                    <div className="payroll-card-payable">
                      <div className="payroll-card-payable-num">{rec.netPayableDays.toFixed(1)}d</div>
                      <div className="payroll-card-payable-lbl">Payable Days</div>
                    </div>
                  </div>

                  <div className="payroll-card-grid">
                    <div className="payroll-card-metric">
                      <div className="payroll-card-metric-val">{rec.scheduledWorkingDays}</div>
                      <div className="payroll-card-metric-lbl">Scheduled</div>
                    </div>
                    <div className="payroll-card-metric">
                      <div className="payroll-card-metric-val" style={{ color: '#60a5fa' }}>
                        {rec.paidLeaveDays > 0 ? `${rec.paidLeaveDays.toFixed(1)}d` : '0'}
                      </div>
                      <div className="payroll-card-metric-lbl">Paid Leave</div>
                    </div>
                    <div className="payroll-card-metric">
                      <div className="payroll-card-metric-val" style={{ color: hasLop ? '#f87171' : 'var(--text-muted)' }}>
                        {hasLop ? `-${rec.lopDays.toFixed(1)}d` : '0'}
                      </div>
                      <div className="payroll-card-metric-lbl">LOP (Unpaid)</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                    <span>Calendar: <strong>{rec.calendarDays}d</strong></span>
                    <span>Off &amp; Holidays: <strong>{rec.offDays + rec.holidays}d</strong></span>
                  </div>

                  {rec.leaveBreakdown && Object.keys(rec.leaveBreakdown).length > 0 && (
                    <div className="payroll-card-breakdown">
                      {Object.entries(rec.leaveBreakdown).map(([typeName, days]) => (
                        <span
                          key={typeName}
                          style={{
                            background: typeName.toLowerCase().includes('unpaid') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: typeName.toLowerCase().includes('unpaid') ? '#f87171' : '#60a5fa',
                            border: `1px solid ${typeName.toLowerCase().includes('unpaid') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {typeName}: {days}d
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
