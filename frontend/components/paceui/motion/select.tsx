"use client";

import * as React from "react";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { AnimatePresence, type HTMLMotionProps, LayoutGroup, type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

interface SelectRootContextType {
    stagger?: boolean | number;
}

const SelectRootContext = React.createContext<SelectRootContextType>({});

interface SelectHighlightContextType {
    highlightLayoutId: string;
    activeItemId: string | null;
    setActiveItem: (id: string) => void;
    clearActiveItemWithDelay: () => void;
    stagger?: boolean | number;
    getItemIndex: (id: string) => number;
}

const SelectHighlightContext = React.createContext<SelectHighlightContextType | null>(null);

export type SelectProps<ItemValue = any, Multiple extends boolean = boolean> = SelectPrimitive.Root.Props<
    ItemValue,
    Multiple
> & {
    stagger?: boolean | number;
};

function Select<ItemValue = any, Multiple extends boolean = boolean>({
    stagger,
    ...props
}: SelectProps<ItemValue, Multiple>) {
    const rootContextValue = React.useMemo(() => ({ stagger }), [stagger]);

    return (
        <SelectRootContext.Provider value={rootContextValue}>
            <SelectPrimitive.Root data-slot="select" {...props} />
        </SelectRootContext.Provider>
    );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
    return <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1 p-1", className)} {...props} />;
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
    return (
        <SelectPrimitive.Value data-slot="select-value" className={cn("flex flex-1 text-left", className)} {...props} />
    );
}

export interface SelectTriggerProps extends SelectPrimitive.Trigger.Props {
    size?: "default" | "sm" | "xs" | "lg";
}

function SelectTrigger({ className, size = "default", children, ...props }: SelectTriggerProps) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            data-size={size}
            className={cn(
                "border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex w-fit items-center justify-between gap-1.5 rounded-md border bg-transparent py-2 pr-2 pl-2.5 text-sm font-medium whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-[3px] data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=xs]:h-6 data-[size=xs]:gap-1 data-[size=xs]:rounded-[min(var(--radius-md),8px)] data-[size=xs]:py-1 data-[size=xs]:pr-1.5 data-[size=xs]:pl-2 data-[size=xs]:text-xs data-[size=lg]:h-10 data-[size=lg]:py-2.5 data-[size=lg]:pr-2.5 data-[size=lg]:pl-3 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 in-data-[size=xs]:[&_svg:not([class*='size-'])]:size-3",
                className,
            )}
            {...props}>
            {children}
            <SelectPrimitive.Icon
                render={
                    <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 transition-transform duration-200 in-data-[popup-open]:rotate-180 in-data-[size=xs]:size-3" />
                }
            />
        </SelectPrimitive.Trigger>
    );
}

interface SelectContentListProps {
    children: React.ReactNode;
    highlightLayoutId: string;
    stagger?: boolean | number;
}

function SelectContentList({ children, highlightLayoutId, stagger }: SelectContentListProps) {
    const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const itemIdsRef = React.useRef<string[]>([]);

    const setActiveItem = React.useCallback((id: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setActiveItemId(id);
    }, []);

    const clearActiveItemWithDelay = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setActiveItemId(null);
        }, 180);
    }, []);

    const getItemIndex = React.useCallback((id: string) => {
        let index = itemIdsRef.current.indexOf(id);
        if (index === -1) {
            index = itemIdsRef.current.length;
            itemIdsRef.current.push(id);
        }
        return index;
    }, []);

    const contextValue = React.useMemo<SelectHighlightContextType>(
        () => ({
            highlightLayoutId,
            activeItemId,
            setActiveItem,
            clearActiveItemWithDelay,
            stagger,
            getItemIndex,
        }),
        [highlightLayoutId, activeItemId, setActiveItem, clearActiveItemWithDelay, stagger, getItemIndex],
    );

    return (
        <SelectHighlightContext.Provider value={contextValue}>
            <LayoutGroup id={highlightLayoutId}>
                <div onPointerLeave={clearActiveItemWithDelay} className="contents">
                    <SelectScrollUpButton />
                    <SelectPrimitive.List className="overflow-hidden">{children}</SelectPrimitive.List>
                    <SelectScrollDownButton />
                </div>
            </LayoutGroup>
        </SelectHighlightContext.Provider>
    );
}

export interface SelectContentProps
    extends
    SelectPrimitive.Popup.Props,
    Pick<
        SelectPrimitive.Positioner.Props,
        "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
    > {
    stagger?: boolean | number;
    transition?: Transition;
}

