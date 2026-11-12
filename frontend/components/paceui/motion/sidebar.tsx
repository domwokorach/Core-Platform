"use client";

import * as React from "react";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { type VariantProps, cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import { motion } from "motion/react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipContent } from "@/components/paceui/motion/tooltip";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarMenuHighlightContextType {
    highlightLayoutId: string;
    activeItemId: string | null;
    setActiveItem: (id: string) => void;
    clearActiveItemWithDelay: () => void;
}

const SidebarMenuHighlightContext = React.createContext<SidebarMenuHighlightContextType | null>(null);

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (!context) {
        return {
            state: "expanded" as const,
            open: true,
            setOpen: () => {},
            openMobile: false,
            setOpenMobile: () => {},
            isMobile: false,
            toggleSidebar: () => {},
        };
    }

    return context;
}

export interface SidebarProviderProps extends React.ComponentProps<"div"> {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

function SidebarProvider({
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
}: SidebarProviderProps) {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
        (value: boolean | ((value: boolean) => boolean)) => {
            const openState = typeof value === "function" ? value(open) : value;
            if (setOpenProp) {
                setOpenProp(openState);
            } else {
                _setOpen(openState);
            }

            document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        },
        [setOpenProp, open],
    );

    const toggleSidebar = React.useCallback(() => {
        return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                toggleSidebar();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextProps>(
        () => ({
            state,
            open,
            setOpen,
            isMobile,
            openMobile,
            setOpenMobile,
            toggleSidebar,
        }),
        [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
    );

    return (
        <SidebarContext.Provider value={contextValue}>
            <div
                data-slot="sidebar-wrapper"
                style={
                    {
                        "--sidebar-width": SIDEBAR_WIDTH,
                        "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                        ...style,
                    } as React.CSSProperties
                }
                className={cn(
                    "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
                    className,
                )}
                {...props}>
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

export interface SidebarProps extends React.ComponentProps<"div"> {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offExamples" | "icon" | "none";
}

function Sidebar({
    side = "left",
    variant = "sidebar",
    collapsible = "offExamples",
    className,
    children,
    ...props
}: SidebarProps) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    const generatedLayoutId = React.useId();
    const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
    const timeoutRef = React.useRef<any>(null);

    const setActiveItem = React.useCallback((id: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setActiveItemId(id);
    }, []);

    const clearActiveItemWithDelay = React.useCallback((delay = 500) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (delay === 0) {
            setActiveItemId(null);
        } else {
            timeoutRef.current = setTimeout(() => {
                setActiveItemId(null);
            }, delay);
        }
    }, []);

    const highlightValue = React.useMemo<SidebarMenuHighlightContextType>(
        () => ({
            highlightLayoutId: generatedLayoutId,
            activeItemId,
            setActiveItem,
            clearActiveItemWithDelay,
        }),
        [generatedLayoutId, activeItemId, setActiveItem, clearActiveItemWithDelay],
    );

    if (collapsible === "none") {
        return (
            <SidebarMenuHighlightContext.Provider value={highlightValue}>
                <div
                    data-slot="sidebar"
                    className={cn(
                        "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
                        className,
                    )}
                    onPointerLeave={() => clearActiveItemWithDelay(500)}
                    {...props}>
                    {children}
                </div>
            </SidebarMenuHighlightContext.Provider>
        );
    }

    if (isMobile) {
        return (
            <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                <SheetContent
                    data-sidebar="sidebar"
                    data-slot="sidebar"
                    data-mobile="true"
                    className="bg-sidebar text-sidebar-foreground w-(--sidebar-width)! p-0 [&>button]:hidden"
                    style={
                        {
                            "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
                        } as React.CSSProperties
                    }
                    side={side}>
                    <SheetHeader className="sr-only">
                        <SheetTitle>Sidebar</SheetTitle>
                        <SheetDescription>Displays the mobile sidebar.</SheetDescription>
                    </SheetHeader>
                    <SidebarMenuHighlightContext.Provider value={highlightValue}>
                        <div
                            className="flex h-full w-full flex-col pe-2"
                            onPointerLeave={() => clearActiveItemWithDelay(500)}>
                            {children}
                        </div>
                    </SidebarMenuHighlightContext.Provider>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <div
            className="group peer text-sidebar-foreground hidden lg:block"
            data-state={state}
            data-collapsible={state === "collapsed" ? collapsible : ""}
            data-variant={variant}
            data-side={side}
            data-slot="sidebar">
            <div
                data-slot="sidebar-gap"
                className={cn(
                    "relative w-(--sidebar-width) bg-transparent transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    "group-data-[collapsible=offExamples]:w-0",
                    "group-data-[side=right]:rotate-180",
                    variant === "floating" || variant === "inset"
                        ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
                        : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
                )}
            />
            <div
                data-slot="sidebar-container"
                className={cn(
                    "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex",
                    side === "left"
                        ? "left-0 group-data-[collapsible=offExamples]:-left-(--sidebar-width)"
                        : "right-0 group-data-[collapsible=offExamples]:-right-(--sidebar-width)",
                    variant === "floating" || variant === "inset"
                        ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
                        : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
                    className,
                )}
                {...props}>
                <div
                    data-sidebar="sidebar"
                    data-slot="sidebar-inner"
                    onPointerLeave={() => clearActiveItemWithDelay(500)}
                    className="bg-sidebar group-data-[variant=floating]:ring-sidebar-border flex size-full flex-col group-data-[variant=floating]:rounded-md group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1">
                    <SidebarMenuHighlightContext.Provider value={highlightValue}>
                        {children}
                    </SidebarMenuHighlightContext.Provider>
                </div>
            </div>
        </div>
    );
}

export interface SidebarTriggerProps extends React.ComponentProps<typeof Button> {}

function SidebarTrigger({ className, onClick, ...props }: SidebarTriggerProps) {
    const { toggleSidebar } = useSidebar();

    return (
        <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon-sm"
            className={cn(className)}
            onClick={(event) => {
                onClick?.(event);
                toggleSidebar();
            }}
            {...props}>
            <PanelLeftIcon />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    );
}

export interface SidebarRailProps extends React.ComponentProps<"button"> {}

function SidebarRail({ className, ...props }: SidebarRailProps) {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            data-sidebar="rail"
            data-slot="sidebar-rail"
            aria-label="Toggle Sidebar"
            tabIndex={-1}
            onClick={toggleSidebar}
            title="Toggle Sidebar"
            className={cn(
                "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
                "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
                "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                "hover:group-data-[collapsible=offExamples]:bg-sidebar group-data-[collapsible=offExamples]:translate-x-0 group-data-[collapsible=offExamples]:after:left-full",
                "[[data-side=left][data-collapsible=offExamples]_&]:-right-2",
                "[[data-side=right][data-collapsible=offExamples]_&]:-left-2",
                className,
            )}
            {...props}
        />
    );
}

export interface SidebarInsetProps extends React.ComponentProps<"main"> {}

function SidebarInset({ className, ...props }: SidebarInsetProps) {
    return (
        <main
            data-slot="sidebar-inset"
            className={cn(
                "bg-background relative flex w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-md md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
                className,
            )}
            {...props}
        />
    );
}

export interface SidebarInputProps extends React.ComponentProps<typeof Input> {}

function SidebarInput({ className, ...props }: SidebarInputProps) {
    return (
        <Input
            data-slot="sidebar-input"
            data-sidebar="input"
            className={cn("bg-background h-8 w-full shadow-none", className)}
            {...props}
        />
    );
}

export interface SidebarHeaderProps extends React.ComponentProps<"div"> {}

function SidebarHeader({ className, ...props }: SidebarHeaderProps) {
    return (
        <div
            data-slot="sidebar-header"
            data-sidebar="header"
            className={cn("flex flex-col gap-2 p-2", className)}
            {...props}
        />
    );
}

export interface SidebarFooterProps extends React.ComponentProps<"div"> {}

function SidebarFooter({ className, ...props }: SidebarFooterProps) {
    return (
        <div
            data-slot="sidebar-footer"
            data-sidebar="footer"
            className={cn("flex flex-col gap-2 p-2", className)}
            {...props}
        />
    );
}

export interface SidebarSeparatorProps extends React.ComponentProps<typeof Separator> {}

function SidebarSeparator({ className, ...props }: SidebarSeparatorProps) {
    return (
        <Separator
            data-slot="sidebar-separator"
            data-sidebar="separator"
            className={cn("bg-sidebar-border mx-2 w-auto", className)}
            {...props}
        />
    );
}

export interface SidebarContentProps extends React.ComponentProps<"div"> {}

function SidebarContent({ className, ...props }: SidebarContentProps) {
    return (
        <div
            data-slot="sidebar-content"
            data-sidebar="content"
            className={cn(
                "no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
                className,
            )}
            {...props}
        />
    );
}

export interface SidebarGroupProps extends React.ComponentProps<"div"> {}

function SidebarGroup({ className, ...props }: SidebarGroupProps) {
    return (
        <div
            data-slot="sidebar-group"
            data-sidebar="group"
            className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
            {...props}
        />
    );
}

export interface SidebarGroupLabelProps extends useRender.ComponentProps<"div">, React.ComponentProps<"div"> {}

function SidebarGroupLabel({ className, render, ...props }: SidebarGroupLabelProps) {
    return useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(
            {
                className: cn(
                    "text-sidebar-foreground/70 ring-sidebar-ring h-8 rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 flex shrink-0 items-center outline-hidden [&>svg]:shrink-0",
                    className,
                ),
            },
            props,
        ),
        render,
        state: {
            slot: "sidebar-group-label",
            sidebar: "group-label",
        },
    });
}

export interface SidebarGroupActionProps extends useRender.ComponentProps<"button">, React.ComponentProps<"button"> {
    showOnHover?: boolean;
}

function SidebarGroupAction({ className, render, showOnHover = false, ...props }: SidebarGroupActionProps) {
    return useRender({
        defaultTagName: "button",
        props: mergeProps<"button">(
            {
                className: cn(
                    "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 w-5 rounded-md p-0 focus-visible:ring-2 [&>svg]:size-4 flex aspect-square items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
                    showOnHover &&
                        "peer-data-active/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-open:opacity-100 md:opacity-0",
                    className,
                ),
            },
            props,
        ),
        render,
        state: {
            slot: "sidebar-group-action",
            sidebar: "group-action",
        },
    });
}

export interface SidebarGroupContentProps extends React.ComponentProps<"div"> {}

function SidebarGroupContent({ className, ...props }: SidebarGroupContentProps) {
    return (
        <div
            data-slot="sidebar-group-content"
            data-sidebar="group-content"
            className={cn("w-full text-sm", className)}
            {...props}
        />
    );
}

export interface SidebarMenuProps extends React.ComponentProps<"ul"> {}

function SidebarMenu({ className, onPointerLeave, children, ...props }: SidebarMenuProps) {
    const parentHighlightContext = React.useContext(SidebarMenuHighlightContext);

    const generatedLayoutId = React.useId();
    const highlightLayoutId = parentHighlightContext?.highlightLayoutId ?? generatedLayoutId;

    const [localActiveItemId, setLocalActiveItemId] = React.useState<string | null>(null);
    const timeoutRef = React.useRef<any>(null);

    const setActiveItem =
        parentHighlightContext?.setActiveItem ??
        React.useCallback((id: string) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLocalActiveItemId(id);
        }, []);

