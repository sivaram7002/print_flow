import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getUserProfile,
} from '../lib/supabase';
import {
  MOCK_CUSTOMER_PROFILE,
  MOCK_ADMIN_PROFILE,
} from '../lib/mockData';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  isDemoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setDemoRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [demoRole, setDemoRoleState] = useState<UserRole>('customer');

  const isDemo = !isSupabaseConfigured || !user;

  // Fetch or sync user profile
  const fetchProfile = async (currentUserId: string, currentUserEmail?: string, currentFullName?: string) => {
    if (!supabase) return;
    try {
      const existing = await getUserProfile(currentUserId);
      if (existing) {
        setProfile(existing);
      } else {
        // Fallback default profile if trigger takes a moment
        const fallback: Profile = {
          id: currentUserId,
          email: currentUserEmail || '',
          full_name: currentFullName || currentUserEmail?.split('@')[0] || 'User',
          role: 'customer',
          created_at: new Date().toISOString(),
        };
        setProfile(fallback);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // In demo mode: set initial customer profile
      setProfile(demoRole === 'admin' ? MOCK_ADMIN_PROFILE : MOCK_CUSTOMER_PROFILE);
      setIsLoading(false);
      return;
    }

    // Supabase Auth listener
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.full_name || session.user.user_metadata?.name
          );
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(
          session.user.id,
          session.user.email,
          session.user.user_metadata?.full_name || session.user.user_metadata?.name
        );
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [demoRole]);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Simulated sign-in in demo mode
      setUser({
        id: demoRole === 'admin' ? MOCK_ADMIN_PROFILE.id : MOCK_CUSTOMER_PROFILE.id,
        email: demoRole === 'admin' ? MOCK_ADMIN_PROFILE.email! : MOCK_CUSTOMER_PROFILE.email!,
        user_metadata: {
          full_name: demoRole === 'admin' ? MOCK_ADMIN_PROFILE.full_name : MOCK_CUSTOMER_PROFILE.full_name,
        },
      } as unknown as User);
      setProfile(demoRole === 'admin' ? MOCK_ADMIN_PROFILE : MOCK_CUSTOMER_PROFILE);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const setDemoRole = (role: UserRole) => {
    setDemoRoleState(role);
    const mockProfile = role === 'admin' ? MOCK_ADMIN_PROFILE : MOCK_CUSTOMER_PROFILE;
    setProfile(mockProfile);
    setUser({
      id: mockProfile.id,
      email: mockProfile.email!,
      user_metadata: { full_name: mockProfile.full_name },
    } as unknown as User);
  };

  const refreshProfile = async () => {
    if (user && supabase) {
      await fetchProfile(user.id, user.email, user.user_metadata?.full_name);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isLoading,
        isSupabaseConfigured,
        isDemoMode: isDemo,
        signInWithGoogle,
        signOut,
        setDemoRole,
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
