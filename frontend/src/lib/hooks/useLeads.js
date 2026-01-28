/**
 * React Query hooks for Leads API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsAPI } from '../api';
import { queryKeys } from '../queryClient';

/**
 * Fetch all leads with optional filtering
 * @param {Object} params - Filter parameters
 * @returns {Object} Query result
 */
export const useLeads = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.leads.list(params),
        queryFn: () => leadsAPI.getAll(params),
        select: (response) => response.data,
    });
};

/**
 * Create a new lead
 * @returns {Object} Mutation result
 */
export const useCreateLead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (leadData) => leadsAPI.create(leadData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
        },
    });
};

/**
 * Update a lead
 * @returns {Object} Mutation result
 */
export const useUpdateLead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ leadId, data }) => leadsAPI.update(leadId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
        },
    });
};

/**
 * Delete a lead
 * @returns {Object} Mutation result
 */
export const useDeleteLead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (leadId) => leadsAPI.delete(leadId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
        },
    });
};
