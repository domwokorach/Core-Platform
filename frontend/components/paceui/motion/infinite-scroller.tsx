"use client";

import React, { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
    animate,
    motion,
    useAnimationFrame,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
    wrap,
} from "motion/react";

import { cn } from "@/lib/utils";

type Props = {
    children: ReactNode;
    shiftHalf?: boolean;
    direction?: "left" | "right" | "up" | "down";
    className?: string;
    speed?: number;
    scrollVelocityMultiplier?: number;
    hoverSpeed?: number;
    copies?: number;
};

const SPRING = { damping: 40, stiffness: 300 };
const DRAG_THRESHOLD = 8;

export const InfiniteScroller = ({
    children,
    shiftHalf,
    direction = "left",
    className = "",
    speed = 1,
    scrollVelocityMultiplier = 1,
    hoverSpeed = 0,
    copies = 3,
}: Props) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const firstCopyRef = useRef<HTMLDivElement>(null);
    const contentSizeRef = useRef(0);
    const itemOffsets = useRef<number[]>([]);
    const animation = useRef<ReturnType<typeof animate> | undefined>(undefined);
    const isHovered = useRef(false);
    const isDragging = useRef(false);
    const inViewRef = useRef(true);
    const canAnimateRef = useRef(false);
    const reduceMotion = useReducedMotion();
    const [copyCount, setCopyCount] = useState(1);

    const drag = useRef({
        pending: false,
        startPointer: 0,
        startPos: 0,
        history: [] as { t: number; pos: number }[],
        raf: null as number | null,
        pendingPos: null as number | null,
    });

    const isHorizontal = direction === "left" || direction === "right";
    const reverse = direction === "left" || direction === "up";
    const safeCopies = Math.max(3, copies);

    const items = useMemo(() => {
        const list = React.Children.toArray(children);
        if (!shiftHalf) return list;
        const mid = Math.floor(list.length / 2);
        return [...list.slice(mid), ...list.slice(0, mid)];
    }, [children, shiftHalf]);

    const [contentSize, setContentSize] = useState(0);
    contentSizeRef.current = contentSize;

    useEffect(() => {
        if (reduceMotion) return;
        const start = () => {
            canAnimateRef.current = true;
            setCopyCount(safeCopies);
        };
        const idle = window as Window & {
            requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        const idleId = idle.requestIdleCallback
            ? idle.requestIdleCallback(start, { timeout: 1800 })
            : window.setTimeout(start, 800);
        return () => {
            if ("cancelIdleCallback" in idle && typeof idle.cancelIdleCallback === "function") {
                idle.cancelIdleCallback(idleId);
            } else {
                window.clearTimeout(idleId);
            }
        };
    }, [reduceMotion, safeCopies]);

    useEffect(() => {
        const node = rootRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                inViewRef.current = entry.isIntersecting;
            },
            { rootMargin: "200px 0px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    useLayoutEffect(() => {
        const node = firstCopyRef.current;
        if (!node) return;

        const measure = () => {
            let total = 0;
            const offsets: number[] = [];
            for (const child of Array.from(node.children) as HTMLElement[]) {
                offsets.push(total);
                total += isHorizontal ? child.getBoundingClientRect().width : child.getBoundingClientRect().height;
            }
            itemOffsets.current = offsets;
            setContentSize(total);
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [items, isHorizontal]);

    const basePosition = useMotionValue(0);
    const position = useTransform(basePosition, (v) =>
        contentSizeRef.current ? wrap(-contentSizeRef.current, 0, v) : 0,
    );

    const { scrollY } = useScroll();
    const scrollFactor = useTransform(useSpring(useVelocity(scrollY), SPRING), [-1000, 1000], [-3, 3], {
        clamp: false,
    });
    const speedMultiplier = useSpring(1, SPRING);

    useEffect(
        () =>
            scrollFactor.on("change", (v) => {
                if (!isDragging.current) speedMultiplier.set(1 + Math.abs(v) * scrollVelocityMultiplier);
            }),
        [scrollFactor, scrollVelocityMultiplier, speedMultiplier],
    );

    const wrapPos = (v: number) => (contentSizeRef.current ? wrap(-contentSizeRef.current, 0, v) : v);

    const snapTo = (current: number, throwVelocity: number) => {
        const size = contentSizeRef.current;
        if (!size || !itemOffsets.current.length) return current;

        const projected = current + throwVelocity * 0.12;
        const candidates = itemOffsets.current.flatMap((offset) => {
            const base = -offset;
            const lane = Math.round((projected - base) / size);
            return [lane - 1, lane, lane + 1].map((n) => base + n * size);
        });

        const pick = (list: number[]) =>
            list.reduce((best, c) => (Math.abs(c - projected) < Math.abs(best - projected) ? c : best));

        if (Math.abs(throwVelocity) >= 120) {
            const dir = Math.sign(throwVelocity);
            const ahead = candidates.filter((c) => dir * (c - current) > 0);
            if (ahead.length) return pick(ahead);
        }

        return pick(candidates);
    };

    useAnimationFrame((_, delta) => {
        if (reduceMotion || !canAnimateRef.current || !inViewRef.current || !contentSize || isDragging.current) return;
        const move = ((contentSize * speed) / 40000) * speedMultiplier.get() * Math.min(delta, 50);
        basePosition.set(wrapPos(basePosition.get() + move * (reverse ? -1 : 1)));
    });

    const pointer = (e: React.PointerEvent) => (isHorizontal ? e.clientX : e.clientY);

    const pushHistory = (pos: number) => {
        const h = drag.current.history;
        h.push({ t: performance.now(), pos });
        if (h.length > 8) h.shift();
    };

    const throwVelocity = () => {
        const h = drag.current.history;
        if (h.length < 2) return 0;
        const last = h[h.length - 1];
        let start = h[0];
        for (let i = h.length - 2; i >= 0; i -= 1) {
            start = h[i];
            if (last.t - start.t >= 100) break;
        }
        const dt = last.t - start.t;
        return dt > 8 ? ((last.pos - start.pos) / dt) * 1000 : 0;
    };

    const flushDrag = () => {
        drag.current.raf = null;
        if (drag.current.pendingPos !== null) {
            basePosition.set(drag.current.pendingPos);
            drag.current.pendingPos = null;
        }
    };

    const setDragPos = (next: number) => {
        drag.current.pendingPos = next;
        if (drag.current.raf === null) drag.current.raf = requestAnimationFrame(flushDrag);
    };

    const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = true;
        animation.current?.stop();
        speedMultiplier.jump(0);
        e.currentTarget.setPointerCapture(e.pointerId);
        trackRef.current?.classList.add("will-change-transform");
    };

    const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (drag.current.raf !== null) cancelAnimationFrame(drag.current.raf);
        drag.current.raf = null;
        if (drag.current.pendingPos !== null) {
            basePosition.set(drag.current.pendingPos);
            drag.current.pendingPos = null;
        }

        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        trackRef.current?.classList.remove("will-change-transform");

        const velocity = throwVelocity();
        animation.current = animate(basePosition, snapTo(basePosition.get(), velocity), {
            type: "spring",
            velocity,
            stiffness: 220,
            damping: 28,
            onComplete: () => basePosition.set(wrapPos(basePosition.get())),
        });

        drag.current.history = [];
        speedMultiplier.set(isHovered.current ? hoverSpeed : 1);
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        animation.current?.stop();
        drag.current = {
            pending: true,
            startPointer: pointer(e),
            startPos: basePosition.get(),
            history: [{ t: performance.now(), pos: pointer(e) }],
            raf: null,
            pendingPos: null,
        };
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current.pending && !isDragging.current) return;

        const pos = pointer(e);
        pushHistory(pos);

        if (!isDragging.current) {
            if (Math.abs(pos - drag.current.startPointer) < DRAG_THRESHOLD) return;
            beginDrag(e);
        }

        e.preventDefault();
        setDragPos(drag.current.startPos + pos - drag.current.startPointer);
    };

    const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current.pending && !isDragging.current) return;

        const dragged = isDragging.current;
        drag.current.pending = false;
        isDragging.current = false;

        if (!dragged) {
            drag.current.history = [];
            return;
        }

        e.preventDefault();
        pushHistory(pointer(e));
        finishDrag(e);
    };

    const mask = isHorizontal
        ? "mask-[linear-gradient(to_right,transparent_0,black_64px,black_calc(100%-64px),transparent_100%)] md:mask-[linear-gradient(to_right,transparent_0,black_128px,black_calc(100%-128px),transparent_100%)]"
        : "mask-[linear-gradient(to_bottom,transparent_0,black_64px,black_calc(100%-64px),transparent_100%)] md:mask-[linear-gradient(to_bottom,transparent_0,black_128px,black_calc(100%-128px),transparent_100%)]";

    return (
        <div
            ref={rootRef}
            className={cn("relative flex overflow-hidden", mask, className)}
            onMouseEnter={() => {
                isHovered.current = true;
                if (!isDragging.current) speedMultiplier.set(hoverSpeed);
            }}
            onMouseLeave={() => {
                isHovered.current = false;
                if (!isDragging.current) speedMultiplier.set(1);
            }}>
            <motion.div
                ref={trackRef}
                style={isHorizontal ? { x: position } : { y: position }}
                className={cn(
                    "flex cursor-grab touch-pan-y active:cursor-grabbing",
                    isHorizontal ? "w-max touch-pan-y flex-row" : "w-full h-max touch-pan-x flex-col",
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}>
                {Array.from({ length: copyCount }, (_, copy) => (
                    <div
                        key={copy}
                        ref={copy === 0 ? firstCopyRef : undefined}
                        aria-hidden={copy > 0}
                        className={cn("flex shrink-0", isHorizontal ? "flex-row" : "w-full flex-col")}>
                        {items.map((child, i) => (
                            <div key={`${copy}-${i}`} className={cn("shrink-0", !isHorizontal && "w-full")}>
                                {child}
                            </div>
                        ))}
                    </div>
                ))}
            </motion.div>
        </div>
    );
};
