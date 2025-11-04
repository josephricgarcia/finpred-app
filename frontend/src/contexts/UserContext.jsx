// UserContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import supabase from '../helper/supabaseClient';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);
  const isInitializing = useRef(false);

  // Normalize Supabase user to app userData shape
  const mapSupabaseUserToUserData = (user) => {
    if (!user) return null;
    const username = user.user_metadata?.username || '';
    return {
      uid: user.id,
      username,
      email: user.email || '',
      createdAt: user.created_at ? new Date(user.created_at) : null,
      lastUpdated: user.updated_at ? new Date(user.updated_at) : null
    };
  };

  // Fetch current session/user from Supabase
  const fetchUserData = async () => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    try {
      setIsLoading(true);
      setError(null);
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const session = data?.session || null;
      const user = session?.user || null;
      setUserData(mapSupabaseUserToUserData(user));
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load user data');
      setUserData(null);
    } finally {
      setIsLoading(false);
      isInitializing.current = false;
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        return { success: false, error: signInError.message };
      }

      const user = data?.user || null;
      if (!user) {
        return { success: false, error: 'No user returned from Supabase.' };
      }

      setUserData(mapSupabaseUserToUserData(user));
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Login/Signup with Google via Supabase OAuth
  const loginWithGoogle = async () => {
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (oauthError) {
        console.error('Google OAuth error:', oauthError);
        return { success: false, error: oauthError.message };
      }

      // On success, Supabase redirects; return pending success to allow UI loading state
      return { success: true };
    } catch (err) {
      console.error('Google OAuth error:', err);
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      // If email confirmations are enabled, there may be no session yet
      const user = data?.user || null;
      const session = data?.session || null;

      if (session && user) {
        setUserData(mapSupabaseUserToUserData(user));
        return { success: true };
      }

      // No active session yet – require email confirmation
      return { success: false, error: 'Please confirm your email to complete signup.' };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUserData(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setUserData(null);
    }
  };

  // Update user data function
  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  // Handle account deletion - clear all user data
  const handleAccountDeletion = () => {
    setUserData(null);
    setError(null);
  };

  // Check authentication on app start
  useEffect(() => {
    if (hasInitialized.current) return;
    fetchUserData();
    hasInitialized.current = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setUserData(mapSupabaseUserToUserData(user));
    });

    return () => {
      subscription.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        userData,
        isLoading,
        error,
        isAuthenticated: !!userData,
        login,
        loginWithGoogle,
        register,
        logout,
        updateUserData,
        handleAccountDeletion
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
