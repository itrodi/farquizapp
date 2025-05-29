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

  useEffect(() => {
    const initializeUser = async () => {
      if (farcaster.isLoaded && farcaster.user) {
        try {
          // Check if user exists in database
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('fid', farcaster.user.fid)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchError);
            setIsLoading(false);
            return;
          }

          let userData = existingUser;

          // If user doesn't exist, create them
          if (!existingUser) {
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
              setIsLoading(false);
              return;
            }

            userData = newUser;
          }

          // Set the current user FID for RLS policies
          await setCurrentUserFid(farcaster.user.fid);

          setCurrentUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error initializing user:', error);
        }
      }
      setIsLoading(false);
    };

    initializeUser();
  }, [farcaster.isLoaded, farcaster.user]);

  const value = {
    ...farcaster,
    currentUser,
    isAuthenticated,
    isLoading,
    refreshUser: async () => {
      if (currentUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (data) {
          setCurrentUser(data);
        }
      }
    },
  };

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
};