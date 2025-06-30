import React, { FC, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  children: ReactNode;
}

export const AnimationOverlay: FC<Props> = ({ show, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        key="animation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="
          absolute -inset-x-24 -inset-y-6 -top-12 z-30
          bg-white rounded-xl
          flex flex-col items-center justify-center
          pointer-events-none
          min-h-64
        "
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
); 