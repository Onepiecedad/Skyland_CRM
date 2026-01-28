/**
 * React Query hooks for Notes API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesAPI } from '../api';
import { queryKeys } from '../queryClient';

/**
 * Fetch all notes with optional filtering
 * @param {Object} params - Filter parameters
 * @returns {Object} Query result
 */
export const useNotes = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.notes.list(params),
        queryFn: () => notesAPI.getAll(params),
        select: (response) => response.data,
    });
};

/**
 * Fetch a single note by ID
 * @param {string} noteId - Note ID
 * @returns {Object} Query result
 */
export const useNote = (noteId) => {
    return useQuery({
        queryKey: queryKeys.notes.detail(noteId),
        queryFn: () => notesAPI.getById(noteId),
        select: (response) => response.data,
        enabled: !!noteId,
    });
};

/**
 * Fetch upcoming reminders
 * @param {number} daysAhead - Days to look ahead
 * @returns {Object} Query result
 */
export const useUpcomingReminders = (daysAhead = 7) => {
    return useQuery({
        queryKey: queryKeys.notes.reminders(daysAhead),
        queryFn: () => notesAPI.getUpcomingReminders(daysAhead),
        select: (response) => response.data,
    });
};

/**
 * Create a new note
 * @returns {Object} Mutation result
 */
export const useCreateNote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (noteData) => notesAPI.create(noteData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
        },
    });
};

/**
 * Update a note
 * @returns {Object} Mutation result
 */
export const useUpdateNote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ noteId, data }) => notesAPI.update(noteId, data),
        onSuccess: (_, { noteId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(noteId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
        },
    });
};

/**
 * Delete a note
 * @returns {Object} Mutation result
 */
export const useDeleteNote = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (noteId) => notesAPI.delete(noteId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
        },
    });
};

/**
 * Toggle note pin status
 * @returns {Object} Mutation result
 */
export const useToggleNotePin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ noteId, isPinned }) => notesAPI.togglePin(noteId, isPinned),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
        },
    });
};
