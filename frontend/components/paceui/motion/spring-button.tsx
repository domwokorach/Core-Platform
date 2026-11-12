"use client";

import { type HTMLMotionProps, motion, useAnimation } from "motion/react";

type SpringButtonProps = {
    scale?: number;
    shaking?: boolean;
} & HTMLMotionProps<"button">;

export const SpringButton = ({ scale = 0.85, shaking = true, ...props }: SpringButtonProps) => {
    const controls = useAnimation();

    const handlePress = () => {
        controls.start({
            scale: scale,
            transition: { duration: 1, ease: "easeOut" },
        });

        if (shaking) {
            controls.start({
                x: [0, -1, 1, -0.5, 0.5, 0],
                y: [0, 1, -1, -0.5, 0.5, 0],
                transition: {
                    duration: 0.4,
                    repeat: Infinity,
                    ease: "linear",
                    times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                },
            });
        }
    };

    const handleRelease = () => {
        controls.stop();
        controls.start({
            scale: 1,
            x: 0,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 10,
                mass: 1,
            },
        });
    };

    return (
        <motion.button
            {...props}
            animate={controls}
            onPointerDown={(e) => {
                handlePress();
                props.onPointerDown?.(e);
            }}
            onPointerUp={(e) => {
                handleRelease();
                props.onPointerUp?.(e);
            }}
            onPointerLeave={(e) => {
                handleRelease();
                props.onPointerLeave?.(e);
            }}
            onPointerCancel={(e) => {
                handleRelease();
                props.onPointerCancel?.(e);
            }}
        />
    );
};
