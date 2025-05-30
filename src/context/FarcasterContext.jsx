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
          
          // Access context properties - handle both direct values and getter functions
          try {
            const context = sdk.context;
            console.log('Raw SDK context:', context);
            
            if (context && context.user) {
              // Extract user data, handling both direct properties and getter functions
              const extractValue = (value) => {
                if (typeof value === 'function') {
                  try {
                    return value();
                  } catch (e) {
                    console.warn('Failed to invoke getter:', e);
                    return undefined;
                  }
                }
                return value;
              };

              const userFid = extractValue(context.user.fid);
              const username = extractValue(context.user.username);
              const displayName = extractValue(context.user.displayName);
              const pfpUrl = extractValue(context.user.pfpUrl);
              
              console.log('Extracted context user data:', { userFid, username, displayName, pfpUrl });
              
              if (userFid) {
                setContextUser({
                  fid: userFid,
                  username: username || `user${userFid}`,
                  displayName: displayName || username || '',
                  pfpUrl: pfpUrl || ''
                });
              }
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
            // Create a mock user for development
            const mockUser = {
              fid: 12345,
              username: 'testuser',
              displayName: 'Test User',
              pfpUrl: ''
            };
            setContextUser(mockUser);
            
            // Auto-authenticate in development
            const mockAuth = {
              token: 'mock-token',
              method: 'development',
              timestamp: Date.now()
            };
            
            // Create user in database
            await loadOrCreateUser(mockUser.fid, mockUser);
            setIsAuthenticated(true);
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
    if (token === 'mock-token') return false; // Development token never expires
    
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
      // Handle mock token for development
      if (authData.token === 'mock-token') {
        if (contextUser) {
          await loadOrCreateUser(contextUser.fid, contextUser);
          setAuthToken(authData.token);
          setIsAuthenticated(true);
        }
        return;
      }

      const payload = parseJwt(authData.token);
      if (!payload || !payload.sub) {
        throw new Error('Invalid token');
      }

      const fid = typeof payload.sub === 'string' ? parseInt(payload.sub) : payload.sub;
      
      // Get user data from context or use FID
      const userData = contextUser || {
        fid,
        username: `user${fid}`,
        display_name: '',
        pfp_url: ''
      };
      
      // Ensure FID matches
      userData.fid = fid;
      
      // Load or create user in database
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
      
      // Set the FID for RLS (don't await to avoid blocking)
      setCurrentUserFid(fid).catch(err => 
        console.warn('Could not set RLS context (non-critical):', err)
      );

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
        
        // Create new user with all required fields
        const newUserData = {
          fid: fid,
          username: userData.username || `user${fid}`,
          display_name: userData.display_name || userData.displayName || userData.username || '',
          pfp_url: userData.pfp_url || userData.pfpUrl || '',
          bio: userData.bio || '',
          total_points: 0,
          total_quizzes_taken: 0,
          created_at: new Date().toISOString()
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
        
        // Update user info if changed
        const updates = {};
        
        // Handle both naming conventions
        const newUsername = userData.username || userData.displayName;
        const newDisplayName = userData.display_name || userData.displayName || userData.username;
        const newPfpUrl = userData.pfp_url || userData.pfpUrl;
        
        if (newUsername && newUsername !== existingUser.username) {
          updates.username = newUsername;
        }
        if (newDisplayName && newDisplayName !== existingUser.display_name) {
          updates.display_name = newDisplayName;
        }
        if (newPfpUrl && newPfpUrl !== existingUser.pfp_url) {
          updates.pfp_url = newPfpUrl;
        }

        if (Object.keys(updates).length > 0) {
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
          }
        }
      }

      setCurrentUser(user);
      console.log('Current user set:', user);
    } catch (error) {
      console.error('Error in loadOrCreateUser:', error);
      throw error;
    }
  };

  const signIn = async () => {
    if (!isInMiniApp) {
      // In development, auto-sign in
      if (process.env.NODE_ENV === 'development' && contextUser) {
        const mockAuth = {
          token: 'mock-token',
          method: 'development',
          timestamp: Date.now()
        };
        
        storeAuthData(mockAuth);
        await loadUserFromAuth(mockAuth);
        return { success: true };
      }
      
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