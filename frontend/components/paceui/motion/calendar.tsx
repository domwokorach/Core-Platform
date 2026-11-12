"use client";

import * as React from "react";

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type DayButton, DayPicker, type Locale, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/paceui/motion/select";

const CalendarContext = React.createContext<{
    layoutId?: string;
    mode?: string;
    captionLayout?: React.ComponentProps<typeof DayPicker>["captionLayout"];
}>({});

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>["variant"];
};

const monthSlideVariants = {
    enter: (dir: number) => ({
        x: dir >= 0 ? "100%" : "-100%",
        opacity: 1,
    }),
    center: {
        x: "0%",
        opacity: 1,
    },
    exit: (dir: number) => ({
        x: dir >= 0 ? "-100%" : "100%",
        opacity: 1,
    }),
};

const headerSlideVariants = {
    enter: (dir: number) => ({
        y: dir >= 0 ? "100%" : "-100%",
        opacity: 0,
    }),
    center: {
        y: "0%",
        opacity: 1,
    },
    exit: (dir: number) => ({
        y: dir >= 0 ? "-100%" : "100%",
        opacity: 0,
    }),
};

function Calendar({
    className,
    classNames,
    showOutsideDays,
    captionLayout = "label",
    buttonVariant = "ghost",
    locale,
    formatters,
    components,
    ...props
}: CalendarProps) {
    const defaultClassNames = getDefaultClassNames();
    const layoutId = React.useId();
    const mode = (props as any).mode;
    const resolvedShowOutsideDays =
        showOutsideDays !== undefined ? showOutsideDays : (props.numberOfMonths ?? 1) > 1 ? false : true;

    return (
        <CalendarContext.Provider value={{ layoutId, mode, captionLayout }}>
            <DayPicker
                showOutsideDays={resolvedShowOutsideDays}
                className={cn(
                    "group/calendar bg-background overflow-hidden p-3 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
                    String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
                    String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
                    className,
                )}
                captionLayout={captionLayout}
                locale={locale}
                formatters={{
                    formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
                    ...formatters,
                }}
                classNames={{
                    root: cn("w-fit overflow-hidden", defaultClassNames.root),
                    months: cn("relative flex flex-col gap-4 md:flex-row overflow-hidden", defaultClassNames.months),
                    month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
                    nav: cn(
                        "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-20 pointer-events-none",
                        defaultClassNames.nav,
                    ),
                    button_previous: cn(
                        buttonVariants({ variant: buttonVariant }),
                        "size-(--cell-size) p-0 select-none aria-disabled:opacity-50 pointer-events-auto",
                        defaultClassNames.button_previous,
                    ),
                    button_next: cn(
                        buttonVariants({ variant: buttonVariant }),
                        "size-(--cell-size) p-0 select-none aria-disabled:opacity-50 pointer-events-auto",
                        defaultClassNames.button_next,
                    ),
                    month_caption: cn(
                        "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
                        defaultClassNames.month_caption,
                    ),
                    dropdowns: cn(
                        "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
                        defaultClassNames.dropdowns,
                    ),
                    dropdown_root: cn("relative rounded-(--cell-radius)", defaultClassNames.dropdown_root),
                    dropdown: cn("absolute inset-0 z-10 w-full h-full cursor-pointer opacity-0", defaultClassNames.dropdown),
                    caption_label: cn(
                        "font-medium select-none",
                        captionLayout === "label"
                            ? "text-sm"
                            : "flex items-center gap-1 rounded-(--cell-radius) text-sm pointer-events-none [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
                        defaultClassNames.caption_label,
                    ),
                    month_grid: "w-full border-collapse",
                    weekdays: cn("flex", defaultClassNames.weekdays),
                    weekday: cn(
                        "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
                        defaultClassNames.weekday,
                    ),
                    week: cn("mt-2 flex w-full", defaultClassNames.week),
                    week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
                    week_number: cn("text-[0.8rem] text-muted-foreground select-none", defaultClassNames.week_number),
                    day: cn(
                        "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
                        (props as any).showWeekNumber
                            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
                            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
                        defaultClassNames.day,
                    ),
                    range_start: cn(
                        "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
                        defaultClassNames.range_start,
                    ),
                    range_middle: cn("rounded-none", defaultClassNames.range_middle),
                    range_end: cn(
                        "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
                        defaultClassNames.range_end,
                    ),
                    today: cn(
                        "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
                        defaultClassNames.today,
                    ),
                    outside: cn("text-muted-foreground aria-selected:text-muted-foreground", defaultClassNames.outside),
                    disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
                    hidden: cn("invisible", defaultClassNames.hidden),
                    ...classNames,
                }}
                components={{
                    Root: ({ className, rootRef, ...props }) => {
                        return (
                            <div
                                data-slot="calendar"
                                ref={rootRef}
                                className={cn("overflow-hidden", className)}
                                {...props}
                            />
                        );
                    },
                    Chevron: ({ className, orientation, ...props }) => {
                        if (orientation === "left") {
                            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />;
                        }

                        if (orientation === "right") {
                            return <ChevronRightIcon className={cn("size-4", className)} {...props} />;
                        }

                        return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
                    },
                    Months: (monthsProps) => <CalendarMonths {...monthsProps} />,
                    Month: (monthProps) => <CalendarMonth {...monthProps} />,
                    DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
                    WeekNumber: ({ children, ...props }) => {
                        return (
                            <td {...props}>
                                <div className="flex size-(--cell-size) items-center justify-center text-center">
                                    {children}
                                </div>
                            </td>
                        );
                    },
                    Dropdown: (dropdownProps) => <CalendarDropdown {...dropdownProps} />,
                    ...components,
                }}
                {...props}
            />
        </CalendarContext.Provider>
    );
}

