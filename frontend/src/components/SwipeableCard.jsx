import { useState, useRef } from 'react';
import { Trash2, ChevronRight } from 'lucide-react';

/**
 * SwipeableCard - A card component with swipe actions for mobile
 * @param {ReactNode} children - The card content
 * @param {function} onSwipeLeft - Action when swiped left (e.g., delete)
 * @param {function} onSwipeRight - Action when swiped right (e.g., navigate)
 * @param {string} leftLabel - Label for left swipe action
 * @param {string} rightLabel - Label for right swipe action
 * @param {string} leftColor - Background color for left action (default: red)
 * @param {string} rightColor - Background color for right action (default: green)
 * @param {boolean} disabled - Disable swipe actions
 */
export function SwipeableCard({
    children,
    onSwipeLeft,
    onSwipeRight,
    leftLabel = 'Ta bort',
    rightLabel = 'Öppna',
    leftColor = 'bg-red-500',
    rightColor = 'bg-green-500',
    disabled = false,
    className = '',
}) {
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const currentX = useRef(0);
    const isScrolling = useRef(null);
    const containerRef = useRef(null);

    const threshold = 100; // Minimum swipe distance to trigger action
    const maxSwipe = 120; // Maximum visual swipe distance

    const handleTouchStart = (e) => {
        if (disabled) return;
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        currentX.current = startX.current;
        isScrolling.current = null;
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (disabled || !isSwiping) return;

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
        if (Math.abs(diffX) > maxSwipe) {
            newTranslateX = diffX > 0 ? maxSwipe : -maxSwipe;
        }

        // Only allow swipe in directions that have handlers
        if ((diffX > 0 && !onSwipeRight) || (diffX < 0 && !onSwipeLeft)) {
            newTranslateX = 0;
        }

        setTranslateX(newTranslateX);
    };

    const handleTouchEnd = () => {
        if (disabled) return;
        setIsSwiping(false);

        const diffX = currentX.current - startX.current;

        // Check if swipe threshold was met
        if (diffX > threshold && onSwipeRight) {
            onSwipeRight();
        } else if (diffX < -threshold && onSwipeLeft) {
            onSwipeLeft();
        }

        // Animate back to center
        setTranslateX(0);
        isScrolling.current = null;
    };

    const handleTouchCancel = () => {
        setIsSwiping(false);
        setTranslateX(0);
        isScrolling.current = null;
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
                    <div className={`flex items-center justify-start px-4 w-1/2 ${rightColor} text-white`}>
                        <ChevronRight className="h-5 w-5 mr-2" />
                        <span className="text-sm font-medium">{rightLabel}</span>
                    </div>
                )}

                {/* Left action (swipe left reveals this on right) */}
                {onSwipeLeft && (
                    <div className={`flex items-center justify-end px-4 w-1/2 ml-auto ${leftColor} text-white`}>
                        <span className="text-sm font-medium mr-2">{leftLabel}</span>
                        <Trash2 className="h-5 w-5" />
                    </div>
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
