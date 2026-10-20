import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { repository } from '../repository';
import { UserProfile } from '../types';

export interface AuthContextType {
  user: { id: string; email?: string; name?: string } | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isDemo: boolean;
  demoPersona: 'rohan' | 'meena' | 'aarav' | null;
  isOnboarded: boolean;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInAsGuest: () => void;
  startDemo: (personaId: 'rohan' | 'meena' | 'aarav') => Promise<void>;
  exitDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (profile: UserProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'pennypath_auth_user';
const GUEST_FLAG_KEY = 'pennypath_is_guest';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem(GUEST_FLAG_KEY) === 'true';
  });

  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return repository.isDemoMode();
  });

  const [demoPersona, setDemoPersona] = useState<'rohan' | 'meena' | 'aarav' | null>(() => {
    return repository.getDemoPersona();
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);

  const loadProfile = async () => {
    const prof = await repository.getProfile();
    setProfile(prof);
    setIsOnboarded(Boolean(prof && prof.monthlyIncome > 0));
    setIsDemo(repository.isDemoMode());
    setDemoPersona(repository.getDemoPersona());
  };

  useEffect(() => {
    loadProfile();

    // Listen to Supabase auth state if configured
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          };
          setUser(authUser);
          setIsGuest(false);
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
          localStorage.removeItem(GUEST_FLAG_KEY);
        } else if (event === 'SIGNED_OUT') {
          if (!localStorage.getItem(GUEST_FLAG_KEY) && !repository.isDemoMode()) {
            setUser(null);
            localStorage.removeItem(AUTH_USER_KEY);
          }
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      // Graceful local/offline mock for magic link when Supabase isn't configured or offline
      const mockUser = {
        id: `mock-user-${Date.now()}`,
        email,
        name: email.split('@')[0],
      };
      setUser(mockUser);
      setIsGuest(false);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
      localStorage.removeItem(GUEST_FLAG_KEY);
      return {
        success: true,
        message: 'A simulated magic link was generated (Offline/Mock Mode). You are now authenticated!',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'Check your email for the magic login link!' };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Failed to send magic link' };
    }
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      const mockUser = {
        id: `google-user-${Date.now()}`,
        email: 'user@google.com',
        name: 'Google User',
      };
      setUser(mockUser);
      setIsGuest(false);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
      localStorage.removeItem(GUEST_FLAG_KEY);
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Google sign in failed' };
    }
  };

  const signInAsGuest = () => {
    const guestUser = {
      id: `guest-${Date.now()}`,
      name: 'Guest Explorer',
    };
    setUser(guestUser);
    setIsGuest(true);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(guestUser));
    localStorage.setItem(GUEST_FLAG_KEY, 'true');
  };

  const startDemo = async (personaId: 'rohan' | 'meena' | 'aarav') => {
    const demoProf = await repository.seedPersona(personaId);
    const demoUser = {
      id: `demo-${personaId}`,
      name: demoProf.name,
      email: `${personaId}@pennypath.demo`,
    };
    setUser(demoUser);
    setIsDemo(true);
    setDemoPersona(personaId);
    setIsGuest(false);
    setProfile(demoProf);
    setIsOnboarded(true);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(demoUser));
    localStorage.removeItem(GUEST_FLAG_KEY);
  };

  const exitDemo = async () => {
    await repository.exitDemo();
    setIsDemo(false);
    setDemoPersona(null);
    setUser(null);
    setIsGuest(false);
    setProfile(null);
    setIsOnboarded(false);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(GUEST_FLAG_KEY);
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsGuest(false);
    setIsDemo(false);
    setDemoPersona(null);
    setProfile(null);
    setIsOnboarded(false);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(GUEST_FLAG_KEY);
    await repository.resetSeedData();
  };

  const completeOnboarding = async (newProfile: UserProfile) => {
    await repository.saveProfile(newProfile);
    setProfile(newProfile);
    setIsOnboarded(true);
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  const isAuthenticated = Boolean(user || isGuest || isDemo);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isGuest,
        isDemo,
        demoPersona,
        isOnboarded,
        signInWithMagicLink,
        signInWithGoogle,
        signInAsGuest,
        startDemo,
        exitDemo,
        signOut,
        completeOnboarding,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
