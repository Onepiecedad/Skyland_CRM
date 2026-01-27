import { useState, useRef } from 'react';
import { Trash2, ChevronRight } from 'lucide-react';

/**
 * SwipeableCard - A card component with swipe actions for mobile
 * 
 * Features a "locking" swipe mechanism: swiping reveals a confirmation button
 * that the user must tap to confirm the action.
 * 
 * @param {ReactNode} children - The card content
 * @param {function} onSwipeLeft - Action when left action is confirmed
 * @param {function} onSwipeRight - Action when right action is confirmed
 * @param {string} leftLabel - Label for left swipe action
 * @param {string} rightLabel - Label for right swipe action
 * @param {string} leftColor - Background color for left action (default: blue)
 * @param {string} rightColor - Background color for right action (default: red)
 * @param {Component} LeftIcon - Custom icon for left action (default: ChevronRight)
 * @param {Component} RightIcon - Custom icon for right action (default: Trash2)
 * @param {boolean} disabled - Disable swipe actions
 */
export function SwipeableCard({
    children,
    onSwipeLeft,
    onSwipeRight,
    leftLabel = 'Svara',
    rightLabel = 'Radera',
    leftColor = 'bg-blue-500 hover:bg-blue-600',
    rightColor = 'bg-red-500 hover:bg-red-600',
    LeftIcon = ChevronRight,
    RightIcon = Trash2,
    disabled = false,
    className = '',
}) {
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [lockedDirection, setLockedDirection] = useState(null); // 'left' | 'right' | null
    const startX = useRef(0);
    const startY = useRef(0);
    const currentX = useRef(0);
    const isScrolling = useRef(null);
    const containerRef = useRef(null);

    const threshold = 80; // Minimum swipe distance to lock
    const lockedOffset = 100; // How much to offset when locked

    const handleTouchStart = (e) => {
        if (disabled || lockedDirection) return; // Don't start new swipe if locked
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        currentX.current = startX.current;
        isScrolling.current = null;
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (disabled || !isSwiping || lockedDirection) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const diffX = touchX - startX.current;
        const diffY = touchY - startY.current;

        // Determine if this is a horizontal or vertical scroll
        if (isScrolling.current === null) {
            isScrolling.current = Math.abs(diffY) > Math.abs(diffX);
        }

        // If scrolling vertically, don't interfere
        if (isScrolling.current) {
            return;
        }

        // Prevent vertical scroll when swiping horizontally
        e.preventDefault();

        currentX.current = touchX;

        // Apply resistance at the edges
        let newTranslateX = diffX;
        if (Math.abs(diffX) > lockedOffset) {
            newTranslateX = diffX > 0 ? lockedOffset : -lockedOffset;
        }

        // Only allow swipe in directions that have handlers
        if ((diffX > 0 && !onSwipeRight) || (diffX < 0 && !onSwipeLeft)) {
            newTranslateX = 0;
        }

        setTranslateX(newTranslateX);
    };

    const handleTouchEnd = () => {
        if (disabled || lockedDirection) return;
        setIsSwiping(false);

        const diffX = currentX.current - startX.current;

        // Check if swipe threshold was met - lock the card
        if (diffX > threshold && onSwipeRight) {
            setLockedDirection('right');
            setTranslateX(lockedOffset);
        } else if (diffX < -threshold && onSwipeLeft) {
            setLockedDirection('left');
            setTranslateX(-lockedOffset);
        } else {
            // Not enough swipe, animate back
            setTranslateX(0);
        }

        isScrolling.current = null;
    };

    const handleTouchCancel = () => {
        if (lockedDirection) return;
        setIsSwiping(false);
        setTranslateX(0);
        isScrolling.current = null;
    };

    const handleConfirm = () => {
        if (lockedDirection === 'right' && onSwipeRight) {
            onSwipeRight();
        } else if (lockedDirection === 'left' && onSwipeLeft) {
            onSwipeLeft();
        }
        // Reset
        setLockedDirection(null);
        setTranslateX(0);
    };

    const handleCancel = () => {
        setLockedDirection(null);
        setTranslateX(0);
    };

    // Handle tap outside to cancel
    const handleCardClick = (e) => {
        if (lockedDirection) {
            e.stopPropagation();
            handleCancel();
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden rounded-lg ${className}`}
        >
            {/* Background actions */}
            <div className="absolute inset-0 flex">
                {/* Right action (swipe right reveals this on left) */}
                {onSwipeRight && (
                    <button
                        onClick={lockedDirection === 'right' ? handleConfirm : undefined}
                        className={`flex items-center justify-center px-4 w-1/2 ${rightColor} text-white transition-colors ${lockedDirection === 'right' ? 'cursor-pointer' : ''}`}
                    >
                        <RightIcon className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">{rightLabel}</span>
                    </button>
                )}

                {/* Left action (swipe left reveals this on right) */}
                {onSwipeLeft && (
                    <button
                        onClick={lockedDirection === 'left' ? handleConfirm : undefined}
                        className={`flex items-center justify-center px-4 w-1/2 ml-auto ${leftColor} text-white transition-colors ${lockedDirection === 'left' ? 'cursor-pointer' : ''}`}
                    >
                        <LeftIcon className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">{leftLabel}</span>
                    </button>
                )}
            </div>

            {/* Foreground card */}
            <div
                className={`relative bg-background transition-transform ${!isSwiping ? 'duration-200' : 'duration-0'}`}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
                onClick={handleCardClick}
            >
                {children}
            </div>
        </div>
    );
}

/**
 * Hook for detecting swipe gestures
 */
export function useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
}) {
    const startX = useRef(0);
    const startY = useRef(0);

    const handleTouchStart = (e) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const diffX = endX - startX.current;
        const diffY = endY - startY.current;

        const absDiffX = Math.abs(diffX);
        const absDiffY = Math.abs(diffY);

        // Determine if horizontal or vertical swipe was dominant
        if (absDiffX > absDiffY && absDiffX > threshold) {
            if (diffX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (diffX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        } else if (absDiffY > absDiffX && absDiffY > threshold) {
            if (diffY > 0 && onSwipeDown) {
                onSwipeDown();
            } else if (diffY < 0 && onSwipeUp) {
                onSwipeUp();
            }
        }
    };

    return {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
    };
}
