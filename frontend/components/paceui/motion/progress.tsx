"use client";

import { motionSafe } from "./motion-safe";
import * as React from "react";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

interface ProgressContextValue {
    transition?: Transition;
}

const ProgressContext = React.createContext<ProgressContextValue>({
    transition: undefined,
});

export interface ProgressProps extends ProgressPrimitive.Root.Props {
    transition?: Transition;
}

export interface ProgressTrackProps extends ProgressPrimitive.Track.Props {}

export interface ProgressIndicatorProps extends ProgressPrimitive.Indicator.Props {
    transition?: Transition;
}

export interface ProgressLabelProps extends ProgressPrimitive.Label.Props {}

export interface ProgressValueProps extends ProgressPrimitive.Value.Props {}

function Progress({ className, children, value, transition, ...props }: ProgressProps) {
    const hasTrack = React.Children.toArray(children).some(
        (child) =>
            React.isValidElement(child) &&
            (child.type === ProgressTrack ||
                (child.props as { "data-slot"?: string })?.["data-slot"] === "progress-track"),
    );

    return (
        <ProgressContext.Provider value={{ transition }}>
            <ProgressPrimitive.Root
                value={value}
                data-slot="progress"
                className={cn("flex flex-wrap gap-3", className)}
                {...props}>
                {children}
                {!hasTrack && (
                    <ProgressTrack>
                        <ProgressIndicator transition={transition} />
                    </ProgressTrack>
                )}
            </ProgressPrimitive.Root>
        </ProgressContext.Provider>
    );
}

function ProgressTrack({ className, ...props }: ProgressTrackProps) {
    return (
        <ProgressPrimitive.Track
            className={cn("bg-muted relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full", className)}
            data-slot="progress-track"
            {...props}
        />
    );
}

function ProgressIndicator({ className, transition: explicitTransition, ...props }: ProgressIndicatorProps) {
    const context = React.useContext(ProgressContext);
    const transition = explicitTransition ??
        context.transition ?? {
            type: "spring",
            stiffness: 120,
            damping: 18,
        };

    return (
        <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className={cn("bg-primary h-full", className)}
            render={(indicatorProps, state) => {
                const isIndeterminate = state.status === "indeterminate";

                if (isIndeterminate) {
                    return (
                        <motion.div
                            {...motionSafe(indicatorProps)}
                            initial={{ x: "-100%", width: "45%" }}
                            animate={{ x: "280%", width: "45%" }}
                            transition={{
                                repeat: Infinity,
                                duration: 1.4,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                            style={{
                                ...indicatorProps.style,
                                width: "45%",
                                insetInlineStart: 0,
                                position: "absolute",
                            }}
                            className={cn("bg-primary h-full rounded-full", className)}
                        />
                    );
                }

                const targetWidth = indicatorProps.style?.width ?? "0%";

                return (
                    <motion.div
                        {...motionSafe(indicatorProps)}
                        initial={{ width: 0 }}
                        whileInView={{ width: targetWidth }}
                        viewport={{ once: true }}
                        animate={{ width: targetWidth }}
                        transition={transition}
                        style={{
                            ...indicatorProps.style,
                            insetInlineStart: 0,
                            height: "inherit",
                        }}
                        className={cn("bg-primary h-full", className)}
                    />
                );
            }}
            {...props}
        />
    );
}

function ProgressLabel({ className, ...props }: ProgressLabelProps) {
    return (
        <ProgressPrimitive.Label
            className={cn("text-sm font-medium", className)}
            data-slot="progress-label"
            {...props}
        />
    );
}

function ProgressValue({ className, ...props }: ProgressValueProps) {
    return (
        <ProgressPrimitive.Value
            className={cn("text-muted-foreground ml-auto text-sm tabular-nums", className)}
            data-slot="progress-value"
            {...props}
        />
    );
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
