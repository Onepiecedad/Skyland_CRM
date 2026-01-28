import { X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * UndoToast - A toast component with undo functionality and progress timer
 * 
 * Displays a message with a visual countdown timer and undo button.
 * Designed to work with the useUndoableAction hook.
 * 
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {number} props.remainingTime - Remaining time in milliseconds
 * @param {function} props.onUndo - Function to call when undo is clicked
 * @param {function} props.onDismiss - Optional function to call when dismissed
 * @param {boolean} props.isVisible - Whether the toast is visible
 */
export function UndoToast({
    message,
    progress = 0,
    remainingTime = 5000,
    onUndo,
    onDismiss,
    isVisible = false,
}) {
    if (!isVisible) return null;

    // Calculate remaining seconds
    const remainingSeconds = Math.ceil(remainingTime / 1000);

    return (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-auto z-50 animate-in slide-in-from-bottom-5 duration-200">
            <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-xl shadow-2xl overflow-hidden max-w-md mx-auto md:mx-0">
                {/* Progress bar */}
                <div className="h-1 bg-zinc-700 relative">
                    <div
                        className="absolute left-0 top-0 h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: `${100 - progress}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex items-center gap-3 p-4">
                    <div className="flex-1 flex items-center gap-3">
                        <div className="text-sm font-medium">
                            {message}
                        </div>
                        <span className="text-xs text-zinc-400 tabular-nums">
                            {remainingSeconds}s
                        </span>
                    </div>

                    {/* Undo button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onUndo}
                        className="text-primary hover:text-primary/90 hover:bg-primary/10 font-semibold shrink-0"
                    >
                        <Undo2 className="h-4 w-4 mr-1.5" />
                        Ångra
                    </Button>

                    {/* Dismiss button */}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
                            aria-label="Stäng"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UndoToast;
