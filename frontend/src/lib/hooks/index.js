/**
 * React Query hooks - barrel export
 */

// Jobs hooks
export {
    useJobs,
    useJob,
    useJobImages,
    useCreateJob,
    useUpdateJob,
    useDeleteJob,
    useUpdateJobStatus,
    useAddJobItem,
    useDeleteJobItem,
    useUploadJobImage,
    useDeleteJobImage,
} from './useJobs';

// Customers hooks
export {
    useCustomersOverview,
    useCustomer,
    useCustomerThread,
    useCreateCustomer,
    useUpdateCustomer,
    useDeleteCustomer,
} from './useCustomers';

// Leads hooks
export {
    useLeads,
    useCreateLead,
    useUpdateLead,
    useDeleteLead,
} from './useLeads';

// Notes hooks
export {
    useNotes,
    useNote,
    useUpcomingReminders,
    useCreateNote,
    useUpdateNote,
    useDeleteNote,
    useToggleNotePin,
} from './useNotes';