    const clearActiveItemWithDelay =
        parentHighlightContext?.clearActiveItemWithDelay ??
        React.useCallback((delay = 500) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (delay === 0) {
                setLocalActiveItemId(null);
            } else {
                timeoutRef.current = setTimeout(() => {
                    setLocalActiveItemId(null);
                }, delay);
            }
        }, []);

    const activeItemId = parentHighlightContext ? parentHighlightContext.activeItemId : localActiveItemId;

    const highlightValue: SidebarMenuHighlightContextType = parentHighlightContext ?? {
        highlightLayoutId,
        activeItemId,
        setActiveItem,
        clearActiveItemWithDelay,
    };

    return (
        <SidebarMenuHighlightContext.Provider value={highlightValue}>
            <ul
                data-slot="sidebar-menu"
                data-sidebar="menu"
                className={cn("flex w-full min-w-0 flex-col gap-1", className)}
                onPointerLeave={(e) => {
                    onPointerLeave?.(e);
                    clearActiveItemWithDelay(500);
                }}
                {...props}>
                {children}
            </ul>
        </SidebarMenuHighlightContext.Provider>
    );
}

export interface SidebarMenuItemProps extends React.ComponentProps<"li"> {}

function SidebarMenuItem({ className, ...props }: SidebarMenuItemProps) {
    return (
        <li
            data-slot="sidebar-menu-item"
            data-sidebar="menu-item"
            className={cn("group/menu-item relative", className)}
            {...props}
        />
    );
}

