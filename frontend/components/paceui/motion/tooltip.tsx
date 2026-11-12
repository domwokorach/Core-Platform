"use client";

import * as React from "react";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { AnimatePresence, type Transition, motion } from "motion/react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface TooltipItemData {
    content: React.ReactNode;
    side?: TooltipPrimitive.Positioner.Props["side"];
    sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
    align?: TooltipPrimitive.Positioner.Props["align"];
    alignOffset?: TooltipPrimitive.Positioner.Props["alignOffset"];
    className?: string | ((state: any) => string | undefined);
    showArrow?: boolean;
}

interface TooltipProviderContextValue {
    activeId: string | null;
    openTooltip: (id: string, element: HTMLElement, data?: TooltipItemData | null) => void;
    closeTooltip: (id: string) => void;
    updateTooltipData: (id: string, data: TooltipItemData) => void;
}

const TooltipProviderContext = React.createContext<TooltipProviderContextValue | null>(null);

const TooltipItemContext = React.createContext<{
    id: string;
    triggerRef: React.RefObject<HTMLElement | null>;
    dataRef: React.RefObject<TooltipItemData>;
} | null>(null);

export interface TooltipProviderProps extends TooltipPrimitive.Provider.Props {
    transition?: Transition;
}

const contentVariants = {
    initial: (offset: { x: number; y: number }) => {
        if (offset.x === 0 && offset.y === 0) {
            return {
                opacity: 0,
                scale: 0.96,
                filter: "blur(4px)",
                x: 0,
                y: 4,
            };
        }
        return {
            opacity: 0,
            filter: "blur(4px)",
            x: offset.x,
            y: offset.y,
            scale: 0.96,
        };
    },
    animate: {
        opacity: 1,
        filter: "blur(0px)",
        x: 0,
        y: 0,
        scale: 1,
    },
    exit: (offset: { x: number; y: number }) => {
        if (offset.x === 0 && offset.y === 0) {
            return {
                opacity: 0,
                scale: 0.96,
                filter: "blur(4px)",
                x: 0,
                y: -4,
            };
        }
        return {
            opacity: 0,
            filter: "blur(4px)",
            x: -offset.x * 0.6,
            y: -offset.y * 0.6,
            scale: 0.96,
        };
    },
};

