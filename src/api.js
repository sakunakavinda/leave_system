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
  logout: () => {
    tokenStorage.clear();
    return fetchApi('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  // Branches
  getBranches: () => fetchApi('/branches'),
  addBranch: (data) => fetchApi('/branches', { method: 'POST', body: JSON.stringify(data) }),
  updateBranch: (id, data) => fetchApi(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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

  // Managers
  getManagers: () => fetchApi('/managers'),
  addManager: (data) => fetchApi('/managers', { method: 'POST', body: JSON.stringify(data) }),
  updateManager: (id, data) => fetchApi(`/managers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteManager: (id) => fetchApi(`/managers/${id}`, { method: 'DELETE' }),

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
  updateApplicationStatus: (id, status) => fetchApi(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  confirmApplication: (id, secretCode) => fetchApi(`/applications/${id}/confirm`, { method: 'PUT', body: JSON.stringify({ secretCode }) }),
  deleteApplication: (id) => fetchApi(`/applications/${id}`, { method: 'DELETE' }),
  getLeaveOverview: (secretCode) => fetchApi(`/applications/overview/${secretCode}`),

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
};
