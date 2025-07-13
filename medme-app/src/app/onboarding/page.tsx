'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
// Removed framer-motion for better performance - using CSS animations
import { UserRole } from '@/lib/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, User, Shield } from 'lucide-react';

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return;

    setIsLoading(true);
    try {
      // Create user profile with selected role
      const response = await fetch('/api/users/create-profile-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        }),
      });

      console.log('📡 Onboarding: Response status:', response.status);
      console.log('📡 Onboarding: Response headers:', response.headers);

      if (response.ok) {
        // Check if response has content
        const text = await response.text();
        console.log('📡 Onboarding: Raw response:', text);

        if (!text) {
          console.log('⚠️ Onboarding: Empty response received');
          // Handle empty response as success
          const data = { message: 'Profile created successfully' };
          console.log('✅ Onboarding: Profile created successfully (empty response):', data);
        } else {
          const data = JSON.parse(text);
          console.log('✅ Onboarding: Profile created successfully:', data);
        }

        // Redirect based on role
        if (selectedRole === UserRole.PATIENT) {
          console.log('🏥 Onboarding: Redirecting to patient dashboard');
          router.push('/dashboard/patient');
        } else if (selectedRole === UserRole.DOCTOR) {
          console.log('👨‍⚕️ Onboarding: Redirecting to doctor onboarding');
          router.push('/onboarding/doctor');
        } else if (selectedRole === UserRole.ADMIN) {
          console.log('👑 Onboarding: Redirecting to admin dashboard');
          router.push('/dashboard/admin');
        }
      } else {
        // Handle error response safely
        let errorMessage = 'Unknown error';
        try {
          const errorText = await response.text();
          console.error('❌ Onboarding: Error response text:', errorText);

          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || 'Unknown error';
          }
        } catch (parseError) {
          console.error('❌ Onboarding: Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status})`;
        }

        console.error('❌ Onboarding: Failed to create profile:', errorMessage);

        // Even if there's an error, try to redirect to prevent user from being stuck
        if (selectedRole === UserRole.PATIENT) {
          router.push('/dashboard/patient');
        } else if (selectedRole === UserRole.DOCTOR) {
          router.push('/onboarding/doctor');
        } else if (selectedRole === UserRole.ADMIN) {
          router.push('/dashboard/admin');
        }
      }
    } catch (error) {
      console.error('💥 Onboarding: Error creating profile:', error);

      // Fallback: redirect anyway to prevent user from being stuck
      if (selectedRole === UserRole.PATIENT) {
        router.push('/dashboard/patient');
      } else if (selectedRole === UserRole.DOCTOR) {
        router.push('/onboarding/doctor');
      } else if (selectedRole === UserRole.ADMIN) {
        router.push('/dashboard/admin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    {
      role: UserRole.PATIENT,
      title: 'Patient',
      description: 'Book appointments and consult with doctors',
      icon: User,
      features: [
        'Browse and filter doctors by specialty',
        'Book virtual consultations',
        'Manage your health records',
        'Get 2 free credits to start',
      ],
    },
    {
      role: UserRole.DOCTOR,
      title: 'Doctor',
      description: 'Provide medical consultations to patients',
      icon: Stethoscope,
      features: [
        'Set your availability and schedule',
        'Conduct video consultations',
        'Manage patient appointments',
        'Earn credits for consultations',
      ],
    },
    {
      role: UserRole.ADMIN,
      title: 'Administrator',
      description: 'Manage platform and verify doctors',
      icon: Shield,
      features: [
        'Verify doctor applications',
        'Manage user accounts',
        'Monitor platform activity',
        'Administrative access only',
      ],
    },
  ];

  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to MedMe, {user?.firstName}!
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose your role to get started with your healthcare journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {roleOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={option.role}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                    selectedRole === option.role
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedRole(option.role)}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{option.title}</CardTitle>
                    <CardDescription className="text-lg">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {option.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button
            onClick={handleRoleSelection}
            disabled={!selectedRole || isLoading}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            {isLoading ? 'Creating Profile...' : 'Continue'}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            You can only select one role per account. Choose carefully!
          </p>
        </div>
      </div>
    </div>
  );
}
