'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

export default function LayoutTestPage() {
  const testScreenSizes = [
    { name: 'Mobile', icon: Smartphone, width: '375px', description: 'iPhone SE / Small phones' },
    { name: 'Tablet', icon: Tablet, width: '768px', description: 'iPad / Medium tablets' },
    { name: 'Desktop', icon: Monitor, width: '1024px+', description: 'Laptop / Desktop screens' },
  ];

  const layoutFeatures = [
    { name: 'Sidebar Width', status: 'optimized', description: 'Reduced from 256px to 240px (w-60)' },
    { name: 'Content Container', status: 'improved', description: 'Added max-width constraint (max-w-7xl)' },
    { name: 'Responsive Padding', status: 'enhanced', description: 'Mobile: 16px, Desktop: 24px' },
    { name: 'Content Margins', status: 'fixed', description: 'Proper left margin for sidebar (ml-60)' },
    { name: 'Mobile Navigation', status: 'working', description: 'Collapsible sidebar for mobile devices' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimized':
      case 'improved':
      case 'fixed':
      case 'working':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimized':
      case 'improved':
      case 'fixed':
      case 'working':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Layout Test Page</h1>
            <p className="text-muted-foreground">
              Testing the improved doctor dashboard layout and responsive design
            </p>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Layout Fixed ✓
          </Badge>
        </div>
      </div>

      {/* Screen Size Testing */}
      <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Responsive Design Testing
          </CardTitle>
          <CardDescription>
            Test the layout across different screen sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testScreenSizes.map((size, index) => {
              const Icon = size.icon;
              return (
                <Card key={size.name} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{size.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{size.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {size.width}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Layout Improvements */}
      <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle>Layout Improvements Applied</CardTitle>
          <CardDescription>
            Summary of all layout fixes and optimizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {layoutFeatures.map((feature, index) => (
              <div key={feature.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(feature.status)}
                  <div>
                    <h4 className="font-medium">{feature.name}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusColor(feature.status)}>
                  {feature.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="glass-card">
            <CardHeader>
              <CardTitle>Test Card {i}</CardTitle>
              <CardDescription>
                Testing content layout and spacing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This card tests the responsive grid layout and ensures proper spacing 
                between elements in the new layout system.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Test Button
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Layout Metrics */}
      <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle>Layout Metrics</CardTitle>
          <CardDescription>
            Current layout specifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">240px</div>
              <div className="text-sm text-muted-foreground">Sidebar Width</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">1280px</div>
              <div className="text-sm text-muted-foreground">Max Content Width</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">16-24px</div>
              <div className="text-sm text-muted-foreground">Responsive Padding</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Mobile Responsive</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