function SelectContent({
    className,
    children,
    side = "bottom",
    sideOffset = 4,
    align = "start",
    alignOffset = 0,
    alignItemWithTrigger = false,
    stagger: staggerProp,
    transition = { type: "spring", stiffness: 420, damping: 28, mass: 0.8 },
    ...props
}: SelectContentProps) {
    const rootContext = React.useContext(SelectRootContext);
    const resolvedStagger = staggerProp ?? rootContext.stagger ?? true;
    const highlightLayoutId = React.useId();

    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Positioner
                side={side}
                sideOffset={sideOffset}
                align={align}
                alignOffset={alignOffset}
                alignItemWithTrigger={alignItemWithTrigger}
                className="isolate z-500 outline-none">
                <SelectPrimitive.Popup
                    data-slot="select-content"
                    {...props}
                    render={(popupProps, state) => (
                        <AnimatePresence>
                            {state.open && (
                                <motion.div
                                    {...(popupProps as unknown as HTMLMotionProps<"div">)}
                                    key="select-popup"
                                    initial={{
                                        opacity: 0,
                                        scale: 0.95,
                                        y: side === "bottom" ? -8 : side === "top" ? 8 : 0,
                                        x: side === "right" ? -10 : side === "left" ? 10 : 0,
                                    }}
                                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                    exit={{
                                        opacity: 0,
                                        scale: 0.95,
                                        y: side === "bottom" ? -6 : side === "top" ? 6 : 0,
                                        x: side === "right" ? -8 : side === "left" ? 8 : 0,
                                    }}
                                    transition={transition}
                                    className={cn(
                                        "bg-popover text-popover-foreground ring-foreground/10 no-scrollbar relative isolate z-500 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md shadow-md ring-1",
                                        className,
                                    )}>
                                    <SelectContentList
                                        stagger={resolvedStagger}
                                        highlightLayoutId={highlightLayoutId}>
                                        {children}
                                    </SelectContentList>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                />
            </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
    );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
    return (
        <SelectPrimitive.GroupLabel
            data-slot="select-label"
            className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
            {...props}
        />
    );
}

export interface SelectItemProps extends SelectPrimitive.Item.Props {
    stagger?: boolean | number;
}

function SelectItem({ className, children, stagger: itemStagger, ...props }: SelectItemProps) {
    const highlightContext = React.useContext(SelectHighlightContext);
    const itemId = React.useId();

    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={className}
            {...props}
            render={(itemProps, state) => {
                const isCurrentActive = highlightContext?.activeItemId === itemId;
                const effectiveStagger = itemStagger ?? highlightContext?.stagger ?? true;
                const isStaggerEnabled = effectiveStagger !== false;
                const staggerDelay = typeof effectiveStagger === "number" ? effectiveStagger : 0.025;
                const itemIndex = isStaggerEnabled && highlightContext ? highlightContext.getItemIndex(itemId) : 0;
                const delay = Math.min(itemIndex * staggerDelay, 0.25);

                return (
                    <motion.div
                        {...(itemProps as unknown as HTMLMotionProps<"div">)}
                        initial={isStaggerEnabled ? { opacity: 0, x: -10 } : false}
                        animate={isStaggerEnabled ? { opacity: 1, x: 0 } : false}
                        transition={{
                            x: { type: "spring", stiffness: 420, damping: 28, mass: 0.8, delay },
                            opacity: { duration: 0.2, delay },
                            scale: { type: "spring", stiffness: 400, damping: 25 },
                            default: { type: "spring", stiffness: 400, damping: 25 },
                        }}
                        onPointerEnter={(e: React.PointerEvent<HTMLDivElement>) => {
                            itemProps.onPointerEnter?.(e);
                            highlightContext?.setActiveItem(itemId);
                        }}
                        onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
                            itemProps.onFocus?.(e);
                            highlightContext?.setActiveItem(itemId);
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                            "group/select-item relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                            (state.highlighted || isCurrentActive) && "text-accent-foreground",
                            className,
                        )}>
                        {isCurrentActive && highlightContext?.highlightLayoutId && (
                            <motion.div
                                layoutId={highlightContext.highlightLayoutId}
                                layout="position"
                                className="bg-accent pointer-events-none absolute inset-0 z-0 rounded-sm"
                                transition={{ type: "spring", stiffness: 450, damping: 32 }}
                            />
                        )}
                        <SelectPrimitive.ItemText className="relative z-10 flex flex-1 shrink-0 gap-2 whitespace-nowrap">
                            {children}
                        </SelectPrimitive.ItemText>
                        <span
                            className="pointer-events-none absolute right-2 z-10 flex size-4 items-center justify-center"
                            data-slot="select-item-indicator">
                            <SelectPrimitive.ItemIndicator>
                                <motion.span
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                    className="flex items-center justify-center">
                                    <CheckIcon className="pointer-events-none size-4" />
                                </motion.span>
                            </SelectPrimitive.ItemIndicator>
                        </span>
                    </motion.div>
                );
            }}
        />
    );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
    return (
        <SelectPrimitive.Separator
            data-slot="select-separator"
            className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
            {...props}
        />
    );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
    return (
        <SelectPrimitive.ScrollUpArrow
            data-slot="select-scroll-up-button"
            className={cn(
                "bg-popover top-0 z-10 flex w-full cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}>
            <ChevronUpIcon />
        </SelectPrimitive.ScrollUpArrow>
    );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
    return (
        <SelectPrimitive.ScrollDownArrow
            data-slot="select-scroll-down-button"
            className={cn(
                "bg-popover bottom-0 z-10 flex w-full cursor-default items-center justify-center py-1 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}>
            <ChevronDownIcon />
        </SelectPrimitive.ScrollDownArrow>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
