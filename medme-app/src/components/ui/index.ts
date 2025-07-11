// Optimized barrel exports for better tree shaking
// Only export what's actually used to reduce bundle size

// Core UI components
export { Button } from './button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
export { Badge } from './badge';
export { Input } from './input';
export { Label } from './label';

// Form components (lazy loaded)
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { Switch } from './switch';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

// Layout components
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Separator } from './separator';

// Optimized motion components
export { 
  LazyMotionDiv, 
  LazyMotionSection, 
  LazyMotionButton, 
  LazyAnimatePresence,
  useLazyAnimation,
  cssAnimations 
} from './lazy-motion';
