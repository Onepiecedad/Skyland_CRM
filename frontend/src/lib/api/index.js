/**
 * API Module Index
 * 
 * This file re-exports all API modules for backward compatibility.
 * Components can import either from here or directly from individual modules:
 * 
 * Option 1 (recommended for single API):
 *   import { customersAPI } from '../lib/api/customersAPI';
 * 
 * Option 2 (for multiple APIs):
 *   import { customersAPI, jobsAPI, messagesAPI } from '../lib/api';
 * 
 * Option 3 (legacy - works exactly as before):
 *   import { customersAPI } from '../lib/api';
 */

// Re-export all individual APIs
export { customersAPI } from './customersAPI';
export { leadsAPI } from './leadsAPI';
export { messagesAPI } from './messagesAPI';
export { trashAPI } from './trashAPI';
export { inboxAPI } from './inboxAPI';
export { jobsAPI } from './jobsAPI';
export { jobItemsAPI } from './jobItemsAPI';
export { jobImagesAPI } from './jobImagesAPI';
export { boatsAPI } from './boatsAPI';
export { invoicesAPI } from './invoicesAPI';
export { invoiceItemsAPI } from './invoiceItemsAPI';
export { settingsAPI } from './settingsAPI';
export { notesAPI } from './notesAPI';

// Default api export for legacy compatibility (deprecated)
const api = {
    get: async (url) => { console.warn("Direct api.get used - not fully supported", url); },
    post: async (url, data) => { console.warn("Direct api.post used - not fully supported"); },
    put: async (url, data) => { console.warn("Direct api.put used - not fully supported"); },
    delete: async (url) => { console.warn("Direct api.delete used - not fully supported"); }
};

export default api;