function CalendarMonth({ className, children, calendarMonth, displayIndex, ...props }: any) {
    const context = React.useContext(CalendarContext);
    const isDropdown = context.captionLayout?.startsWith("dropdown");
    const childArray = React.Children.toArray(children);
    const gridChild = childArray.find((child: any) => child?.props?.role === "grid");
    const headerChildren = childArray.filter((child: any) => child?.props?.role !== "grid");

    const monthTime = calendarMonth?.date?.getTime() ?? 0;
    const prevMonthTimeRef = React.useRef<number | null>(null);
    const directionRef = React.useRef<number>(1);

    let direction = directionRef.current;
    if (
        prevMonthTimeRef.current !== null &&
        monthTime !== 0 &&
        monthTime !== prevMonthTimeRef.current
    ) {
        direction = monthTime > prevMonthTimeRef.current ? 1 : -1;
        directionRef.current = direction;
    }
    if (monthTime !== 0) {
        prevMonthTimeRef.current = monthTime;
    }

    return (
        <div className={cn("flex w-full flex-col gap-4", className)} {...props}>
            <div className="relative h-(--cell-size) w-full overflow-hidden">
                {isDropdown ? (
                    <div className="flex h-full w-full items-center justify-center">
                        {headerChildren}
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                        <motion.div
                            key={monthTime || "header"}
                            custom={direction}
                            variants={headerSlideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                y: { type: "spring", stiffness: 300, damping: 30, mass: 0.8 },
                                opacity: { duration: 0.2 },
                            }}
                            className="flex h-full w-full items-center justify-center">
                            {headerChildren}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
            <div className="relative w-full overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                    <motion.div
                        key={monthTime || "grid"}
                        custom={direction}
                        variants={monthSlideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30, mass: 0.8 },
                        }}
                        className="w-full">
                        {gridChild}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function CalendarMonths({ className, children, ...props }: any) {
    return (
        <div className={cn("relative flex flex-col gap-4 md:flex-row", className)} {...props}>
            {children}
        </div>
    );
}

export interface CalendarDayButtonProps extends React.ComponentProps<typeof DayButton> {
    locale?: Partial<Locale>;
}

function CalendarDayButton({ className, day, modifiers, locale, ...props }: CalendarDayButtonProps) {
    const context = React.useContext(CalendarContext);
    const layoutId = context.layoutId;
    const mode = context.mode;
    const defaultClassNames = getDefaultClassNames();

    const ref = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => {
        if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);

    const isOutside = Boolean(modifiers.outside);
    const isRangeStart = Boolean(modifiers.range_start && !isOutside);
    const isRangeEnd = Boolean(modifiers.range_end && !isOutside);
    const isRangeMiddle = Boolean(modifiers.range_middle && !isOutside);
    const isSingleSelected = Boolean(
        modifiers.selected && !isOutside && !isRangeStart && !isRangeEnd && !isRangeMiddle,
    );

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString(locale?.code)}
            data-selected-single={isSingleSelected}
            data-range-start={isRangeStart}
            data-range-end={isRangeEnd}
            data-range-middle={isRangeMiddle}
            className={cn(
                "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) [&>span]:text-xs [&>span]:opacity-70",
                "data-[range-end=true]:bg-transparent data-[range-start=true]:bg-transparent data-[selected-single=true]:bg-transparent",
                defaultClassNames.day,
                className,
            )}
            {...props}>
            {props.children}
            {isSingleSelected &&
                (mode === "multiple" ? (
                    <motion.div
                        key={`multi-${day.date.getTime()}`}
                        layoutId={`${layoutId}-multi-${day.date.getTime()}`}
                        className="bg-primary absolute inset-0 -z-1 rounded-(--cell-radius)"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                ) : (
                    <motion.div
                        layoutId={`${layoutId}-${day.date.getFullYear()}-${day.date.getMonth()}-selected`}
                        className="bg-primary absolute inset-0 -z-1 rounded-(--cell-radius)"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                ))}
            {isRangeStart && (
                <motion.div
                    layoutId={`${layoutId}-range-start`}
                    className={cn(
                        "bg-primary absolute inset-0 -z-1",
                        isRangeEnd ? "rounded-(--cell-radius)" : "rounded-l-(--cell-radius)",
                    )}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
            )}
            {isRangeEnd && !isRangeStart && (
                <motion.div
                    layoutId={`${layoutId}-range-end`}
                    className="bg-primary absolute inset-0 -z-1 rounded-r-(--cell-radius)"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
            )}
        </Button>
    );
}

