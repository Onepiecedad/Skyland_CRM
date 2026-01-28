import { supabase } from '../supabase';

/**
 * Helper to simulate Axios response structure for API consistency.
 * @param {any} data - The data to return
 * @param {Error|null} error - Any error that occurred
 * @returns {{ data: any }} Formatted response object
 */
export const formatResponse = (data, error) => {
    if (error) {
        console.error('Supabase Error:', error);
        throw error;
    }
    return { data };
};

// Re-export supabase for use in API modules
export { supabase };
