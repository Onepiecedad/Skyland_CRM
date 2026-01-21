import { useState, useCallback, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Hook for pull-to-refresh functionality
 * @param {Function} onRefresh - async function to call when user pulls down
 * @returns {Object} - { isRefreshing, pullDistance, bindProps }
 */
export function usePullToRefresh(onRefresh) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const handleTouchStart = useCallback((e) => {
        // Only start tracking if we're at the top of the page
        if (window.scrollY === 0) {
            startY.current = e.touches[0].clientY;
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (startY.current === 0 || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        // Only pull down, and only if at top
        if (diff > 0 && window.scrollY === 0) {
            // Apply resistance
            const distance = Math.min(diff * 0.5, 100);
            setPullDistance(distance);
        }
    }, [isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance > 60 && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        startY.current = 0;
        setPullDistance(0);
    }, [pullDistance, isRefreshing, onRefresh]);

    const bindProps = {
        ref: containerRef,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };

    return { isRefreshing, pullDistance, bindProps };
}

/**
 * Pull-to-refresh indicator component
 */
export function PullToRefreshIndicator({ pullDistance, isRefreshing }) {
    const showIndicator = pullDistance > 0 || isRefreshing;
    const rotation = Math.min((pullDistance / 60) * 180, 180);

    if (!showIndicator) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none md:hidden"
            style={{
                height: pullDistance,
                opacity: Math.min(pullDistance / 60, 1),
                transition: isRefreshing ? 'none' : 'height 0.1s'
            }}
        >
            <div className="bg-background rounded-full p-2 shadow">
                <RefreshCw
                    className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{
                        transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
                        transition: 'transform 0.1s'
                    }}
                />
            </div>
        </div>
    );
}
