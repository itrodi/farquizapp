import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFarcaster } from '../hooks/useFarcaster';
import { supabase, setCurrentUserFid } from '../services/supabase';
import {
  extractUserFromQuickAuth,
  storeAuthData,
  getStoredAuthData,
  clearAuthData,
  isAuthenticated as checkAuthenticated,
  formatUserDisplayName
} from '../utils/auth';

const FarcasterContext = createContext({});

export const useFarcasterContext = () => {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error('useFarcasterContext must be used within FarcasterProvider');
  }
  return context;
};

export const FarcasterProvider = ({ children }) => {
  const farcaster = useFarcaster();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    const initializeUser = async () => {
      console.log('Initializing user...', { 
        isLoaded: farcaster.isLoaded, 
        user: farcaster.user,
        isInMiniApp: farcaster.isInMiniApp 
      });

      if (farcaster.isLoaded) {
        try {
          setError(null);

          // Check for existing auth session
          const storedAuth = getStoredAuthData();
          if (storedAuth) {
            console.log('Found valid stored auth session');
            setAuthToken(storedAuth.token);
            await loadUserFromAuth(storedAuth);
            setIsLoading(false);
            return;
          }

          // If we have user context from Farcaster but no auth session,
          // we need the user to explicitly sign in
          if (farcaster.user && farcaster.user.fid) {
            console.log('User context available but not authenticated');
            // Don't auto-authenticate, wait for explicit sign in
          } else if (!farcaster.isInMiniApp) {
            // Development mode
            if (process.env.NODE_ENV === 'development') {
              console.log('Development mode - mock authentication');
              setCurrentUser({
                id: 'mock-id',
                fid: 12345,
                username: 'testuser',
                display_name: 'Test User',
                pfp_url: ''
              });
              setIsAuthenticated(true);
            }
          }
        } catch (error) {
          console.error('Error initializing user:', error);
          setError('Failed to initialize user session');
        }
      }
      
      setIsLoading(false);
    };

    initializeUser();
  }, [farcaster.isLoaded, farcaster.user, farcaster.isInMiniApp]);

  const loadUserFromAuth = async (authData) => {
    try {
      // If using QuickAuth, decode the JWT to get user info
      if (authData.method === 'quickAuth' && authData.token) {
        const userInfo = extractUserFromQuickAuth(authData.token);
        if (userInfo && userInfo.fid) {
          console.log('QuickAuth user info:', userInfo);
          
          // Load or create user based on FID
          await loadOrCreateUser(userInfo.fid, {
            fid: userInfo.fid,
            username: farcaster.user?.username || `user${userInfo.fid}`,
            display_name: farcaster.user?.displayName || '',
            pfp_url: farcaster.user?.pfpUrl || ''
          });
          
          setIsAuthenticated(true);
          return;
        }
      }

      // If using SIWF, we would verify the signature here
      if (authData.method === 'siwf') {
        // For now, just use the context user data
        if (farcaster.user?.fid) {
          await loadOrCreateUser(farcaster.user.fid, farcaster.user);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error loading user from auth:', error);
      clearAuthData();
      throw error;
    }
  };

  const loadOrCreateUser = async (fid, userData) => {
    try {
      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('fid', fid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let user = existingUser;

      // Create user if doesn't exist
      if (!existingUser) {
        console.log('Creating new user for FID:', fid);
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            fid: fid,
            username: userData.username || `user${fid}`,
            display_name: userData.displayName || userData.display_name || '',
            pfp_url: userData.pfpUrl || userData.pfp_url || '',
          })
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;
      }

      // Set RLS context
      await setCurrentUserFid(fid);
      setCurrentUser(user);
      
    } catch (error) {
      console.error('Error loading/creating user:', error);
      throw error;
    }
  };

  const signIn = async () => {
    try {
      setError(null);
      console.log('Starting sign in process...');
      
      const authResult = await farcaster.signIn();
      console.log('Auth result:', authResult);

      // Store the auth data
      const authData = {
        ...authResult,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        timestamp: Date.now()
      };

      storeAuthData(authData);
      setAuthToken(authResult.token || 'authenticated');

      // Load user data
      await loadUserFromAuth(authData);

      console.log('Sign in completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      return { success: false, error: error.message };
    }
  };

  const signOut = () => {
    clearAuthData();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthToken(null);
    setError(null);
  };

  const refreshUser = async () => {
    if (currentUser && currentUser.id !== 'mock-id') {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (data) {
          setCurrentUser(data);
        }
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  const value = {
    // Spread all farcaster properties
    ...farcaster,
    // Override/add our custom properties
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    authToken,
    signIn,
    signOut,
    refreshUser,
    // Keep the sharing functions from farcaster
    shareQuiz: farcaster.shareQuiz,
    shareResult: farcaster.shareResult,
  };

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
};