import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { NotificationProvider } from '@/contexts/NotificationContext';
// import { PWAInstaller } from '@/components/PWAInstaller'; // Temporarily disabled
// import { PerformanceOptimizer } from '@/components/PerformanceOptimizer'; // Temporarily disabled
// import { SecurityInitializer } from '@/components/SecurityInitializer'; // Temporarily disabled
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only preload primary font
});

export const metadata: Metadata = {
  title: "MedMe - Doctor Appointment Platform",
  description: "Connect with qualified medical professionals for virtual consultations",
  keywords: "doctor, appointment, telemedicine, healthcare, consultation",
  authors: [{ name: "MedMe Team" }],
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NODE_ENV === 'production' ? 'https://medme.app' : 'http://localhost:3000'),
  other: {
    // Optimize for performance
    'theme-color': '#0891b2',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
      afterSignInUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
      afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: 'hsl(var(--primary))',
          colorBackground: 'hsl(var(--background))',
          colorInputBackground: 'hsl(var(--background))',
          colorInputText: 'hsl(var(--foreground))',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* <SecurityInitializer /> Temporarily disabled to fix runtime error */}
          {/* <PerformanceOptimizer /> Temporarily disabled to fix runtime error */}
          <NotificationProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                },
              }}
            />
            {/* <PWAInstaller /> Temporarily disabled to fix runtime error */}
          </NotificationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
