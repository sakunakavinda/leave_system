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
          fontWeight: 600
        }}>
          <span>{toast.isError ? '⚠️' : '✓'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
        color: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 15px rgba(6, 78, 59, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>📊</span>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Payroll & Loss of Pay (LOP) Exporter</h2>
            </div>
            <p style={{ margin: 0, opacity: 0.85, fontSize: '14px', maxWidth: '750px', lineHeight: 1.5 }}>
              Monthly reconciliation of employee attendance, paid leaves, and Loss of Pay (LOP) deductions for standard domestic payroll processing. All calculations account for branch weekend schedules, gazetted holidays, roster assignments, and contingency shields.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>📥</span>
            <span>{exporting ? 'Generating CSV...' : 'Export Payroll CSV'}</span>
          </button>
        </div>

        {/* Aggregate KPI Summary Cards */}
        {data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff Headcount</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{data.totalEmployees}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled Days</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                {data.records?.reduce((acc, r) => acc + r.scheduledWorkingDays, 0) || 0}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Paid Leaves</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#93c5fd' }}>
                {data.records?.reduce((acc, r) => acc + r.paidLeaveDays, 0).toFixed(1) || 0}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total LOP Deductions</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: data.totalLopDays > 0 ? '#fca5a5' : '#86efac' }}>
                {data.totalLopDays?.toFixed(1) || 0}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Payable Days</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#6ee7b7' }}>
                {data.totalPayableDays?.toFixed(1) || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="filter-row" style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="filter-item" style={{ minWidth: '180px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            Month:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item" style={{ minWidth: '120px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            Year:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="filter-item" style={{ minWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
            Branch Facility:
          </label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">🏢 All Domestic Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={loadPayrollSummary}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            🔄 Refresh Summary
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <p>Calculating month payroll records & LOP deductions...</p>
        </div>
      ) : !data || data.records.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1'
        }}>
          <span style={{ fontSize: '40px' }}>📋</span>
          <h3 style={{ margin: '12px 0 6px 0', color: '#334155' }}>No Active Employees Found</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            There are no active employees assigned to the selected branch.
          </p>
        </div>
      ) : (
        <div className="table-container" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Branch & Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Calendar Days</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Off Days / Holidays</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Scheduled Work Days</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Paid Leaves</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>LOP (Unpaid)</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', background: '#f0fdf4', color: '#166534' }}>Net Payable Days</th>
                <th style={{ padding: '12px 16px' }}>Leave Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map(rec => {
                const hasLop = rec.lopDays > 0;
                return (
                  <tr
                    key={rec.employee_id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: hasLop ? '#fffbeb' : '#fff'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                      {rec.employee_name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#334155', fontWeight: 600 }}>🏢 {rec.branch_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{rec.role_name}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>
                      {rec.calendarDays}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>
                      {rec.offDays + rec.holidays}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                      {rec.scheduledWorkingDays}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                      {rec.paidLeaveDays > 0 ? `${rec.paidLeaveDays.toFixed(1)}d` : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {hasLop ? (
                        <span style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '13px'
                        }}>
                          -{rec.lopDays.toFixed(1)}d
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>0</span>
                      )}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '15px',
                      background: '#f0fdf4',
                      color: '#15803d'
                    }}>
                      {rec.netPayableDays.toFixed(1)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                      {rec.leaveBreakdown && Object.keys(rec.leaveBreakdown).length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {Object.entries(rec.leaveBreakdown).map(([typeName, days]) => (
                            <span
                              key={typeName}
                              style={{
                                background: typeName.toLowerCase().includes('unpaid') ? '#fee2e2' : '#eff6ff',
                                color: typeName.toLowerCase().includes('unpaid') ? '#991b1b' : '#1e40af',
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
                        <span style={{ color: '#94a3b8' }}>No leaves taken</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
