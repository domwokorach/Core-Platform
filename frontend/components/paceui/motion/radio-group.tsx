"use client";

import * as React from "react";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { type Transition, motion } from "motion/react";

import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
    transition?: Transition;
    layoutId?: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends RadioGroupPrimitive.Props {
    transition?: Transition;
}

function RadioGroup({ className, transition, ...props }: RadioGroupProps) {
    const id = React.useId();

    return (
        <RadioGroupContext.Provider value={{ transition, layoutId: id }}>
            <RadioGroupPrimitive data-slot="radio-group" className={cn("grid w-full gap-3", className)} {...props} />
        </RadioGroupContext.Provider>
    );
}

export interface RadioGroupItemProps extends RadioPrimitive.Root.Props {
    transition?: Transition;
    layoutId?: string;
}

function RadioGroupItem({
    className,
    transition: localTransition,
    layoutId: localLayoutId,
    disabled,
    ...props
}: RadioGroupItemProps) {
    const context = React.useContext(RadioGroupContext);
    const transition = localTransition ??
        context.transition ?? { type: "spring", stiffness: 450, damping: 28, mass: 0.5 };
    const layoutId = localLayoutId ?? (context.layoutId ? `radio-group-indicator-${context.layoutId}` : undefined);

    return (
        <RadioPrimitive.Root
            data-slot="radio-group-item"
            nativeButton
            disabled={disabled}
            className={cn(
                "border-input text-primary dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border shadow-xs outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-[3px]",
                className,
            )}
            render={
                <motion.button
                    whileHover={disabled ? undefined : { scale: 1.06 }}
                    whileTap={disabled ? undefined : { scale: 0.92 }}
                    transition={transition}
                />
            }
            {...props}>
            <RadioPrimitive.Indicator
                data-slot="radio-group-indicator"
                keepMounted
                className="group-aria-invalid/radio-group-item:text-destructive text-primary flex size-4 items-center justify-center"
                render={(_indicatorProps, indicatorState) =>
                    indicatorState.checked ? (
                        <motion.div
                            layoutId={layoutId}
                            transition={transition}
                            className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
                        />
                    ) : (
                        <span />
                    )
                }
            />
        </RadioPrimitive.Root>
    );
}

export { RadioGroup, RadioGroupItem, RadioGroupContext, RadioGroupContext as RadioGroupAnimateContext };