function TooltipProvider({
    delay = 0,
    closeDelay = 150,
    transition = { type: "spring", stiffness: 420, damping: 28, mass: 0.7 },
    children,
    ...props
}: TooltipProviderProps) {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeRect, setActiveRect] = React.useState<DOMRect | null>(null);
    const [activeData, setActiveData] = React.useState<TooltipItemData | null>(null);
    const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isMounted, setIsMounted] = React.useState(false);

    const itemsDataRef = React.useRef<Map<string, TooltipItemData>>(new Map());
    const triggerElementsRef = React.useRef<Map<string, HTMLElement>>(new Map());
    const activeRectRef = React.useRef<DOMRect | null>(null);
    const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const updatePosition = React.useCallback(() => {
        if (!activeId) return;
        const el = triggerElementsRef.current.get(activeId);
        if (el) {
            const rect = el.getBoundingClientRect();
            setActiveRect(rect);
            activeRectRef.current = rect;
        }
    }, [activeId]);

    React.useEffect(() => {
        if (!activeId) return;
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [activeId, updatePosition]);

    const openTooltip = React.useCallback(
        (id: string, element: HTMLElement, directData?: TooltipItemData | null) => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
            }

            triggerElementsRef.current.set(id, element);
            if (directData) {
                itemsDataRef.current.set(id, directData);
            }

            const data = directData || itemsDataRef.current.get(id) || null;
            const isAlreadyOpen = Boolean(activeId);
            const newRect = element.getBoundingClientRect();

            if (isAlreadyOpen && activeRectRef.current) {
                const prevCenterX = activeRectRef.current.left + activeRectRef.current.width / 2;
                const prevCenterY = activeRectRef.current.top + activeRectRef.current.height / 2;
                const newCenterX = newRect.left + newRect.width / 2;
                const newCenterY = newRect.top + newRect.height / 2;

                const dx = prevCenterX - newCenterX;
                const dy = prevCenterY - newCenterY;

                const clampedX = Math.max(Math.min(dx, 80), -80);
                const clampedY = Math.max(Math.min(dy, 40), -40);
                setOffset({ x: clampedX, y: clampedY });
            } else {
                setOffset({ x: 0, y: 0 });
            }

            activeRectRef.current = newRect;

            if (isAlreadyOpen || delay <= 0) {
                setActiveId(id);
                setActiveRect(newRect);
                if (data) setActiveData(data);
            } else {
                if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
                openTimeoutRef.current = setTimeout(() => {
                    setActiveId(id);
                    const rect = element.getBoundingClientRect();
                    setActiveRect(rect);
                    activeRectRef.current = rect;
                    const latestData = itemsDataRef.current.get(id) || directData || null;
                    if (latestData) setActiveData(latestData);
                }, delay);
            }
        },
        [activeId, delay],
    );

    const closeTooltip = React.useCallback(
        (id: string) => {
            if (openTimeoutRef.current) {
                clearTimeout(openTimeoutRef.current);
                openTimeoutRef.current = null;
            }

            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = setTimeout(() => {
                setActiveId((current) => {
                    if (current === id) {
                        setActiveRect(null);
                        activeRectRef.current = null;
                        setActiveData(null);
                        setOffset({ x: 0, y: 0 });
                        return null;
                    }
                    return current;
                });
            }, closeDelay);
        },
        [closeDelay],
    );

    const updateTooltipData = React.useCallback((id: string, data: TooltipItemData) => {
        itemsDataRef.current.set(id, data);
    }, []);

    const side = activeData?.side ?? "top";
    const sideOffset = typeof activeData?.sideOffset === "number" ? activeData.sideOffset : 6;
    const align = activeData?.align ?? "center";
    const alignOffset = typeof activeData?.alignOffset === "number" ? activeData.alignOffset : 0;

    let targetX = 0;
    let targetY = 0;
    let translateX = "-50%";
    let translateY = "-100%";

    if (activeRect) {
        if (side === "top") {
            targetX =
                align === "start"
                    ? activeRect.left + alignOffset
                    : align === "end"
                      ? activeRect.right + alignOffset
                      : activeRect.left + activeRect.width / 2 + alignOffset;
            targetY = activeRect.top - sideOffset;
            translateX = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%";
            translateY = "-100%";
        } else if (side === "bottom") {
            targetX =
                align === "start"
                    ? activeRect.left + alignOffset
                    : align === "end"
                      ? activeRect.right + alignOffset
                      : activeRect.left + activeRect.width / 2 + alignOffset;
            targetY = activeRect.bottom + sideOffset;
            translateX = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%";
            translateY = "0%";
        } else if (side === "left") {
            targetX = activeRect.left - sideOffset;
            targetY =
                align === "start"
                    ? activeRect.top + alignOffset
                    : align === "end"
                      ? activeRect.bottom + alignOffset
                      : activeRect.top + activeRect.height / 2 + alignOffset;
            translateX = "-100%";
            translateY = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%";
        } else if (side === "right") {
            targetX = activeRect.right + sideOffset;
            targetY =
                align === "start"
                    ? activeRect.top + alignOffset
                    : align === "end"
                      ? activeRect.bottom + alignOffset
                      : activeRect.top + activeRect.height / 2 + alignOffset;
            translateX = "0%";
            translateY = align === "start" ? "0%" : align === "end" ? "-100%" : "-50%";
        }
    }

    return (
        <TooltipProviderContext.Provider
            value={{
                activeId,
                openTooltip,
                closeTooltip,
                updateTooltipData,
            }}>
            <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props}>
                {children}
            </TooltipPrimitive.Provider>
            {isMounted &&
                createPortal(
                    <AnimatePresence>
                        {activeId && activeRect && activeData && activeData.content && (
                            <motion.div
                                key="shared-tooltip-wrapper"
                                initial={{
                                    opacity: 0,
                                    scale: 0.94,
                                    filter: "blur(4px)",
                                    x: targetX,
                                    y: targetY,
                                }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    filter: "blur(0px)",
                                    x: targetX,
                                    y: targetY,
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.94,
                                    filter: "blur(4px)",
                                }}
                                transition={transition}
                                style={{
                                    position: "fixed",
                                    left: 0,
                                    top: 0,
                                    pointerEvents: "none",
                                    zIndex: 99999,
                                }}>
                                <div
                                    style={{
                                        transform: `translate(${translateX}, ${translateY})`,
                                    }}>
                                    <motion.div
                                        layout
                                        transition={transition}
                                        className={cn(
                                            "bg-foreground text-background relative w-fit max-w-xs rounded-md px-3 py-1.5 text-xs shadow-md select-none",
                                            activeData.className,
                                        )}>
                                        <div className="relative flex items-center justify-center overflow-hidden">
                                            <AnimatePresence mode="popLayout" custom={offset} initial={false}>
                                                <motion.div
                                                    key={activeId}
                                                    custom={offset}
                                                    variants={contentVariants}
                                                    initial="initial"
                                                    animate="animate"
                                                    exit="exit"
                                                    transition={transition}
                                                    className="flex items-center gap-1.5 whitespace-nowrap">
                                                    {activeData.content}
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                        {activeData.showArrow !== false && (
                                            <div
                                                className={cn(
                                                    "bg-foreground pointer-events-none absolute size-2 rotate-45 rounded-[1px]",
                                                    side === "top" && "-bottom-1 left-1/2 -translate-x-1/2",
                                                    side === "bottom" && "-top-1 left-1/2 -translate-x-1/2",
                                                    side === "left" && "top-1/2 -right-1 -translate-y-1/2",
                                                    side === "right" && "top-1/2 -left-1 -translate-y-1/2",
                                                )}
                                            />
                                        )}
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </TooltipProviderContext.Provider>
    );
}

export interface TooltipProps extends TooltipPrimitive.Root.Props {
    id?: string;
}

function Tooltip({ id: propId, children, ...props }: TooltipProps) {
    const parentProvider = React.useContext(TooltipProviderContext);
    const generatedId = React.useId();
    const id = propId ?? generatedId;
    const triggerRef = React.useRef<HTMLElement | null>(null);
    const dataRef = React.useRef<TooltipItemData>({ content: null });

    if (!parentProvider) {
        return (
            <TooltipProvider>
                <TooltipItemContext.Provider value={{ id, triggerRef, dataRef }}>
                    <TooltipPrimitive.Root data-slot="tooltip" {...props}>
                        {children}
                    </TooltipPrimitive.Root>
                </TooltipItemContext.Provider>
            </TooltipProvider>
        );
    }

    return (
        <TooltipItemContext.Provider value={{ id, triggerRef, dataRef }}>
            <TooltipPrimitive.Root data-slot="tooltip" {...props}>
                {children}
            </TooltipPrimitive.Root>
        </TooltipItemContext.Provider>
    );
}

export interface TooltipTriggerProps extends TooltipPrimitive.Trigger.Props {}

function TooltipTrigger({
    className,
    onMouseEnter,
    onMouseLeave,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
}: TooltipTriggerProps) {
    const itemContext = React.useContext(TooltipItemContext);
    const providerContext = React.useContext(TooltipProviderContext);
    const localRef = React.useRef<HTMLElement | null>(null);

    const handleOpen = (e: any) => {
        if (itemContext && providerContext) {
            const el = (e.currentTarget || itemContext.triggerRef.current || localRef.current) as HTMLElement;
            if (el) {
                providerContext.openTooltip(itemContext.id, el, itemContext.dataRef.current);
            }
        }
    };

    const handleClose = () => {
        if (itemContext && providerContext) {
            providerContext.closeTooltip(itemContext.id);
        }
    };

    return (
        <TooltipPrimitive.Trigger
            data-slot="tooltip-trigger"
            ref={(node: any) => {
                localRef.current = node;
                if (itemContext) {
                    itemContext.triggerRef.current = node;
                }
            }}
            onMouseEnter={(e: any) => {
                onMouseEnter?.(e);
                handleOpen(e);
            }}
            onMouseLeave={(e: any) => {
                onMouseLeave?.(e);
                handleClose();
            }}
            onPointerEnter={(e: any) => {
                onPointerEnter?.(e);
                handleOpen(e);
            }}
            onPointerLeave={(e: any) => {
                onPointerLeave?.(e);
                handleClose();
            }}
            onFocus={(e: any) => {
                onFocus?.(e);
                handleOpen(e);
            }}
            onBlur={(e: any) => {
                onBlur?.(e);
                handleClose();
            }}
            className={className}
            {...props}
        />
    );
}

export interface TooltipContentProps
    extends
        TooltipPrimitive.Popup.Props,
        Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> {
    transition?: Transition;
    showArrow?: boolean;
}

function TooltipContent({
    className,
    side = "top",
    sideOffset = 6,
    align = "center",
    alignOffset = 0,
    showArrow = true,
    children,
    ...props
}: TooltipContentProps) {
    const itemContext = React.useContext(TooltipItemContext);
    const providerContext = React.useContext(TooltipProviderContext);

    const data: TooltipItemData = {
        content: children,
        side,
        sideOffset,
        align,
        alignOffset,
        className,
        showArrow,
    };

    if (itemContext) {
        itemContext.dataRef.current = data;
    }

    React.useEffect(() => {
        if (itemContext && providerContext) {
            providerContext.updateTooltipData(itemContext.id, data);
        }
    }, [itemContext, providerContext, children, side, sideOffset, align, alignOffset, className, showArrow]);

    if (providerContext) {
        return null;
    }

    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                align={align}
                alignOffset={alignOffset}
                side={side}
                sideOffset={sideOffset}
                className="isolate z-50">
                <TooltipPrimitive.Popup
                    data-slot="tooltip-content"
                    className={cn(
                        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-foreground text-background z-50 w-fit max-w-xs origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs shadow-md",
                        className,
                    )}
                    {...props}>
                    {children}
                    {showArrow && (
                        <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
                    )}
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
