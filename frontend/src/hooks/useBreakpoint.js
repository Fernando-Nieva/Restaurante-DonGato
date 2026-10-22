import { useEffect, useState } from 'react';

const FALLBACK = {
    tablet: 600,
    desktop: 1024,
};

const readBreakpoints = () => {
    if (typeof window === 'undefined') return FALLBACK;

    const styles = window.getComputedStyle(document.documentElement);
    const tablet = Number.parseInt(styles.getPropertyValue('--breakpoint-tablet'), 10);
    const desktop = Number.parseInt(styles.getPropertyValue('--breakpoint-desktop'), 10);

    return {
        tablet: Number.isFinite(tablet) ? tablet : FALLBACK.tablet,
        desktop: Number.isFinite(desktop) ? desktop : FALLBACK.desktop,
    };
};

const getBreakpoint = ({ tablet, desktop }) => {
    if (typeof window === 'undefined') return 'mobile';
    if (window.matchMedia(`(min-width: ${desktop}px)`).matches) return 'desktop';
    if (window.matchMedia(`(min-width: ${tablet}px)`).matches) return 'tablet';

    return 'mobile';
};

export default function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState(() => getBreakpoint(readBreakpoints()));

    useEffect(() => {
        const { tablet, desktop } = readBreakpoints();
        const tabletQuery = window.matchMedia(`(min-width: ${tablet}px)`);
        const desktopQuery = window.matchMedia(`(min-width: ${desktop}px)`);

        const update = () => {
            if (desktopQuery.matches) {
                setBreakpoint('desktop');
            } else if (tabletQuery.matches) {
                setBreakpoint('tablet');
            } else {
                setBreakpoint('mobile');
            }
        };

        update();
        tabletQuery.addEventListener('change', update);
        desktopQuery.addEventListener('change', update);

        return () => {
            tabletQuery.removeEventListener('change', update);
            desktopQuery.removeEventListener('change', update);
        };
    }, []);

    return breakpoint;
}
