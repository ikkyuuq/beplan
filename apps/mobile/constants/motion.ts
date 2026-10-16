import { Easing } from "react-native-reanimated";

/**
 * Shared motion tokens: short, eased, no overshoot.
 *
 * Use with Reanimated's withTiming, e.g. withTiming(0, MOTION.base).
 * Avoid withSpring for UI chrome; springs overshoot and read as wobble.
 */
export const MOTION = {
  /** Press feedback, fades, small rotations. */
  fast: { duration: 150, easing: Easing.out(Easing.cubic) },
  /** Expand/collapse, snap-back, removals, position changes. */
  base: { duration: 220, easing: Easing.out(Easing.cubic) },
} as const;
