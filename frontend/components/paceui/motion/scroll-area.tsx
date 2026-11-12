"use client";

import { motionSafe } from "./motion-safe";
import * as React from "react";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

interface ScrollAreaContextValue {
    transition?: Transition;
}

const ScrollAreaContext = React.createContext<ScrollAreaContextValue>({
    transition: undefined,
});

export interface ScrollAreaProps extends ScrollAreaPrimitive.Root.Props {
    transition?: Transition;
}

export interface ScrollAreaViewportProps extends ScrollAreaPrimitive.Viewport.Props {}

export interface ScrollBarProps extends ScrollAreaPrimitive.Scrollbar.Props {
    transition?: Transition;
}

export interface ScrollAreaThumbProps extends ScrollAreaPrimitive.Thumb.Props {
    transition?: Transition;
}

export interface ScrollAreaCornerProps extends ScrollAreaPrimitive.Corner.Props {}

function ScrollArea({ className, children, transition, ...props }: ScrollAreaProps) {
    const hasViewport = React.Children.toArray(children).some(
        (child) =>
            React.isValidElement(child) &&
            (child.type === ScrollAreaViewport ||
                (child.props as { "data-slot"?: string })?.["data-slot"] === "scroll-area-viewport"),
    );

    const hasScrollbar = React.Children.toArray(children).some(
        (child) =>
            React.isValidElement(child) &&
            (child.type === ScrollBar ||
                (child.props as { "data-slot"?: string })?.["data-slot"] === "scroll-area-scrollbar"),
    );

    return (
        <ScrollAreaContext.Provider value={{ transition }}>
            <ScrollAreaPrimitive.Root
                data-slot="scroll-area"
                className={cn("relative overflow-hidden", className)}
                {...props}>
                {hasViewport ? children : <ScrollAreaViewport>{children}</ScrollAreaViewport>}
                {!hasScrollbar && <ScrollBar transition={transition} />}
                <ScrollAreaCorner />
            </ScrollAreaPrimitive.Root>
        </ScrollAreaContext.Provider>
    );
}

const ScrollAreaViewport = React.forwardRef<HTMLDivElement, ScrollAreaViewportProps>(function ScrollAreaViewport(
    { className, children, ...props },
    forwardedRef,
) {
    const internalRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(forwardedRef, () => internalRef.current as HTMLDivElement);

    React.useEffect(() => {
        const viewport = internalRef.current;
        if (!viewport) return;

        let targetY = viewport.scrollTop;
        let targetX = viewport.scrollLeft;
        let currentY = viewport.scrollTop;
        let currentX = viewport.scrollLeft;
        let rafId: number | null = null;
        let isRunning = false;

        const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

        const tick = () => {
            const maxY = viewport.scrollHeight - viewport.clientHeight;
            const maxX = viewport.scrollWidth - viewport.clientWidth;

            targetY = Math.max(0, Math.min(maxY, targetY));
            targetX = Math.max(0, Math.min(maxX, targetX));

            currentY = lerp(currentY, targetY, 0.09);
            currentX = lerp(currentX, targetX, 0.09);

            if (Math.abs(targetY - currentY) < 0.5 && Math.abs(targetX - currentX) < 0.5) {
                viewport.scrollTop = targetY;
                viewport.scrollLeft = targetX;
                currentY = targetY;
                currentX = targetX;
                isRunning = false;
                rafId = null;
                return;
            }

            viewport.scrollTop = currentY;
            viewport.scrollLeft = currentX;
            rafId = requestAnimationFrame(tick);
        };

        const onWheel = (e: WheelEvent) => {
            const maxY = viewport.scrollHeight - viewport.clientHeight;
            const maxX = viewport.scrollWidth - viewport.clientWidth;

            if (maxY <= 0 && maxX <= 0) return;

            if (!isRunning) {
                currentY = viewport.scrollTop;
                currentX = viewport.scrollLeft;
                targetY = viewport.scrollTop;
                targetX = viewport.scrollLeft;
            }

            const multiplier =
                e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? Math.max(viewport.clientHeight, viewport.clientWidth) : 1;
            const rawDeltaY = e.deltaY * multiplier;
            const rawDeltaX = e.deltaX * multiplier;

            let deltaY = rawDeltaY;
            let deltaX = rawDeltaX;

            if (maxX > 0 && maxY <= 0 && rawDeltaX === 0 && rawDeltaY !== 0) {
                deltaX = rawDeltaY;
                deltaY = 0;
            }

            const nextTargetY = Math.max(0, Math.min(maxY, targetY + deltaY));
            const nextTargetX = Math.max(0, Math.min(maxX, targetX + deltaX));

            if (nextTargetY !== targetY || nextTargetX !== targetX) {
                e.preventDefault();
                targetY = nextTargetY;
                targetX = nextTargetX;

                if (!isRunning) {
                    isRunning = true;
                    rafId = requestAnimationFrame(tick);
                }
            }
        };

        const onScroll = () => {
            if (!isRunning) {
                currentY = viewport.scrollTop;
                currentX = viewport.scrollLeft;
                targetY = viewport.scrollTop;
                targetX = viewport.scrollLeft;
            }
        };

        viewport.addEventListener("wheel", onWheel, { passive: false });
        viewport.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            viewport.removeEventListener("wheel", onWheel);
            viewport.removeEventListener("scroll", onScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <ScrollAreaPrimitive.Viewport
            ref={internalRef}
            data-slot="scroll-area-viewport"
            className={cn(
                "focus-visible:ring-ring/50 size-full overflow-auto rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
                className,
            )}
            {...props}>
            {children}
        </ScrollAreaPrimitive.Viewport>
    );
});

function ScrollBar({ className, orientation = "vertical", transition: explicitTransition, ...props }: ScrollBarProps) {
    const context = React.useContext(ScrollAreaContext);
    const transition = explicitTransition ??
        context.transition ?? {
            type: "spring",
            stiffness: 400,
            damping: 28,
        };

    return (
        <ScrollAreaPrimitive.Scrollbar
            data-slot="scroll-area-scrollbar"
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
                className,
            )}
            {...props}>
            <ScrollAreaThumb transition={transition} />
        </ScrollAreaPrimitive.Scrollbar>
    );
}

function ScrollAreaThumb({ className, transition: explicitTransition, ...props }: ScrollAreaThumbProps) {
    const context = React.useContext(ScrollAreaContext);
    const transition = explicitTransition ??
        context.transition ?? {
            type: "spring",
            stiffness: 400,
            damping: 28,
        };

    return (
        <ScrollAreaPrimitive.Thumb
            data-slot="scroll-area-thumb"
            className={cn("bg-border relative flex-1 rounded-full", className)}
            render={(thumbProps) => (
                <motion.div
                    {...motionSafe(thumbProps)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    transition={transition}
                    className={cn("bg-border relative flex-1 rounded-full", className)}
                />
            )}
            {...props}
        />
    );
}

function ScrollAreaCorner({ className, ...props }: ScrollAreaCornerProps) {
    return <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className={cn(className)} {...props} />;
}

export { ScrollArea, ScrollBar, ScrollAreaViewport, ScrollAreaThumb, ScrollAreaCorner };
