"use client";

import { motionSafe } from "./motion-safe";
import * as React from "react";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

interface SliderContextValue {
    transition?: Transition;
}

const SliderContext = React.createContext<SliderContextValue>({
    transition: undefined,
});

export interface SliderProps extends SliderPrimitive.Root.Props {
    transition?: Transition;
}

export interface SliderControlProps extends SliderPrimitive.Control.Props {}

export interface SliderTrackProps extends SliderPrimitive.Track.Props {}

export interface SliderIndicatorProps extends SliderPrimitive.Indicator.Props {
    transition?: Transition;
}

export interface SliderThumbProps extends SliderPrimitive.Thumb.Props {
    transition?: Transition;
}

export interface SliderValueProps extends SliderPrimitive.Value.Props {}

function Slider({ className, defaultValue, value, min = 0, max = 100, transition, children, ...props }: SliderProps) {
    const _values = React.useMemo(
        () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
        [value, defaultValue, min, max],
    );

    const hasCustomControl = React.Children.toArray(children).some(
        (child) =>
            React.isValidElement(child) &&
            (child.type === SliderControl ||
                (child.props as { "data-slot"?: string })?.["data-slot"] === "slider-control"),
    );

    return (
        <SliderContext.Provider value={{ transition }}>
            <SliderPrimitive.Root
                className={cn("data-horizontal:w-full data-vertical:h-full", className)}
                data-slot="slider"
                defaultValue={defaultValue}
                value={value}
                min={min}
                max={max}
                thumbAlignment="edge"
                {...props}>
                {children ? (
                    hasCustomControl ? (
                        children
                    ) : (
                        <SliderControl>{children}</SliderControl>
                    )
                ) : (
                    <SliderControl>
                        <SliderTrack>
                            <SliderIndicator transition={transition} />
                        </SliderTrack>
                        {Array.from({ length: _values.length }, (_, index) => (
                            <SliderThumb key={index} transition={transition} />
                        ))}
                    </SliderControl>
                )}
            </SliderPrimitive.Root>
        </SliderContext.Provider>
    );
}

function SliderControl({ className, ...props }: SliderControlProps) {
    return (
        <SliderPrimitive.Control
            data-slot="slider-control"
            className={cn(
                "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
                className,
            )}
            {...props}
        />
    );
}

function SliderTrack({ className, ...props }: SliderTrackProps) {
    return (
        <SliderPrimitive.Track
            data-slot="slider-track"
            className={cn(
                "bg-muted relative overflow-hidden rounded-full select-none data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5",
                className,
            )}
            {...props}
        />
    );
}

function SliderIndicator({ className, transition: explicitTransition, ...props }: SliderIndicatorProps) {
    const context = React.useContext(SliderContext);
    const transition = explicitTransition ??
        context.transition ?? {
            type: "spring",
            stiffness: 400,
            damping: 28,
        };

    return (
        <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={cn("bg-primary select-none data-horizontal:h-full data-vertical:w-full", className)}
            render={(indicatorProps) => (
                <motion.div
                    {...motionSafe(indicatorProps)}
                    layout
                    transition={transition}
                    className={cn("bg-primary select-none data-horizontal:h-full data-vertical:w-full", className)}
                />
            )}
            {...props}
        />
    );
}

function SliderThumb({ className, transition: explicitTransition, ...props }: SliderThumbProps) {
    const context = React.useContext(SliderContext);
    const transition = explicitTransition ??
        context.transition ?? {
            type: "spring",
            stiffness: 450,
            damping: 25,
        };

    return (
        <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className={cn(
                "border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
                className,
            )}
            render={(thumbProps) => (
                <motion.span
                    {...motionSafe(thumbProps)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={transition}
                    className={cn(
                        "border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
                        className,
                    )}
                />
            )}
            {...props}
        />
    );
}

function SliderValue({ className, ...props }: SliderValueProps) {
    return (
        <SliderPrimitive.Value
            data-slot="slider-value"
            className={cn("text-muted-foreground text-sm tabular-nums select-none", className)}
            {...props}
        />
    );
}

export { Slider, SliderControl, SliderTrack, SliderIndicator, SliderThumb, SliderValue };
