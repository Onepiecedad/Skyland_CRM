/**
 * React Query hooks for Customers API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '../api';
import { queryKeys } from '../queryClient';

/**
 * Fetch customers overview with optional filtering
 * @param {Object} params - Filter parameters
 * @returns {Object} Query result
 */
export const useCustomersOverview = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.customers.overview(params),
        queryFn: () => customersAPI.getOverview(params),
        select: (response) => response.data,
    });
};

/**
 * Fetch a single customer by ID
 * @param {string} customerId - Customer ID
 * @returns {Object} Query result
 */
export const useCustomer = (customerId) => {
    return useQuery({
        queryKey: queryKeys.customers.detail(customerId),
        queryFn: () => customersAPI.getById(customerId),
        select: (response) => response.data,
        enabled: !!customerId,
    });
};

/**
 * Fetch customer message thread
 * @param {string} customerId - Customer ID
 * @param {Object} params - Pagination params
 * @returns {Object} Query result
 */
export const useCustomerThread = (customerId, params = {}) => {
    return useQuery({
        queryKey: queryKeys.customers.thread(customerId, params),
        queryFn: () => customersAPI.getThread(customerId, params),
        select: (response) => response.data,
        enabled: !!customerId,
    });
};

/**
 * Create a new customer
 * @returns {Object} Mutation result
 */
export const useCreateCustomer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (customerData) => customersAPI.create(customerData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
        },
    });
};

/**
 * Update a customer
 * @returns {Object} Mutation result
 */
export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ customerId, data }) => customersAPI.update(customerId, data),
        onSuccess: (_, { customerId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
        },
    });
};

/**
 * Delete a customer
 * @returns {Object} Mutation result
 */
export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (customerId) => customersAPI.delete(customerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
        },
    });
};
