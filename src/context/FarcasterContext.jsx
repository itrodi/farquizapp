import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFarcaster } from '../hooks/useFarcaster';
import { supabase, setCurrentUserFid } from '../services/supabase';

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

  useEffect(() => {
    const initializeUser = async () => {
      console.log('Initializing user...', { 
        isLoaded: farcaster.isLoaded, 
        user: farcaster.user,
        isInMiniApp: farcaster.isInMiniApp 
      });

      if (farcaster.isLoaded) {
        try {
          // Clear any previous errors
          setError(null);

          // Check if we have a user with valid FID
          if (farcaster.user && farcaster.user.fid) {
            console.log('Processing user with FID:', farcaster.user.fid);
            
            // Check if user exists in database
            const { data: existingUser, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('fid', farcaster.user.fid)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Error fetching user:', fetchError);
              setError('Failed to fetch user data');
              setIsLoading(false);
              return;
            }

            let userData = existingUser;

            // If user doesn't exist, create them
            if (!existingUser) {
              console.log('Creating new user for FID:', farcaster.user.fid);
              
              const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                  fid: farcaster.user.fid,
                  username: farcaster.user.username || `user${farcaster.user.fid}`,
                  display_name: farcaster.user.displayName || '',
                  pfp_url: farcaster.user.pfpUrl || '',
                })
                .select()
                .single();

              if (createError) {
                console.error('Error creating user:', createError);
                setError('Failed to create user account');
                setIsLoading(false);
                return;
              }

              userData = newUser;
              console.log('New user created:', userData);
            } else {
              console.log('Existing user found:', userData);
            }

            // Set the current user FID for RLS policies
            const rlsResult = await setCurrentUserFid(farcaster.user.fid);
            if (!rlsResult.success) {
              console.warn('Failed to set RLS context:', rlsResult.error);
            }

            setCurrentUser(userData);
            setIsAuthenticated(true);
            console.log('User authentication successful');
            
          } else if (farcaster.isInMiniApp) {
            // We're in a mini app but no user data available
            console.log('In mini app but no user data available');
            setError('Unable to get user information from Farcaster');
          } else {
            // Not in mini app context
            console.log('Not in Farcaster mini app context');
            // In development, we might have mock data
            if (farcaster.user) {
              console.log('Using mock user data');
              setCurrentUser({
                id: 'mock-id',
                fid: farcaster.user.fid,
                username: farcaster.user.username,
                display_name: farcaster.user.displayName,
                pfp_url: farcaster.user.pfpUrl
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

  const signIn = async () => {
    try {
      const result = await farcaster.signIn();
      console.log('Sign in completed:', result);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Failed to sign in with Farcaster');
      throw error;
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
    refreshUser,
    signIn,
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