"use client";

import * as React from "react";

import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { buttonVariants } from "@/components/ui/button";

const PaginationLayoutContext = React.createContext<{
    layoutId: string;
}>({ layoutId: "" });

export interface PaginationProps extends React.ComponentProps<"nav"> {}

function Pagination({ className, children, ...props }: PaginationProps) {
    const layoutId = React.useId();

    return (
        <PaginationLayoutContext.Provider value={{ layoutId }}>
            <nav
                role="navigation"
                aria-label="pagination"
                data-slot="pagination"
                className={cn("mx-auto flex w-full justify-center", className)}
                {...props}>
                {children}
            </nav>
        </PaginationLayoutContext.Provider>
    );
}

export interface PaginationContentProps extends React.ComponentProps<"ul"> {}

function PaginationContent({ className, ...props }: PaginationContentProps) {
    return <ul data-slot="pagination-content" className={cn("flex items-center gap-1", className)} {...props} />;
}

export interface PaginationItemProps extends React.ComponentProps<"li"> {}

function PaginationItem({ className, ...props }: PaginationItemProps) {
    return <li data-slot="pagination-item" className={cn(className)} {...props} />;
}

export type PaginationLinkProps = {
    isActive?: boolean;
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
} & React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", children, ...props }: PaginationLinkProps) {
    const { layoutId } = React.useContext(PaginationLayoutContext);

    return (
        <motion.a
            aria-current={isActive ? "page" : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
                buttonVariants({
                    variant: "ghost",
                    size,
                }),
                "relative z-10 cursor-pointer select-none",
                isActive && "text-foreground font-medium",
                className,
            )}
            {...(props as any)}>
            {isActive && (
                <motion.div
                    layoutId={`${layoutId}-active`}
                    className="border-border bg-background dark:border-input dark:bg-input/30 absolute inset-0 -z-10 rounded-md border"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">{children}</span>
        </motion.a>
    );
}

export interface PaginationPreviousProps extends React.ComponentProps<typeof PaginationLink> {}

function PaginationPrevious({ className, children, ...props }: PaginationPreviousProps) {
    return (
        <PaginationLink
            aria-label="Go to previous page"
            size="default"
            className={cn("group/pagination-prev pl-2!", className)}
            {...props}>
            <ChevronLeftIcon
                data-icon="inline-start"
                className="transition-transform duration-200 group-hover/pagination-prev:-translate-x-0.5"
            />
            <span className="hidden sm:block">{children ?? "Previous"}</span>
        </PaginationLink>
    );
}

export interface PaginationNextProps extends React.ComponentProps<typeof PaginationLink> {}

function PaginationNext({ className, children, ...props }: PaginationNextProps) {
    return (
        <PaginationLink
            aria-label="Go to next page"
            size="default"
            className={cn("group/pagination-next pr-2!", className)}
            {...props}>
            <span className="hidden sm:block">{children ?? "Next"}</span>
            <ChevronRightIcon
                data-icon="inline-end"
                className="transition-transform duration-200 group-hover/pagination-next:translate-x-0.5"
            />
        </PaginationLink>
    );
}

export interface PaginationEllipsisProps extends React.ComponentProps<"span"> {}

function PaginationEllipsis({ className, ...props }: PaginationEllipsisProps) {
    return (
        <motion.span
            aria-hidden
            data-slot="pagination-ellipsis"
            whileHover={{ scale: 1.15 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
                "text-muted-foreground flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...(props as any)}>
            <MoreHorizontalIcon />
            <span className="sr-only">More pages</span>
        </motion.span>
    );
}

export {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
};
