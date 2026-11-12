"use client";

import * as React from "react";

import { type VariantProps, cva } from "class-variance-authority";
import { type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
    "grid gap-0.5 rounded-md border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 w-full relative group/alert",
    {
        variants: {
            variant: {
                default: "bg-card text-card-foreground",
                destructive:
                    "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
    transition?: Transition;
}

function Alert({ className, variant, transition, children, ...props }: AlertProps) {
    return (
        <motion.div
            data-slot="alert"
            role="alert"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            exit={{ opacity: 0, scale: 0.95, y: -4, height: 0 }}
            transition={transition ?? { type: "spring", stiffness: 300, damping: 25 }}
            className={cn(alertVariants({ variant }), className)}
            {...(props as any)}>
            {children}
        </motion.div>
    );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-title"
            className={cn(
                "[&_a]:hover:text-foreground font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
                className,
            )}
            {...props}
        />
    );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="alert-description"
            className={cn(
                "text-muted-foreground [&_a]:hover:text-foreground text-sm text-balance md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
                className,
            )}
            {...props}
        />
    );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
    return <div data-slot="alert-action" className={cn("absolute top-2.5 right-3", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
