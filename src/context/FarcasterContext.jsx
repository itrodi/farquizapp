import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase, setCurrentUserFid } from '../services/supabase';
import {
  parseJwt,
  storeAuthData,
  getStoredAuthData,
  clearAuthData,
} from '../utils/auth';

const FarcasterContext = createContext({});

export const useFarcasterContext = () => {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error('useFarcasterContext must be used within FarcasterProvider');
  }
  return context;
};

// Helper function to safely convert proxy values to primitives
const safePrimitiveConversion = (value, defaultValue = '') => {
  if (value === null || value === undefined) return defaultValue;
  try {
    return String(value);
  } catch (error) {
    console.warn('Failed to convert value to string:', error);
    return defaultValue;
  }
};

const safeNumberConversion = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  try {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  } catch (error) {
    console.warn('Failed to convert value to number:', error);
    return defaultValue;
  }
};

export const FarcasterProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [contextUser, setContextUser] = useState(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing FarQuiz app...');
        
        // Check if we're in a mini app
        const inMiniApp = await sdk.isInMiniApp();
        console.log('Is in Mini App:', inMiniApp);
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Wait for context to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get context from SDK
          const context = sdk.context;
          console.log('SDK Context:', context);
          
          if (context?.user) {
            // Safely extract user data and convert proxy values to primitives
            const userData = {
              fid: safeNumberConversion(context.user.fid),
              username: safePrimitiveConversion(context.user.username),
              displayName: safePrimitiveConversion(context.user.displayName),
              pfpUrl: safePrimitiveConversion(context.user.pfpUrl)
            };
            
            console.log('Extracted user data:', userData);
            setContextUser(userData);
          }

          // Check for existing auth session
          const storedAuth = getStoredAuthData();
          if (storedAuth && !isTokenExpired(storedAuth.token)) {
            console.log('Found valid stored auth session');
            await loadUserFromAuth(storedAuth);
          }

          // Hide splash screen
          await sdk.actions.ready();
        } else {
          // Development mode
          console.log('Running in development mode');
          if (process.env.NODE_ENV === 'development') {
            setContextUser({
              fid: 12345,
              username: 'testuser',
              displayName: 'Test User',
              pfpUrl: ''
            });
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setError('Failed to initialize app');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const isTokenExpired = (token) => {
    try {
      const payload = parseJwt(token);
      if (!payload || !payload.exp) return true;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  const loadUserFromAuth = async (authData) => {
    try {
      const payload = parseJwt(authData.token);
      if (!payload || !payload.sub) {
        throw new Error('Invalid token');
      }

      const fid = typeof payload.sub === 'string' ? parseInt(payload.sub) : payload.sub;
      
      // Load or create user in database
      await loadOrCreateUser(fid, {
        fid,
        username: contextUser?.username || `user${fid}`,
        display_name: contextUser?.displayName || '',
        pfp_url: contextUser?.pfpUrl || ''
      });

      setAuthToken(authData.token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error loading user from auth:', error);
      clearAuthData();
      throw error;
    }
  };

  const loadOrCreateUser = async (fid, userData) => {
    try {
      // Set the FID for RLS
      await setCurrentUserFid(fid);

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

      if (!existingUser) {
        console.log('Creating new user for FID:', fid);
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            fid: fid,
            username: userData.username || `user${fid}`,
            display_name: userData.display_name || '',
            pfp_url: userData.pfp_url || '',
          })
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;
      } else {
        // Update user info if changed
        const updates = {};
        if (userData.username && userData.username !== existingUser.username) {
          updates.username = userData.username;
        }
        if (userData.display_name && userData.display_name !== existingUser.display_name) {
          updates.display_name = userData.display_name;
        }
        if (userData.pfp_url && userData.pfp_url !== existingUser.pfp_url) {
          updates.pfp_url = userData.pfp_url;
        }

        if (Object.keys(updates).length > 0) {
          const { data: updatedUser } = await supabase
            .from('users')
            .update(updates)
            .eq('id', existingUser.id)
            .select()
            .single();
          
          if (updatedUser) user = updatedUser;
        }
      }

      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading/creating user:', error);
      throw error;
    }
  };

  const signIn = async () => {
    if (!isInMiniApp) {
      setError('Sign in is only available in Farcaster');
      return { success: false, error: 'Not in Farcaster context' };
    }

    try {
      setError(null);
      setIsSigningIn(true);
      console.log('Starting sign in process...');

      // Use QuickAuth for simpler authentication
      const { token } = await sdk.experimental.quickAuth();
      console.log('QuickAuth successful');

      const authData = {
        token,
        method: 'quickAuth',
        timestamp: Date.now()
      };

      // Store auth data
      storeAuthData(authData);
      
      // Load user from auth
      await loadUserFromAuth(authData);

      console.log('Sign in completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      
      // If QuickAuth fails, try traditional SIWF
      try {
        console.log('Falling back to SIWF...');
        const nonce = generateNonce();
        const result = await sdk.actions.signIn({
          nonce,
          acceptAuthAddress: true,
        });

        const authData = {
          message: result.message,
          signature: result.signature,
          nonce,
          method: 'siwf',
          timestamp: Date.now()
        };

        storeAuthData(authData);
        
        // For SIWF, we'll use context user data
        if (contextUser?.fid) {
          await loadOrCreateUser(contextUser.fid, contextUser);
          setIsAuthenticated(true);
        }

        return { success: true };
      } catch (siwfError) {
        console.error('SIWF also failed:', siwfError);
        setError('Failed to sign in');
        return { success: false, error: siwfError.message };
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = () => {
    clearAuthData();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthToken(null);
    setError(null);
  };

  const shareQuiz = async (quizData) => {
    if (!isInMiniApp) {
      throw new Error('Sharing is only available in Farcaster');
    }

    try {
      const { shareQuizAsFrame } = await import('../services/farcaster/sharing');
      const result = await shareQuizAsFrame(sdk, quizData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to share quiz');
      }
      
      return result.cast;
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  };

  const shareResult = async (resultData) => {
    if (!isInMiniApp) {
      throw new Error('Sharing is only available in Farcaster');
    }

    try {
      const { shareResultAsFrame } = await import('../services/farcaster/sharing');
      const result = await shareResultAsFrame(sdk, resultData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to share result');
      }
      
      return result.cast;
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
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
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    authToken,
    isSigningIn,
    contextUser,
    isInMiniApp,
    user: contextUser,
    signIn,
    signOut,
    refreshUser,
    shareQuiz,
    shareResult,
  };

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
};

function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}