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
          
          // Wait for context to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Try to get context data
          try {
            console.log('Attempting to get context...');
            // Try direct access as shown in docs
            const contextData = sdk.context;
            console.log('Context data:', contextData);
            
            // Try to access user directly
            if (contextData && contextData.user) {
              console.log('User from context:', contextData.user);
              
              // Try to extract values
              const userData = {
                fid: contextData.user.fid,
                username: contextData.user.username,
                displayName: contextData.user.displayName,
                pfpUrl: contextData.user.pfpUrl || contextData.user.pfp
              };
              
              console.log('Extracted user data:', userData);
              
              if (userData.fid) {
                setContextUser({
                  fid: userData.fid,
                  username: userData.username || `user${userData.fid}`,
                  displayName: userData.displayName || '',
                  pfpUrl: userData.pfpUrl || ''
                });
              }
            }
          } catch (contextError) {
            console.warn('Could not access context:', contextError);
          }
          
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
      
      // First try QuickAuth to get user info
      try {
        const { token } = await sdk.experimental.quickAuth();
        console.log('QuickAuth successful');
        
        // Parse token to get user info
        const payload = parseJwt(token);
        console.log('QuickAuth payload:', payload);
        
        const authData = {
          token,
          method: 'quickAuth',
          timestamp: Date.now()
        };
        
        storeAuthData(authData);
        await loadUserFromAuth(authData);
        
        return { success: true };
      } catch (quickAuthError) {
        console.warn('QuickAuth failed, falling back to SIWF:', quickAuthError);
      }
      
      // Fallback to SIWF
      const nonce = generateSecureNonce();
      const signInResult = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      });
      
      console.log('Sign in result:', signInResult);
      
      // Parse the SIWF message to extract user info
      const userInfo = parseSIWFMessage(signInResult.message);
      console.log('Parsed user info from SIWF:', userInfo);
      
      // Try to get additional user info from context after sign in
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const contextData = sdk.context;
        if (contextData && contextData.user) {
          console.log('Context user after sign in:', contextData.user);
          
          if (userInfo && contextData.user.fid === userInfo.fid) {
            // Merge context data with SIWF data
            userInfo.username = contextData.user.username || userInfo.username;
            userInfo.displayName = contextData.user.displayName || userInfo.displayName;
            userInfo.pfpUrl = contextData.user.pfpUrl || contextData.user.pfp || userInfo.pfpUrl;
          }
        }
      } catch (e) {
        console.warn('Could not get context after sign in:', e);
      }
      
      if (userInfo && userInfo.fid) {
        setContextUser({
          fid: userInfo.fid,
          username: userInfo.username || `user${userInfo.fid}`,
          displayName: userInfo.displayName || '',
          pfpUrl: userInfo.pfpUrl || ''
        });
      }
      
      // Get QuickAuth token for session
      const { token } = await sdk.experimental.quickAuth();
      
      const authData = {
        token,
        method: 'siwf',
        timestamp: Date.now(),
        userInfo
      };
      
      storeAuthData(authData);
      await loadUserFromAuth(authData);
      
      return { success: true };
    } catch (error) {
      console.error('Auto sign-in failed:', error);
      return { success: false, error: error.message };
    }
  };

  const parseSIWFMessage = (message) => {
    try {
      const lines = message.split('\n');
      let fid = null;
      let address = null;
      
      for (const line of lines) {
        if (line.includes('farcaster://fid/')) {
          const match = line.match(/farcaster:\/\/fid\/(\d+)/);
          if (match) {
            fid = parseInt(match[1]);
          }
        } else if (line.includes('0x')) {
          const match = line.match(/(0x[a-fA-F0-9]{40})/);
          if (match) {
            address = match[1];
          }
        }
      }
      
      return {
        fid,
        address,
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
        
        // Update user if we have new data
        const updates = {};
        let needsUpdate = false;
        
        // Only update if we have real data (not default values)
        if (userData.username && 
            !userData.username.match(/^user\d+$/) && 
            userData.username !== existingUser.username) {
          updates.username = String(userData.username);
          needsUpdate = true;
        }
        
        if (userData.display_name && 
            userData.display_name !== existingUser.display_name &&
            userData.display_name !== `user${fid}`) {
          updates.display_name = String(userData.display_name);
          needsUpdate = true;
        }
        
        if (userData.pfp_url && 
            userData.pfp_url !== existingUser.pfp_url &&
            userData.pfp_url !== '{}') {
          updates.pfp_url = String(userData.pfp_url);
          needsUpdate = true;
        }

        if (needsUpdate && Object.keys(updates).length > 0) {
          console.log('Updating user with:', updates);
          
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', existingUser.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Error updating user:', updateError);
          } else if (updatedUser) {
            user = updatedUser;
            console.log('User updated successfully');
          }
        }
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