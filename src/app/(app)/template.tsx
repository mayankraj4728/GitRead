"use client";

import { motion } from "framer-motion";

/**
 * A `template` re-mounts on navigation, so this gives every in-app page a
 * subtle enter transition. Kept fast + transform-only for smoothness.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