export interface CalendarDropdownProps {
    options?: Array<{ value: number; label: string; disabled?: boolean }>;
    value?: number | string | readonly string[];
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
    className?: string;
    "aria-label"?: string;
}

function CalendarDropdown({
    options,
    value,
    onChange,
    disabled,
    "aria-label": ariaLabel,
}: CalendarDropdownProps) {
    const numValue = typeof value === "string" ? Number(value) : typeof value === "number" ? value : undefined;
    const selectedOption = options?.find((option) => option.value === numValue);

    const prevValueRef = React.useRef<number | null>(null);
    const directionRef = React.useRef<number>(1);

    let direction = directionRef.current;
    if (prevValueRef.current !== null && numValue !== undefined && numValue !== prevValueRef.current) {
        if (options && options.length === 12 && prevValueRef.current === 11 && numValue === 0) {
            direction = 1;
        } else if (options && options.length === 12 && prevValueRef.current === 0 && numValue === 11) {
            direction = -1;
        } else {
            direction = numValue > prevValueRef.current ? 1 : -1;
        }
        directionRef.current = direction;
    }
    if (numValue !== undefined && !Number.isNaN(numValue)) {
        prevValueRef.current = numValue;
    }

    const handleValueChange = (val: string | string[] | null) => {
        if (val !== null && onChange) {
            onChange({
                target: { value: String(val) },
            } as unknown as React.ChangeEvent<HTMLSelectElement>);
        }
    };

    return (
        <Select
            value={numValue !== undefined ? String(numValue) : undefined}
            onValueChange={handleValueChange}
            disabled={disabled}>
            <SelectTrigger
                aria-label={ariaLabel}
                size="sm"
                className="h-7 w-fit gap-1 border-none bg-transparent px-1.5 py-0 text-sm font-medium shadow-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-3.5">
                <span className="relative inline-flex h-full items-center overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                        <motion.span
                            key={String(value)}
                            custom={direction}
                            variants={headerSlideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                y: { type: "spring", stiffness: 300, damping: 30, mass: 0.8 },
                                opacity: { duration: 0.2 },
                            }}
                            className="inline-block">
                            {selectedOption?.label}
                        </motion.span>
                    </AnimatePresence>
                </span>
            </SelectTrigger>
            <SelectContent className="max-h-56 min-w-28">
                {options?.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={String(option.value)}
                        disabled={option.disabled}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export { Calendar, CalendarDayButton, CalendarMonth, CalendarMonths, CalendarDropdown, CalendarContext, CalendarContext as CalendarAnimateContext };
