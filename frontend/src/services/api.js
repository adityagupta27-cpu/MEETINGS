const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are always sent and received
  };

  try {
    const res = await fetch(url, config);

    // 204 No Content
    if (res.status === 204) {
      return null;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the backend server. Please verify it is running.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Meetings
  getMeetings: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.meeting_type) query.append('meeting_type', params.meeting_type);
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.limit !== undefined) query.append('limit', params.limit);
    const qs = query.toString();
    return request(`/meetings${qs ? `?${qs}` : ''}`);
  },
  createMeeting: (payload) => request('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  getMeeting: (id) => request(`/meetings/${id}`),
  updateMeeting: (id, payload) => request(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteMeeting: (id) => request(`/meetings/${id}`, { method: 'DELETE' }),

  uploadTranscriptFile: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/meetings/${id}/transcript`, { method: 'POST', body: formData });
  },
  updateTranscriptText: (id, transcript) => {
    return request(`/meetings/${id}/transcript`, { method: 'POST', body: JSON.stringify({ transcript }) });
  },
  processAI: (id) => request(`/meetings/${id}/process-ai`, { method: 'POST' }),
  getMeetingActions: (id) => request(`/meetings/${id}/actions`),

  // Action Items
  getActions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.owner) query.append('owner', params.owner);
    if (params.meeting_id) query.append('meeting_id', params.meeting_id);
    if (params.is_overdue !== undefined && params.is_overdue !== null) query.append('is_overdue', params.is_overdue);
    const qs = query.toString();
    return request(`/actions${qs ? `?${qs}` : ''}`);
  },
  createAction: (payload) => request('/actions', { method: 'POST', body: JSON.stringify(payload) }),
  updateAction: (id, payload) => request(`/actions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAction: (id) => request(`/actions/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),
};
