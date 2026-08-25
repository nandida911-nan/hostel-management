const API_BASE = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('hostel_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
  getMe: () => request('/auth/me'),
  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/auth/users?${qs}`);
  },

  // Rooms
  getBlocks: () => request('/rooms/blocks'),
  getRooms: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/rooms?${qs}`);
  },
  getOccupancyStats: () => request('/rooms/occupancy-stats'),
  allocateRoom: (data) => request('/rooms/allocate', { method: 'POST', body: data }),
  deallocateRoom: (data) => request('/rooms/deallocate', { method: 'POST', body: data }),

  // Outpasses
  applyOutpass: (data) => request('/outpasses/apply', { method: 'POST', body: data }),
  getMyPasses: () => request('/outpasses/my-passes'),
  getAllPasses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/outpasses/all?${qs}`);
  },
  updatePassStatus: (id, data) => request(`/outpasses/${id}/status`, { method: 'PATCH', body: data }),
  cancelPass: (id) => request(`/outpasses/${id}/cancel`, { method: 'POST' }),

  // Security
  verifyPass: (data) => request('/security/verify', { method: 'POST', body: data }),
  gateAction: (data) => request('/security/gate-action', { method: 'POST', body: data }),
  getGateLogs: (limit = 50) => request(`/security/logs?limit=${limit}`),

  // Complaints
  fileComplaint: (data) => request('/complaints', { method: 'POST', body: data }),
  getComplaints: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/complaints?${qs}`);
  },
  updateComplaint: (id, data) => request(`/complaints/${id}`, { method: 'PATCH', body: data }),

  // Mess Menu
  getMessMenu: () => request('/mess-menu'),
  updateMessMenu: (data) => request('/mess-menu', { method: 'PUT', body: data }),

  // Notices
  getNotices: () => request('/notices'),
  createNotice: (data) => request('/notices', { method: 'POST', body: data }),
  deleteNotice: (id) => request(`/notices/${id}`, { method: 'DELETE' })
};