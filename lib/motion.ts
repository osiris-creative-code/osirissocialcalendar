import type { Transition, Variants } from "framer-motion";

/**
 * One motion vocabulary for the whole app, so every screen springs the same way
 * and the feel can be retuned from a single file.
 */

export const spring: Transition = { type: "spring", stiffness: 380, damping: 30, mass: 0.7 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 28 };
export const springSnappy: Transition = { type: "spring", stiffness: 500, damping: 26, mass: 0.5 };

/**
 * Parent that reveals its children one after another.
 *
 * The `exit` entry is not decoration: an AnimatePresence child whose variants
 * have no `exit` never reports that it finished leaving, so the outgoing tree
 * stays mounted forever.
 */
export const stagger = (delayChildren = 0.04, staggerChildren = 0.045): Variants => ({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren, staggerChildren } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
});

/** Rise + unblur — the standard entrance for cards and rows. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: spring },
  exit: { opacity: 0, y: -8, scale: 0.98, filter: "blur(3px)", transition: { duration: 0.15 } },
};

/** Slide in from the left — day columns, list groups. */
export const slideIn: Variants = {
  hidden: { opacity: 0, x: -18, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: springSoft },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } },
};

/** Panels and popovers. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springSnappy },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.12 } },
};
