import React, { createContext, useContext, useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { verifySignInMessage } from '@farcaster/auth-kit';
import { generateNonce } from '../utils/auth';

const FarcasterAuthContext = createContext(undefined);

export function FarcasterAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        const isInMiniApp = await sdk.isInMiniApp();
        if (!isInMiniApp) {
          setError('This app must be opened in a Farcaster client');
          setIsLoading(false);
          return;
        }

        // Check if we have context (user might be already signed in)
        if (sdk.context?.user) {
          setUser({
            fid: sdk.context.user.fid,
            username: sdk.context.user.username,
            displayName: sdk.context.user.displayName,
            pfpUrl: sdk.context.user.pfpUrl
          });
          setIsAuthenticated(true);
        }

        // Hide splash screen
        await sdk.actions.ready();
      } catch (err) {
        console.error('Failed to initialize Farcaster:', err);
        setError('Failed to initialize Farcaster');
      } finally {
        setIsLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const nonce = generateNonce();
      const signInResult = await sdk.actions.signIn({ nonce });

      // Verify the signature
      const verified = await verifySignInMessage(
        signInResult.message,
        signInResult.signature
      );

      if (!verified.success) {
        throw new Error('Failed to verify signature');
      }

      // Get user data from context after successful sign in
      if (sdk.context?.user) {
        setUser({
          fid: sdk.context.user.fid,
          username: sdk.context.user.username,
          displayName: sdk.context.user.displayName,
          pfpUrl: sdk.context.user.pfpUrl
        });
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Sign in failed:', err);
      setError('Failed to sign in with Farcaster');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <FarcasterAuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        error,
        signIn,
        signOut
      }}
    >
      {children}
    </FarcasterAuthContext.Provider>
  );
}

export function useFarcasterAuth() {
  const context = useContext(FarcasterAuthContext);
  if (context === undefined) {
    throw new Error('useFarcasterAuth must be used within a FarcasterAuthProvider');
  }
  return context;
} 