const sidebarMenuButtonVariants = cva(
    "ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground gap-2 rounded-md p-2 text-left text-sm transition-[width,height,padding,background-color,color,transform] active:scale-[0.98] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2 data-active:font-medium peer/menu-button flex w-full items-center overflow-hidden outline-hidden group/menu-button disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0 relative",
    {
        variants: {
            variant: {
                default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                outline:
                    "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
            },
            size: {
                default: "h-8 text-sm",
                sm: "h-7 text-xs",
                lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

const sidebarMenuButtonAnimatedVariants = cva(
    "ring-sidebar-ring gap-2 rounded-md p-2 text-left text-sm group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2 data-active:font-medium peer/menu-button flex w-full items-center outline-hidden group/menu-button disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0 relative select-none cursor-default active:scale-[0.98] transition-colors duration-150",
    {
        variants: {
            variant: {
                default: "",
                outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))]",
            },
            size: {
                default: "h-8 text-sm",
                sm: "h-7 text-xs",
                lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export interface SidebarMenuButtonProps
    extends
        useRender.ComponentProps<"button">,
        React.ComponentProps<"button">,
        VariantProps<typeof sidebarMenuButtonVariants> {
    isActive?: boolean;
    showHighlight?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
}

function SidebarMenuButton({
    render,
    isActive = false,
    showHighlight = true,
    variant = "default",
    size = "default",
    tooltip,
    className,
    children,
    onPointerEnter,
    onFocus,
    ...props
}: SidebarMenuButtonProps) {
    const highlightContext = React.useContext(SidebarMenuHighlightContext);
    const itemId = React.useId();

    const highlightLayoutId = highlightContext?.highlightLayoutId ?? "sidebar-active-indicator";
    const isHovered = highlightContext?.activeItemId === itemId;
    const isHighlighted = showHighlight && (highlightContext?.activeItemId ? isHovered : isActive);

    const handlePointerEnter = (e: any) => {
        onPointerEnter?.(e);
        if (showHighlight) {
            highlightContext?.setActiveItem(itemId);
        }
    };

    const handleFocus = (e: any) => {
        onFocus?.(e);
        if (showHighlight) {
            highlightContext?.setActiveItem(itemId);
        }
    };

    const resolvedChildren = children ?? (React.isValidElement(render) ? (render.props as any).children : null);
    const finalRender =
        React.isValidElement(render) && (render.props as any).children !== undefined
            ? React.cloneElement(render, { children: undefined } as any)
            : render;

    const animatedChildren = (
        <>
            {isHighlighted && (
                <motion.div
                    layoutId={highlightLayoutId}
                    className={cn(
                        "bg-muted pointer-events-none absolute inset-0 z-0 rounded-md",
                        variant === "outline" && "shadow-[0_0_0_1px_hsl(var(--sidebar-border))]",
                    )}
                    transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.8 }}
                />
            )}
            <span className="relative z-10 flex w-full min-w-0 items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate">
                {resolvedChildren}
            </span>
        </>
    );

    return useRender({
        defaultTagName: "button",
        props: mergeProps<"button">(
            {
                className: cn(
                    sidebarMenuButtonAnimatedVariants({ variant, size }),
                    (isActive || isHovered) && "text-sidebar-accent-foreground",
                    className,
                ),
                onPointerEnter: handlePointerEnter,
                onFocus: handleFocus,
                children: animatedChildren,
            },
            props,
        ),
        render: finalRender,
        state: {
            slot: "sidebar-menu-button",
            sidebar: "menu-button",
            size,
            active: isActive,
        },
    });
}

export interface SidebarMenuActionProps extends useRender.ComponentProps<"button">, React.ComponentProps<"button"> {
    showOnHover?: boolean;
}

function SidebarMenuAction({ className, render, showOnHover = false, ...props }: SidebarMenuActionProps) {
    return useRender({
        defaultTagName: "button",
        props: mergeProps<"button">(
            {
                className: cn(
                    "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-1.5 right-1 aspect-square w-5 rounded-md p-0 focus-visible:ring-2 [&>svg]:size-4 flex items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
                    showOnHover &&
                        "peer-data-active/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-open:opacity-100 md:opacity-0",
                    className,
                ),
            },
            props,
        ),
        render,
        state: {
            slot: "sidebar-menu-action",
            sidebar: "menu-action",
        },
    });
}

export interface SidebarMenuBadgeProps extends React.ComponentProps<"div"> {}

function SidebarMenuBadge({ className, ...props }: SidebarMenuBadgeProps) {
    return (
        <div
            data-slot="sidebar-menu-badge"
            data-sidebar="menu-badge"
            className={cn(
                "text-sidebar-foreground peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none group-data-[collapsible=icon]:hidden peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1",
                className,
            )}
            {...props}
        />
    );
}

export interface SidebarMenuSkeletonProps extends React.ComponentProps<"div"> {
    showIcon?: boolean;
}

function SidebarMenuSkeleton({ className, showIcon = false, ...props }: SidebarMenuSkeletonProps) {
    const [width] = React.useState(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`;
    });

    return (
        <div
            data-slot="sidebar-menu-skeleton"
            data-sidebar="menu-skeleton"
            className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
            {...props}>
            {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
            <Skeleton
                className="h-4 max-w-(--skeleton-width) flex-1"
                data-sidebar="menu-skeleton-text"
                style={
                    {
                        "--skeleton-width": width,
                    } as React.CSSProperties
                }
            />
        </div>
    );
}

export interface SidebarMenuSubProps extends React.ComponentProps<"ul"> {}

function SidebarMenuSub({ className, onPointerLeave, children, ...props }: SidebarMenuSubProps) {
    const parentHighlightContext = React.useContext(SidebarMenuHighlightContext);

    const generatedLayoutId = React.useId();
    const highlightLayoutId = parentHighlightContext?.highlightLayoutId ?? generatedLayoutId;

    const [localActiveItemId, setLocalActiveItemId] = React.useState<string | null>(null);
    const timeoutRef = React.useRef<any>(null);

    const setActiveItem =
        parentHighlightContext?.setActiveItem ??
        React.useCallback((id: string) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setLocalActiveItemId(id);
        }, []);

    const clearActiveItemWithDelay =
        parentHighlightContext?.clearActiveItemWithDelay ??
        React.useCallback((delay = 500) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (delay === 0) {
                setLocalActiveItemId(null);
            } else {
                timeoutRef.current = setTimeout(() => {
                    setLocalActiveItemId(null);
                }, delay);
            }
        }, []);

    const activeItemId = parentHighlightContext ? parentHighlightContext.activeItemId : localActiveItemId;

    const highlightValue: SidebarMenuHighlightContextType = parentHighlightContext ?? {
        highlightLayoutId,
        activeItemId,
        setActiveItem,
        clearActiveItemWithDelay,
    };

    return (
        <SidebarMenuHighlightContext.Provider value={highlightValue}>
            <ul
                data-slot="sidebar-menu-sub"
                data-sidebar="menu-sub"
                className={cn(
                    "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
                    className,
                )}
                onPointerLeave={(e) => {
                    onPointerLeave?.(e);
                    clearActiveItemWithDelay(500);
                }}
                {...props}>
                {children}
            </ul>
        </SidebarMenuHighlightContext.Provider>
    );
}

export interface SidebarMenuSubItemProps extends React.ComponentProps<"li"> {}

function SidebarMenuSubItem({ className, ...props }: SidebarMenuSubItemProps) {
    return (
        <li
            data-slot="sidebar-menu-sub-item"
            data-sidebar="menu-sub-item"
            className={cn("group/menu-sub-item relative", className)}
            {...props}
        />
    );
}

export interface SidebarMenuSubButtonProps extends useRender.ComponentProps<"a">, React.ComponentProps<"a"> {
    size?: "sm" | "md";
    isActive?: boolean;
}

function SidebarMenuSubButton({
    render,
    size = "md",
    isActive = false,
    className,
    children,
    onPointerEnter,
    onFocus,
    ...props
}: SidebarMenuSubButtonProps) {
    const highlightContext = React.useContext(SidebarMenuHighlightContext);
    const itemId = React.useId();

    const isCurrentActive = highlightContext?.activeItemId === itemId;

    const handlePointerEnter = (e: any) => {
        onPointerEnter?.(e);
        highlightContext?.setActiveItem(itemId);
    };

    const handleFocus = (e: any) => {
        onFocus?.(e);
        highlightContext?.setActiveItem(itemId);
    };

    const resolvedChildren = children ?? (React.isValidElement(render) ? (render.props as any).children : null);
    const finalRender =
        React.isValidElement(render) && (render.props as any).children !== undefined
            ? React.cloneElement(render, { children: undefined } as any)
            : render;

    const animatedChildren = (
        <>
            {isActive && (
                <motion.div
                    layoutId="sidebar-sub-active-indicator"
                    className="bg-muted pointer-events-none absolute inset-0 z-0 rounded-md"
                    transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.8 }}
                />
            )}
            {isCurrentActive && !isActive && highlightContext?.highlightLayoutId && (
                <motion.div
                    layoutId={highlightContext.highlightLayoutId}
                    className="bg-muted/70 pointer-events-none absolute inset-0 z-0 rounded-md"
                    transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.8 }}
                />
            )}
            <span className="relative z-10 flex w-full min-w-0 items-center gap-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0">
                {resolvedChildren}
            </span>
        </>
    );

    return useRender({
        defaultTagName: "a",
        props: mergeProps<"a">(
            {
                className: cn(
                    "text-sidebar-foreground ring-sidebar-ring h-7 gap-2 rounded-md px-2 focus-visible:ring-2 data-[size=md]:text-sm data-[size=sm]:text-xs [&>svg]:size-4 flex min-w-0 -translate-x-px items-center outline-hidden group-data-[collapsible=icon]:hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:shrink-0 relative active:scale-[0.98] transition-colors duration-150",
                    (isActive || isCurrentActive) && "text-sidebar-accent-foreground",
                    className,
                ),
                onPointerEnter: handlePointerEnter,
                onFocus: handleFocus,
                children: animatedChildren,
            },
            props,
        ),
        render: finalRender,
        state: {
            slot: "sidebar-menu-sub-button",
            sidebar: "menu-sub-button",
            size,
            active: isActive,
        },
    });
}

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
};
