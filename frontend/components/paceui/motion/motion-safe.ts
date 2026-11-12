/**
 * Base UI render props are typed with the DOM's drag/animation handlers, which clash with `motion`'s own handler types when
 * spread onto a motion element. These handlers are never used by these components, so they are dropped before spreading.
 */
export function motionSafe<T extends object>(props: T) {
  const { onDrag, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDragOver, onDrop, onAnimationStart, onAnimationEnd, ...rest } = props as Record<string, unknown>;
  void onDrag; void onDragStart; void onDragEnd; void onDragEnter; void onDragLeave; void onDragOver; void onDrop; void onAnimationStart; void onAnimationEnd;
  return rest as Omit<T, "onDrag" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragLeave" | "onDragOver" | "onDrop" | "onAnimationStart" | "onAnimationEnd">;
}
