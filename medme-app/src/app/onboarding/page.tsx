'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserRole } from '@/lib/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, User } from 'lucide-react';

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
      const response = await fetch('/api/users/create-profile', {
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

      if (response.ok) {
        // Redirect based on role
        if (selectedRole === UserRole.PATIENT) {
          router.push('/dashboard/patient');
        } else if (selectedRole === UserRole.DOCTOR) {
          router.push('/onboarding/doctor');
        } else if (selectedRole === UserRole.ADMIN) {
          router.push('/dashboard/admin');
        }
      } else {
        throw new Error('Failed to create profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      // Handle error (show toast, etc.)
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
  ];

  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to MedMe, {user?.firstName}!
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose your role to get started with your healthcare journey
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {roleOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
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
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
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
        </motion.div>
      </div>
    </div>
  );
}
