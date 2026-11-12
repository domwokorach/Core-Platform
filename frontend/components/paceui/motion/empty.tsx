"use client";

import * as React from "react";

import { type VariantProps, cva } from "class-variance-authority";
import { type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

export interface EmptyProps extends React.ComponentProps<"div"> {
    transition?: Transition;
}

function Empty({ className, transition, children, ...props }: EmptyProps) {
    return (
        <motion.div
            data-slot="empty"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={transition ?? { type: "spring", stiffness: 280, damping: 24 }}
            className={cn(
                "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed p-12 text-center text-balance",
                className,
            )}
            {...(props as any)}>
            {children}
        </motion.div>
    );
}

export interface EmptyHeaderProps extends React.ComponentProps<"div"> {
    transition?: Transition;
}

function EmptyHeader({ className, transition, children, ...props }: EmptyHeaderProps) {
    return (
        <motion.div
            data-slot="empty-header"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={transition ?? { type: "spring", stiffness: 300, damping: 24, delay: 0.05 }}
            className={cn("flex max-w-sm flex-col items-center gap-2", className)}
            {...(props as any)}>
            {children}
        </motion.div>
    );
}

const emptyMediaVariants = cva(
    "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                icon: "flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface EmptyMediaProps extends React.ComponentProps<"div">, VariantProps<typeof emptyMediaVariants> {
    transition?: Transition;
}

function EmptyMedia({ className, variant = "default", transition, children, ...props }: EmptyMediaProps) {
    return (
        <motion.div
            data-slot="empty-icon"
            data-variant={variant}
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -2, scale: 1.05 }}
            transition={transition ?? { type: "spring", stiffness: 320, damping: 18 }}
            className={cn(emptyMediaVariants({ variant, className }))}
            {...(props as any)}>
            {children}
        </motion.div>
    );
}

export interface EmptyTitleProps extends React.ComponentProps<"div"> {}

function EmptyTitle({ className, ...props }: EmptyTitleProps) {
    return <div data-slot="empty-title" className={cn("text-lg font-medium tracking-tight", className)} {...props} />;
}

export interface EmptyDescriptionProps extends React.ComponentProps<"p"> {}

function EmptyDescription({ className, ...props }: EmptyDescriptionProps) {
    return (
        <div
            data-slot="empty-description"
            className={cn(
                "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
                className,
            )}
            {...props}
        />
    );
}

export interface EmptyContentProps extends React.ComponentProps<"div"> {
    transition?: Transition;
}

function EmptyContent({ className, transition, children, ...props }: EmptyContentProps) {
    return (
        <motion.div
            data-slot="empty-content"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={transition ?? { type: "spring", stiffness: 280, damping: 24, delay: 0.1 }}
            className={cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance", className)}
            {...(props as any)}>
            {children}
        </motion.div>
    );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
