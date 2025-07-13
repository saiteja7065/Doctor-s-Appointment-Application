'use client';

// Removed framer-motion for better performance - using CSS animations instead
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Shield, Clock, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const features = [
    {
      icon: Stethoscope,
      title: 'Expert Medical Care',
      description: 'Connect with verified medical professionals from various specialties',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your health data is protected with enterprise-grade security',
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Book appointments that fit your schedule, anytime',
    },
    {
      icon: Users,
      title: 'Global Network',
      description: 'Access healthcare professionals from around the world',
    },
  ];

  return (
    <div className="min-h-screen medical-gradient">
      {/* Header */}
      <header className="glass-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">MedMe</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/apply-doctor">
              <Button variant="outline" className="hidden sm:flex">
                Join as Doctor
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6">
            Your Health,
            <span className="text-primary"> Simplified</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Connect with qualified medical professionals for secure, convenient virtual consultations.
            Get the care you need, when you need it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Why Choose MedMe?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience healthcare that adapts to your lifestyle with our innovative platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <Card className="glass-card h-full hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
