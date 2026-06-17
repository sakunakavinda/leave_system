// API helper functions
const BASE_URL = '/api';

async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }
  return res.json();
}

export const api = {
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
  getEmployees: () => fetchApi('/employees'),
  addEmployee: (data) => fetchApi('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => fetchApi(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => fetchApi(`/employees/${id}`, { method: 'DELETE' }),

  // Managers
  loginManager: (username, password) => fetchApi('/managers/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getManagers: () => fetchApi('/managers'),
  addManager: (data) => fetchApi('/managers', { method: 'POST', body: JSON.stringify(data) }),
  updateManager: (id, data) => fetchApi(`/managers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteManager: (id) => fetchApi(`/managers/${id}`, { method: 'DELETE' }),

  // Rules
  getRules: () => fetchApi('/rules').then(res => res.map(r => ({ ...r, annualLeave: r.annual_leave, sickLeave: r.sick_leave, casualLeave: r.casual_leave, maxPerDay: r.max_per_day }))),
  saveRule: (data) => fetchApi('/rules', { method: 'POST', body: JSON.stringify(data) }).then(r => ({ ...r, annualLeave: r.annual_leave, sickLeave: r.sick_leave, casualLeave: r.casual_leave, maxPerDay: r.max_per_day })),
  updateRule: (id, data) => fetchApi(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => ({ ...r, annualLeave: r.annual_leave, sickLeave: r.sick_leave, casualLeave: r.casual_leave, maxPerDay: r.max_per_day })),

  // Applications
  getApplications: () => fetchApi('/applications'),
  addApplication: (data) => fetchApi('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplicationStatus: (id, status) => fetchApi(`/applications/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  confirmApplication: (id, secretCode) => fetchApi(`/applications/${id}/confirm`, { method: 'PUT', body: JSON.stringify({ secretCode }) }),
  deleteApplication: (id) => fetchApi(`/applications/${id}`, { method: 'DELETE' }),
};
