'use client';

import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { HTMLMotionProps } from 'framer-motion';

// Lazy load framer-motion to reduce initial bundle size
const MotionDiv = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.div }))
);

const MotionSection = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.section }))
);

const MotionButton = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.button }))
);

const MotionSpan = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.motion.span }))
);

const AnimatePresence = lazy(() => 
  import('framer-motion').then(mod => ({ default: mod.AnimatePresence }))
);

// Fallback component for loading state
const MotionFallback = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={className}>
    {children}
  </div>
);

// Wrapper components with Suspense
export const LazyMotionDiv = (props: HTMLMotionProps<'div'>) => (
  <Suspense fallback={<MotionFallback className={props.className}>{props.children as ReactNode}</MotionFallback>}>
    <MotionDiv {...props} />
  </Suspense>
);

export const LazyMotionSection = (props: HTMLMotionProps<'section'>) => (
  <Suspense fallback={<MotionFallback className={props.className}>{props.children}</MotionFallback>}>
    <MotionSection {...props} />
  </Suspense>
);

export const LazyMotionButton = (props: HTMLMotionProps<'button'>) => (
  <Suspense fallback={<MotionFallback className={props.className}>{props.children}</MotionFallback>}>
    <MotionButton {...props} />
  </Suspense>
);

export const LazyMotionSpan = (props: HTMLMotionProps<'span'>) => (
  <Suspense fallback={<MotionFallback className={props.className}>{props.children}</MotionFallback>}>
    <MotionSpan {...props} />
  </Suspense>
);

export const LazyAnimatePresence = ({ children, ...props }: { children: ReactNode; [key: string]: any }) => (
  <Suspense fallback={<>{children}</>}>
    <AnimatePresence {...props}>
      {children}
    </AnimatePresence>
  </Suspense>
);

// Hook for lazy loading framer-motion animations
export const useLazyAnimation = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  };

  const slideInLeft = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4 }
  };

  const slideInRight = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.4 }
  };

  const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  };

  return {
    fadeInUp,
    fadeIn,
    slideInLeft,
    slideInRight,
    scaleIn
  };
};

// CSS-based animation alternatives (no JS required)
export const cssAnimations = {
  fadeInUp: 'animate-fade-in-up',
  fadeIn: 'animate-fade-in',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in',
  pulse: 'animate-pulse-medical'
};
