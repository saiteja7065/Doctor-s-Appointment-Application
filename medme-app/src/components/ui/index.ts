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

// CSS animation utilities
export const cssAnimations = {
  fadeInUp: 'animate-fade-in-up',
  fadeIn: 'animate-fade-in',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in',
  slideDown: 'animate-slide-down',
  pulse: 'animate-pulse-medical'
};
