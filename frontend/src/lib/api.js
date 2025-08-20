import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;
const API_TOKEN = 'skyland_dev_token_123';

// Configure axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// API functions
export const customersAPI = {
  getOverview: (params = {}) => {
    console.log('🔧 customersAPI.getOverview called with params:', params);
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const url = `/customers/overview?${searchParams.toString()}`;
    console.log('🌍 Final API URL:', `${API_BASE}${url}`);
    console.log('🔑 Using token:', API_TOKEN);
    return api.get(url);
  },
  
  getById: (customerId) => api.get(`/customers/${customerId}`),
  
  getThread: (customerId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return api.get(`/customers/${customerId}/thread?${searchParams.toString()}`);
  },

  create: (customerData) => api.post('/customers', customerData),
  
  update: (customerId, customerData) => api.put(`/customers/${customerId}`, customerData),
  
  delete: (customerId) => api.delete(`/customers/${customerId}`),
};

export const leadsAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return api.get(`/leads?${searchParams.toString()}`);
  },
};

export const inboxAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return api.get(`/inbox?${searchParams.toString()}`);
  },
};

export default api;