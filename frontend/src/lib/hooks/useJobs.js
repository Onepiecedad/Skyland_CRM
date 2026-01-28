/**
 * React Query hooks for Jobs API
 * Provides caching, background updates, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsAPI, jobItemsAPI, jobImagesAPI } from '../api';
import { queryKeys } from '../queryClient';

// ===== Query Hooks =====

/**
 * Fetch all jobs with optional filtering
 * @param {Object} params - Filter parameters
 * @returns {Object} Query result with data, loading, error states
 */
export const useJobs = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.jobs.list(params),
        queryFn: () => jobsAPI.getAll(params),
        select: (response) => response.data,
    });
};

/**
 * Fetch a single job by ID with items
 * @param {string} jobId - Job ID
 * @returns {Object} Query result
 */
export const useJob = (jobId) => {
    return useQuery({
        queryKey: queryKeys.jobs.detail(jobId),
        queryFn: () => jobsAPI.getById(jobId),
        select: (response) => response.data,
        enabled: !!jobId,
    });
};

/**
 * Fetch job images
 * @param {string} jobId - Job ID
 * @returns {Object} Query result
 */
export const useJobImages = (jobId) => {
    return useQuery({
        queryKey: queryKeys.jobImages.byJob(jobId),
        queryFn: () => jobImagesAPI.getByJobId(jobId),
        select: (response) => response.data || [],
        enabled: !!jobId,
    });
};

// ===== Mutation Hooks =====

/**
 * Create a new job
 * @returns {Object} Mutation result
 */
export const useCreateJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobData) => jobsAPI.create(jobData),
        onSuccess: () => {
            // Invalidate jobs list to refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        },
    });
};

/**
 * Update an existing job
 * @returns {Object} Mutation result
 */
export const useUpdateJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ jobId, data }) => jobsAPI.update(jobId, data),
        onSuccess: (_, { jobId }) => {
            // Invalidate both the specific job and the list
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        },
    });
};

/**
 * Delete a job
 * @returns {Object} Mutation result
 */
export const useDeleteJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId) => jobsAPI.delete(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        },
    });
};

/**
 * Quick status update for a job (optimistic update)
 * @returns {Object} Mutation result
 */
export const useUpdateJobStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ jobId, status }) => jobsAPI.update(jobId, { status }),
        // Optimistic update
        onMutate: async ({ jobId, status }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(jobId) });

            // Snapshot previous value
            const previousJob = queryClient.getQueryData(queryKeys.jobs.detail(jobId));

            // Optimistically update
            if (previousJob) {
                queryClient.setQueryData(queryKeys.jobs.detail(jobId), {
                    ...previousJob,
                    data: { ...previousJob.data, status }
                });
            }

            return { previousJob };
        },
        onError: (err, { jobId }, context) => {
            // Rollback on error
            if (context?.previousJob) {
                queryClient.setQueryData(queryKeys.jobs.detail(jobId), context.previousJob);
            }
        },
        onSettled: (_, __, { jobId }) => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
        },
    });
};

// ===== Job Items Mutations =====

/**
 * Add an item to a job
 * @returns {Object} Mutation result
 */
export const useAddJobItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (itemData) => jobItemsAPI.create(itemData),
        onSuccess: (_, itemData) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(itemData.job_id) });
        },
    });
};

/**
 * Delete a job item
 * @returns {Object} Mutation result
 */
export const useDeleteJobItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ itemId, jobId }) => jobItemsAPI.delete(itemId),
        onSuccess: (_, { jobId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
        },
    });
};

// ===== Job Images Mutations =====

/**
 * Upload a job image
 * @returns {Object} Mutation result
 */
export const useUploadJobImage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ jobId, file, category, caption }) =>
            jobImagesAPI.upload(jobId, file, category, caption),
        onSuccess: (_, { jobId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobImages.byJob(jobId) });
        },
    });
};

/**
 * Delete a job image
 * @returns {Object} Mutation result
 */
export const useDeleteJobImage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ imageId, jobId }) => jobImagesAPI.delete(imageId),
        onSuccess: (_, { jobId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobImages.byJob(jobId) });
        },
    });
};
