// ==============================================================================
// I2B - Authentication Context (Single Administrator)
// Integrates with Supabase Auth with seamless fallback for offline administration
// ==============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  name: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUpAdmin: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ADMIN_KEY = 'i2b_admin_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // 1. Check active Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email || 'admin@i2b-edu.com',
            role: 'admin',
            name: session.user.user_metadata?.name || 'Administrator',
          });
          setLoading(false);
          return;
        }

        // 2. Check local fallback session
        const localSession = localStorage.getItem(LOCAL_ADMIN_KEY);
        if (localSession && mounted) {
          setUser(JSON.parse(localSession));
        }
      } catch (err) {
        console.warn('Auth initialization fallback:', err);
      } finally {
        if (mounted) setLoading(false);
      }

      // Listen for Supabase auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          const adminUser: AdminUser = {
            id: session.user.id,
            email: session.user.email || 'admin@i2b-edu.com',
            role: 'admin',
            name: session.user.user_metadata?.name || 'Administrator',
          };
          setUser(adminUser);
          localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(adminUser));
        } else {
          // If logged out from Supabase and not in local demo session
          const localSession = localStorage.getItem(LOCAL_ADMIN_KEY);
          if (!localSession) {
            setUser(null);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setLoading(true);
    try {
      // 1. Try Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const adminUser: AdminUser = {
          id: data.user.id,
          email: data.user.email || email,
          role: 'admin',
          name: data.user.user_metadata?.name || 'Administrator',
        };
        setUser(adminUser);
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(adminUser));
        setLoading(false);
        return {};
      }

      // 2. Single Admin default credential check (for setup / initial deployment)
      if (
        (email.toLowerCase() === 'admin@i2b-edu.com' || email.toLowerCase() === 'admin@i2b.com') &&
        (password === 'Admin@123' || password === 'admin123')
      ) {
        const adminUser: AdminUser = {
          id: 'admin-local-master',
          email: email.toLowerCase(),
          role: 'admin',
          name: 'I2B Institution Admin',
        };
        setUser(adminUser);
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(adminUser));
        setLoading(false);
        return {};
      }

      setLoading(false);
      return { error: error?.message || 'Invalid administrator email or password.' };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Login failed' };
    }
  };

  const signUpAdmin = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: 'Administrator', role: 'admin' },
        },
      });

      if (error) return { error: error.message };

      if (data.user) {
        const adminUser: AdminUser = {
          id: data.user.id,
          email: data.user.email || email,
          role: 'admin',
          name: 'Administrator',
        };
        setUser(adminUser);
        localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(adminUser));
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to create admin user' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem(LOCAL_ADMIN_KEY);
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Password reset request failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: !!user,
        signIn,
        signUpAdmin,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
