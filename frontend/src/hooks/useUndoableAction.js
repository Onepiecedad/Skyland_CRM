import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for undoable actions with automatic timer
 * 
 * Provides a way to delay destructive actions and allow the user to undo them.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Time in milliseconds before action is executed (default: 5000)
 * @param {function} options.onExecute - Function to call when action is executed
 * @param {function} options.onUndo - Optional function to call when action is undone
 * @returns {Object} - { initiateAction, cancelAction, isPending, remainingTime, progress }
 */
export function useUndoableAction({
    timeout = 5000,
    onExecute,
    onUndo,
}) {
    const [isPending, setIsPending] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [pendingData, setPendingData] = useState(null);
    const timerRef = useRef(null);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const initiateAction = useCallback((data = null) => {
        // Clear any existing timers
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);

        setPendingData(data);
        setIsPending(true);
        setRemainingTime(timeout);
        startTimeRef.current = Date.now();

        // Update remaining time every 100ms for smooth progress
        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const remaining = Math.max(0, timeout - elapsed);
            setRemainingTime(remaining);
        }, 100);

        // Execute action after timeout
        timerRef.current = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsPending(false);
            setRemainingTime(0);
            if (onExecute) {
                onExecute(data);
            }
            setPendingData(null);
        }, timeout);
    }, [timeout, onExecute]);

    const cancelAction = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);

        const data = pendingData;
        setIsPending(false);
        setRemainingTime(0);
        setPendingData(null);

        if (onUndo) {
            onUndo(data);
        }
    }, [onUndo, pendingData]);

    // Calculate progress percentage (0-100)
    const progress = isPending ? ((timeout - remainingTime) / timeout) * 100 : 0;

    return {
        initiateAction,
        cancelAction,
        isPending,
        remainingTime,
        progress,
        pendingData,
    };
}

export default useUndoableAction;
