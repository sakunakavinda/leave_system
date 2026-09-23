// API helper functions
const BASE_URL = '/api';

export const tokenStorage = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  },
  getUser: () => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },
  setUser: (user) => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  },
  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

async function fetchApi(endpoint, options = {}) {
  const token = tokenStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/managers/login') {
      // Session expired or invalid
      tokenStorage.clear();
    }
    throw new Error(error.error || 'API request failed');
  }
  return res.json();
}

export const formatBranchName = (branchOrName, location) => {
  if (!branchOrName) return '';
  if (typeof branchOrName === 'object') {
    const name = branchOrName.name || '';
    const loc = branchOrName.location ? String(branchOrName.location).trim() : '';
    if (!name) return loc;
    return loc ? `${name} (${loc})` : name;
  }
  const loc = location ? String(location).trim() : '';
  return loc ? `${branchOrName} (${loc})` : String(branchOrName);
};

export const api = {
  // Auth
  loginManager: async (username, password) => {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      tokenStorage.setToken(data.token);
      tokenStorage.setUser(data.user);
    }
    return data.user || data;
  },
  getCurrentUser: () => fetchApi('/auth/me'),
  verifyEmployeeCode: (secretCode) => fetchApi('/auth/employee-verify', {
    method: 'POST',
    body: JSON.stringify({ secretCode })
  }),
  logout: () => {
    tokenStorage.clear();
    return fetchApi('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  // Branches
  getBranches: async () => {
    const list = await fetchApi('/branches');
    return Array.isArray(list) ? list.map(b => ({
      ...b,
      displayName: formatBranchName(b)
    })) : [];
  },
  addBranch: async (data) => {
    const res = await fetchApi('/branches', { method: 'POST', body: JSON.stringify(data) });
    return res ? { ...res, displayName: formatBranchName(res) } : res;
  },
  updateBranch: async (id, data) => {
    const res = await fetchApi(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return res ? { ...res, displayName: formatBranchName(res) } : res;
  },
  deleteBranch: (id) => fetchApi(`/branches/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => fetchApi('/departments'),
  addDepartment: (data) => fetchApi('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id, data) => fetchApi(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id) => fetchApi(`/departments/${id}`, { method: 'DELETE' }),

  // Roles
  getRoles: () => fetchApi('/roles'),
  addRole: (data) => fetchApi('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id, data) => fetchApi(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id) => fetchApi(`/roles/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.includeSecretCode) query.set('includeSecretCode', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/employees${qs}`);
  },
  addEmployee: (data) => fetchApi('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => fetchApi(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => fetchApi(`/employees/${id}`, { method: 'DELETE' }),

  // Managers / Users
  getManagers: () => fetchApi('/managers'),
  addManager: (data) => fetchApi('/managers', { method: 'POST', body: JSON.stringify(data) }),
  updateManager: (id, data) => fetchApi(`/managers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteManager: (id) => fetchApi(`/managers/${id}`, { method: 'DELETE' }),
  getRolePermissions: () => fetchApi('/managers/role-permissions'),
  updateRolePermissions: (data) => fetchApi('/managers/role-permissions', { method: 'PUT', body: JSON.stringify(data) }),
  resetRolePermissions: () => fetchApi('/managers/role-permissions/reset', { method: 'POST' }),

  // Rules
  getRules: () => fetchApi('/rules').then(res => res.map(r => ({ ...r, maxPerDay: r.max_per_day }))),
  saveRule: (data) => fetchApi('/rules', { method: 'POST', body: JSON.stringify(data) }).then(r => ({ ...r, maxPerDay: r.max_per_day })),
  updateRule: (id, data) => fetchApi(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => ({ ...r, maxPerDay: r.max_per_day })),

  // Applications
  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/applications${qs}`);
  },
  addApplication: (data) => fetchApi('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplicationStatus: (id, status, extra = {}) => fetchApi(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, ...extra }) }),
  confirmApplication: (id, secretCode) => fetchApi(`/applications/${id}/confirm`, { method: 'PUT', body: JSON.stringify({ secretCode }) }),
  deleteApplication: (id) => fetchApi(`/applications/${id}`, { method: 'DELETE' }),
  getLeaveOverview: (secretCode) => fetchApi(`/applications/overview/${secretCode}`),
  uploadApplicationDocument: (id, data) => fetchApi(`/applications/${id}/document`, { method: 'POST', body: JSON.stringify(data) }),
  reviewApplicationDocument: (id, data) => fetchApi(`/applications/${id}/review-document`, { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getSettings: () => fetchApi('/settings'),
  updateSettings: (data) => fetchApi('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Leave Types
  getLeaveTypes: () => fetchApi('/leave-types'),
  addLeaveType: (data) => fetchApi('/leave-types', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveType: (id, data) => fetchApi(`/leave-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLeaveType: (id) => fetchApi(`/leave-types/${id}`, { method: 'DELETE' }),

  // Leave Profiles
  getLeaveProfiles: () => fetchApi('/leave-profiles'),
  addLeaveProfile: (data) => fetchApi('/leave-profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveProfile: (id, data) => fetchApi(`/leave-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLeaveProfile: (id) => fetchApi(`/leave-profiles/${id}`, { method: 'DELETE' }),

  // Holidays & Schedules
  getHolidays: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.year) query.set('year', params.year);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/holidays${qs}`);
  },
  addHoliday: (data) => fetchApi('/holidays', { method: 'POST', body: JSON.stringify(data) }),
  updateHoliday: (id, data) => fetchApi(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHoliday: (id) => fetchApi(`/holidays/${id}`, { method: 'DELETE' }),
  calculateDeduction: (branch_id, leaveDates, employee_id = null) => fetchApi('/holidays/calculate-deduction', {
    method: 'POST',
    body: JSON.stringify({ branch_id, leaveDates, employee_id })
  }),
  getBranchSchedule: (branch_id) => fetchApi(`/holidays/schedules/${branch_id}`),
  updateBranchSchedule: (branch_id, data) => fetchApi(`/holidays/schedules/${branch_id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Operating Schedules
  getOperatingSchedules: () => fetchApi('/operating-schedules'),
  addOperatingSchedule: (data) => fetchApi('/operating-schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateOperatingSchedule: (id, data) => fetchApi(`/operating-schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOperatingSchedule: (id) => fetchApi(`/operating-schedules/${id}`, { method: 'DELETE' }),

  // Shift Masters
  getShifts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/shifts${qs}`);
  },
  addShift: (data) => fetchApi('/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id, data) => fetchApi(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id) => fetchApi(`/shifts/${id}`, { method: 'DELETE' }),

  // Employee Rosters
  getRosters: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.employee_id) query.set('employee_id', params.employee_id);
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/rosters${qs}`);
  },
  saveRoster: (data) => fetchApi('/rosters', { method: 'POST', body: JSON.stringify(data) }),
  bulkSaveRoster: (entries) => fetchApi('/rosters/bulk', { method: 'POST', body: JSON.stringify({ entries }) }),
  deleteRoster: (id) => fetchApi(`/rosters/${id}`, { method: 'DELETE' }),
  clearEmployeeRoster: (employeeId, params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/rosters/employee/${employeeId}${qs}`, { method: 'DELETE' });
  },

  // Fatigue & Substitution
  getAvailableSubstitutes: (data) => fetchApi('/employees/available-substitutes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Team Capacity Meter
  getTeamCapacity: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.date) query.set('date', params.date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/applications/capacity-meter${qs}`);
  },

  // Operational Contingencies
  getContingencies: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.status) query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/contingencies${qs}`);
  },
  addContingency: (data) => fetchApi('/contingencies', { method: 'POST', body: JSON.stringify(data) }),
  updateContingency: (id, data) => fetchApi(`/contingencies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContingency: (id) => fetchApi(`/contingencies/${id}`, { method: 'DELETE' }),
  applyRetroactiveShield: (id) => fetchApi(`/contingencies/${id}/apply-retroactive-shield`, { method: 'POST' }),

  // Payroll & LOP
  getPayrollSummary: (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.month) query.set('month', params.month);
    if (params.year) query.set('year', params.year);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/payroll/summary${qs}`);
  },
  downloadPayrollCsv: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.branch_id) query.set('branch_id', params.branch_id);
    if (params.month) query.set('month', params.month);
    if (params.year) query.set('year', params.year);
    const token = tokenStorage.getToken();
    const res = await fetch(`${BASE_URL}/payroll/export-csv?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(err.error || 'Failed to export CSV');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_LOP_M${params.month || 'ALL'}_${params.year || new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

