'use client';

import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load framer-motion components to reduce bundle size
const MotionDiv = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.div }))
);

const MotionSpan = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.span }))
);

const MotionButton = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.button }))
);

const AnimatePresence = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.AnimatePresence }))
);

// Loading fallback component
const MotionFallback = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>
    {children}
  </div>
);

// Loading spinner for motion components
const MotionLoader = () => (
  <div className="flex items-center justify-center p-2">
    <Loader2 className="h-4 w-4 animate-spin" />
  </div>
);

// Wrapper components with Suspense
export const LazyMotionDiv = ({ children, fallback, ...props }: any) => (
  <Suspense fallback={fallback || <MotionFallback {...props}>{children}</MotionFallback>}>
    <MotionDiv {...props}>
      {children}
    </MotionDiv>
  </Suspense>
);

export const LazyMotionSpan = ({ children, fallback, ...props }: any) => (
  <Suspense fallback={fallback || <MotionFallback {...props}>{children}</MotionFallback>}>
    <MotionSpan {...props}>
      {children}
    </MotionSpan>
  </Suspense>
);

export const LazyMotionButton = ({ children, fallback, ...props }: any) => (
  <Suspense fallback={fallback || <MotionFallback {...props}>{children}</MotionFallback>}>
    <MotionButton {...props}>
      {children}
    </MotionButton>
  </Suspense>
);

export const LazyAnimatePresence = ({ children, fallback, ...props }: any) => (
  <Suspense fallback={fallback || <div>{children}</div>}>
    <AnimatePresence {...props}>
      {children}
    </AnimatePresence>
  </Suspense>
);

// Common animation variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.2 }
};

// Stagger animation for lists
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

// Hover animations
export const hoverScale = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { duration: 0.2 }
};

export const hoverLift = {
  whileHover: { y: -2 },
  transition: { duration: 0.2 }
};

// Loading states
export const pulseAnimation = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Default export for convenience
export default {
  Div: LazyMotionDiv,
  Span: LazyMotionSpan,
  Button: LazyMotionButton,
  AnimatePresence: LazyAnimatePresence,
  variants: {
    fadeInUp,
    fadeIn,
    slideInRight,
    scaleIn,
    staggerContainer,
    staggerItem,
    hoverScale,
    hoverLift,
    pulseAnimation
  }
};
