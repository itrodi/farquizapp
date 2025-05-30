import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { supabase, setCurrentUserFid } from '../services/supabase';
import {
  parseJwt,
  storeAuthData,
  getStoredAuthData,
  clearAuthData,
  generateSecureNonce,
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
          // Hide splash screen
          await sdk.actions.ready();
          
          // Check for existing auth session
          const storedAuth = getStoredAuthData();
          if (storedAuth && !isTokenExpired(storedAuth.token)) {
            console.log('Found valid stored auth session');
            await loadUserFromAuth(storedAuth);
          } else {
            // Auto sign-in for better UX
            await performSignIn();
          }
        } else {
          // Development mode
          console.log('Running in development mode');
          if (process.env.NODE_ENV === 'development') {
            const mockUser = {
              fid: 12345,
              username: 'testuser',
              displayName: 'Test User',
              pfpUrl: 'https://i.imgur.com/ybEiKVK.png'
            };
            setContextUser(mockUser);
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

  const performSignIn = async () => {
    try {
      console.log('Performing auto sign-in...');
      
      // Generate a nonce for the sign-in request
      const nonce = generateSecureNonce();
      
      // Request sign in with Farcaster
      const signInResult = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      });
      
      console.log('Sign in result:', signInResult);
      
      // Parse the SIWF message to extract user info
      const userInfo = parseSIWFMessage(signInResult.message);
      console.log('Parsed user info from SIWF:', userInfo);
      
      if (userInfo) {
        // Set context user from SIWF message
        setContextUser({
          fid: userInfo.fid,
          username: userInfo.username || `user${userInfo.fid}`,
          displayName: userInfo.displayName || userInfo.username || '',
          pfpUrl: userInfo.pfpUrl || ''
        });
      }
      
      // Use QuickAuth for session token
      const { token } = await sdk.experimental.quickAuth();
      
      const authData = {
        token,
        method: 'quickAuth',
        timestamp: Date.now(),
        userInfo // Store the parsed user info
      };
      
      storeAuthData(authData);
      await loadUserFromAuth(authData);
      
      return { success: true };
    } catch (error) {
      console.error('Auto sign-in failed:', error);
      // Don't set error state for auto sign-in failure
      return { success: false, error: error.message };
    }
  };

  const parseSIWFMessage = (message) => {
    try {
      // SIWF message format includes user info
      // Parse the message to extract FID and other details
      const lines = message.split('\n');
      let fid = null;
      let address = null;
      
      for (const line of lines) {
        if (line.includes('Farcaster ID:')) {
          fid = parseInt(line.split(':')[1].trim());
        } else if (line.includes('wants you to sign in with your Ethereum account:')) {
          address = line.split(':')[1].trim();
        }
      }
      
      return {
        fid,
        address,
        // These might not be in the SIWF message, but we'll get them from QuickAuth context
        username: null,
        displayName: null,
        pfpUrl: null
      };
    } catch (error) {
      console.error('Error parsing SIWF message:', error);
      return null;
    }
  };

  const isTokenExpired = (token) => {
    if (token === 'mock-token') return false;
    
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
      
      // Use stored user info or context user
      const userData = authData.userInfo || contextUser || {
        fid,
        username: `user${fid}`,
        display_name: '',
        pfp_url: ''
      };
      
      // Ensure FID matches
      userData.fid = fid;
      
      await loadOrCreateUser(fid, userData);
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
      console.log('Loading/creating user with data:', userData);
      
      // Set the FID for RLS
      setCurrentUserFid(fid).catch(console.warn);

      // Try to fetch existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('fid', fid)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
        throw fetchError;
      }

      let user = existingUser;

      if (!existingUser) {
        console.log('Creating new user for FID:', fid);
        
        const newUserData = {
          fid: fid,
          username: String(userData.username || `user${fid}`),
          display_name: String(userData.display_name || userData.displayName || userData.username || ''),
          pfp_url: String(userData.pfp_url || userData.pfpUrl || ''),
          bio: '',
          total_points: 0,
          total_quizzes_taken: 0
        };

        console.log('Creating user with data:', newUserData);

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(newUserData)
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }
        
        user = newUser;
        console.log('User created successfully:', user);
      } else {
        console.log('User already exists:', existingUser);
        
        // For now, don't update existing users
        // We'll need a proper way to get user profile data
      }

      setCurrentUser(user);
    } catch (error) {
      console.error('Error in loadOrCreateUser:', error);
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
      console.log('Starting manual sign in process...');

      // Perform sign in
      const result = await performSignIn();
      
      if (result.success) {
        console.log('Sign in completed successfully');
        return { success: true };
      } else {
        throw new Error(result.error || 'Sign in failed');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in');
      return { success: false, error: error.message };
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
      console.warn('Sharing is only available in Farcaster');
      return null;
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
      console.warn('Sharing is only available in Farcaster');
      return null;
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
    if (currentUser && currentUser.id) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (error) {
          console.error('Error refreshing user:', error);
        } else if (data) {
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