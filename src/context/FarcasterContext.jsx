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
          // Wait for SDK to be ready
          await sdk.actions.ready();
          
          // Wait a bit for context to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Access context directly as shown in the documentation
          try {
            console.log('Accessing SDK context...');
            
            // According to the docs, context should be accessed directly
            if (sdk.context && sdk.context.user) {
              const user = sdk.context.user;
              console.log('Context user:', user);
              
              // Extract user data - note the docs show 'pfp' not 'pfpUrl'
              const userData = {
                fid: user.fid,
                username: user.username,
                displayName: user.displayName,
                pfpUrl: user.pfpUrl || user.pfp // Handle both property names
              };
              
              console.log('Extracted user data:', userData);
              
              // Only set context user if we have valid FID
              if (userData.fid) {
                setContextUser({
                  fid: userData.fid,
                  username: userData.username || `user${userData.fid}`,
                  displayName: userData.displayName || '',
                  pfpUrl: userData.pfpUrl || ''
                });
              }
            } else {
              console.warn('No user context available');
            }
          } catch (contextError) {
            console.error('Error accessing context:', contextError);
          }

          // Check for existing auth session
          const storedAuth = getStoredAuthData();
          if (storedAuth && !isTokenExpired(storedAuth.token)) {
            console.log('Found valid stored auth session');
            await loadUserFromAuth(storedAuth);
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
      
      // Use context user data if available
      const userData = contextUser && contextUser.fid === fid ? {
        fid: contextUser.fid,
        username: contextUser.username,
        display_name: contextUser.displayName || contextUser.username,
        pfp_url: contextUser.pfpUrl
      } : {
        fid,
        username: `user${fid}`,
        display_name: '',
        pfp_url: ''
      };
      
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
          display_name: String(userData.display_name || userData.username || ''),
          pfp_url: String(userData.pfp_url || ''),
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
        
        // Update user if we have better data
        const updates = {};
        let needsUpdate = false;
        
        // Fix invalid data
        if (!existingUser.display_name || existingUser.display_name === '{}' || existingUser.display_name === '') {
          if (userData.display_name && userData.display_name !== '{}') {
            updates.display_name = String(userData.display_name);
            needsUpdate = true;
          }
        }
        
        if (!existingUser.pfp_url || existingUser.pfp_url === '{}' || existingUser.pfp_url === '') {
          if (userData.pfp_url && userData.pfp_url !== '{}') {
            updates.pfp_url = String(userData.pfp_url);
            needsUpdate = true;
          }
        }
        
        // Update username if we have a real username (not userXXXXX format)
        if (userData.username && 
            !userData.username.match(/^user\d+$/) && 
            userData.username !== existingUser.username) {
          updates.username = String(userData.username);
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
      console.log('Starting sign in process...');

      // Try to get context data before signing in
      try {
        if (sdk.context && sdk.context.user) {
          const user = sdk.context.user;
          const userData = {
            fid: user.fid,
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl || user.pfp
          };
          
          if (userData.fid && (!contextUser || contextUser.fid !== userData.fid)) {
            setContextUser({
              fid: userData.fid,
              username: userData.username || `user${userData.fid}`,
              displayName: userData.displayName || '',
              pfpUrl: userData.pfpUrl || ''
            });
          }
        }
      } catch (e) {
        console.warn('Could not get context:', e);
      }

      // Use QuickAuth
      const { token } = await sdk.experimental.quickAuth();
      console.log('QuickAuth successful');

      const authData = {
        token,
        method: 'quickAuth',
        timestamp: Date.now()
      };

      storeAuthData(authData);
      await loadUserFromAuth(authData);

      console.log('Sign in completed successfully');
      return { success: true };
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

function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}