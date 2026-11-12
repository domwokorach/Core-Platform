import { useEffect, useState } from "react";

// FINIX shows the persistent sidebar from 1024px (Tailwind `lg`); below that the navigation is a sheet. (Registry default: 768.)
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        mql.addEventListener("change", onChange);
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return !!isMobile;
}
