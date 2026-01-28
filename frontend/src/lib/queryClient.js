import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a QueryClient with sensible defaults for the CRM app
 * 
 * Configuration:
 * - staleTime: 5 minutes - data is considered fresh for 5 min
 * - gcTime: 30 minutes - unused data is garbage collected after 30 min
 * - refetchOnWindowFocus: true - refetch when user returns to tab
 * - retry: 1 - retry failed requests once
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache data for 30 minutes
            gcTime: 30 * 60 * 1000,
            // Refetch when window regains focus
            refetchOnWindowFocus: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Retry failed requests once
            retry: 1,
            // Delay before retry
            retryDelay: 1000,
        },
        mutations: {
            // Retry mutations once
            retry: 1,
        },
    },
});

/**
 * Query keys factory for consistent cache key management
 * 
 * Usage:
 *   queryKeys.customers.all          -> ['customers']
 *   queryKeys.customers.detail(id)   -> ['customers', id]
 *   queryKeys.jobs.all               -> ['jobs']
 *   queryKeys.jobs.detail(id)        -> ['jobs', id]
 */
export const queryKeys = {
    // Customers
    customers: {
        all: ['customers'],
        overview: (params) => ['customers', 'overview', params],
        detail: (id) => ['customers', id],
        thread: (id, params) => ['customers', id, 'thread', params],
    },

    // Jobs
    jobs: {
        all: ['jobs'],
        list: (params) => ['jobs', 'list', params],
        detail: (id) => ['jobs', id],
    },

    // Job Items
    jobItems: {
        byJob: (jobId) => ['jobItems', 'job', jobId],
    },

    // Job Images
    jobImages: {
        byJob: (jobId) => ['jobImages', 'job', jobId],
    },

    // Leads
    leads: {
        all: ['leads'],
        list: (params) => ['leads', 'list', params],
    },

    // Messages
    messages: {
        all: ['messages'],
        unreadCount: ['messages', 'unreadCount'],
    },

    // Inbox
    inbox: {
        all: ['inbox'],
        list: (params) => ['inbox', 'list', params],
        detail: (id) => ['inbox', id],
    },

    // Boats
    boats: {
        all: ['boats'],
        list: (params) => ['boats', 'list', params],
        detail: (id) => ['boats', id],
    },

    // Invoices
    invoices: {
        all: ['invoices'],
        list: (params) => ['invoices', 'list', params],
        detail: (id) => ['invoices', id],
    },

    // Notes
    notes: {
        all: ['notes'],
        list: (params) => ['notes', 'list', params],
        detail: (id) => ['notes', id],
        reminders: (daysAhead) => ['notes', 'reminders', daysAhead],
    },

    // Trash
    trash: {
        all: ['trash'],
        counts: ['trash', 'counts'],
        messages: ['trash', 'messages'],
        customers: ['trash', 'customers'],
    },

    // Settings
    settings: {
        all: ['settings'],
        byKey: (key) => ['settings', key],
        businessInfo: ['settings', 'businessInfo'],
    },
};

// Re-export QueryClientProvider for convenience
export { QueryClientProvider };
