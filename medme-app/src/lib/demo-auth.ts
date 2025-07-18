// Demo Authentication System
// This provides a working authentication system for development when Clerk keys are not available

export interface DemoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor' | 'admin';
  createdAt: string;
  isDemo: boolean;
}

export class DemoAuthService {
  private static readonly STORAGE_KEY = 'demoUser';
  private static readonly AUTH_KEY = 'demoAuth';

  // Check if demo mode is enabled
  static isDemoMode(): boolean {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
           typeof window !== 'undefined' && localStorage.getItem('forceDemoMode') === 'true';
  }

  // Get current demo user
  static getCurrentUser(): DemoUser | null {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem(this.STORAGE_KEY);
    const isAuthenticated = localStorage.getItem(this.AUTH_KEY);
    
    if (!userData || !isAuthenticated) return null;
    
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  // Sign in with demo credentials
  static signIn(email: string, password: string): Promise<DemoUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Demo credentials
        const demoCredentials = [
          { email: 'patient@demo.com', password: 'demo123', role: 'patient' as const },
          { email: 'doctor@demo.com', password: 'demo123', role: 'doctor' as const },
          { email: 'admin@demo.com', password: 'demo123', role: 'admin' as const },
        ];

        const credential = demoCredentials.find(c => c.email === email && c.password === password);
        
        if (!credential) {
          reject(new Error('Invalid credentials'));
          return;
        }

        const user: DemoUser = {
          id: `demo_${credential.role}_${Date.now()}`,
          email: credential.email,
          firstName: 'Demo',
          lastName: credential.role.charAt(0).toUpperCase() + credential.role.slice(1),
          role: credential.role,
          createdAt: new Date().toISOString(),
          isDemo: true,
        };

        this.setCurrentUser(user);
        resolve(user);
      }, 1000); // Simulate network delay
    });
  }

  // Sign up with demo data
  static signUp(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'patient' | 'doctor' | 'admin';
  }): Promise<DemoUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user: DemoUser = {
          id: `demo_${userData.role}_${Date.now()}`,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          createdAt: new Date().toISOString(),
          isDemo: true,
        };

        this.setCurrentUser(user);
        resolve(user);
      }, 1000);
    });
  }

  // Quick role-based sign in
  static quickSignIn(role: 'patient' | 'doctor' | 'admin'): Promise<DemoUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user: DemoUser = {
          id: `demo_${role}_${Date.now()}`,
          email: `demo.${role}@medme.com`,
          firstName: 'Demo',
          lastName: role.charAt(0).toUpperCase() + role.slice(1),
          role: role,
          createdAt: new Date().toISOString(),
          isDemo: true,
        };

        this.setCurrentUser(user);
        resolve(user);
      }, 500);
    });
  }

  // Set current user
  static setCurrentUser(user: DemoUser): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(this.AUTH_KEY, 'true');
  }

  // Sign out
  static signOut(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.AUTH_KEY);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    return localStorage.getItem(this.AUTH_KEY) === 'true' && 
           localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  // Get user role
  static getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  // Force demo mode (for testing)
  static forceDemoMode(enabled: boolean = true): void {
    if (typeof window === 'undefined') return;
    
    if (enabled) {
      localStorage.setItem('forceDemoMode', 'true');
    } else {
      localStorage.removeItem('forceDemoMode');
    }
  }

  // Get demo users for testing
  static getDemoUsers(): Array<{email: string, password: string, role: string}> {
    return [
      { email: 'patient@demo.com', password: 'demo123', role: 'patient' },
      { email: 'doctor@demo.com', password: 'demo123', role: 'doctor' },
      { email: 'admin@demo.com', password: 'demo123', role: 'admin' },
    ];
  }
}

// React hook for demo authentication
export function useDemoAuth() {
  const [user, setUser] = React.useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const currentUser = DemoAuthService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await DemoAuthService.signIn(email, password);
      setUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'patient' | 'doctor' | 'admin';
  }) => {
    setIsLoading(true);
    try {
      const user = await DemoAuthService.signUp(userData);
      setUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const quickSignIn = async (role: 'patient' | 'doctor' | 'admin') => {
    setIsLoading(true);
    try {
      const user = await DemoAuthService.quickSignIn(role);
      setUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    DemoAuthService.signOut();
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    quickSignIn,
    signOut,
    isDemoMode: DemoAuthService.isDemoMode(),
  };
}

// Import React for the hook
import React from 'react';
