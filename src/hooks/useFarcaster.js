import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';

export const useFarcaster = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [error, setError] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        console.log('Initializing Farcaster SDK...');
        
        // Check if we're in a mini app context
        const inMiniApp = await sdk.isInMiniApp();
        console.log('Is in Mini App:', inMiniApp);
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Wait a bit for the context to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get the context
          const frameContext = sdk.context;
          console.log('Frame context:', frameContext);
          
          if (frameContext) {
            setContext(frameContext);
            
            // Set user info from context (but not authenticated yet)
            if (frameContext.user && frameContext.user.fid) {
              console.log('User context found:', frameContext.user);
              setUser(frameContext.user);
            } else {
              console.warn('No user in context or missing FID');
            }
          } else {
            console.warn('No frame context available');
          }

          // Hide splash screen when ready
          try {
            await sdk.actions.ready();
            console.log('SDK ready called successfully');
          } catch (readyError) {
            console.error('Error calling ready:', readyError);
          }
        } else {
          console.log('Not in mini app context');
          // For development/testing outside of Farcaster
          if (process.env.NODE_ENV === 'development') {
            console.log('Development mode - creating mock user');
            const mockUser = {
              fid: 12345,
              username: 'testuser',
              displayName: 'Test User',
              pfpUrl: ''
            };
            setUser(mockUser);
          }
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
        setError(error.message);
        setIsLoaded(true);
      }
    };

    initializeFarcaster();
  }, []);

  // Method 1: Using experimental quickAuth (recommended for simplicity)
  const quickAuth = useCallback(async () => {
    if (!isInMiniApp) {
      throw new Error('Authentication is only available in Farcaster Mini App context');
    }

    try {
      setIsSigningIn(true);
      console.log('Starting quickAuth...');
      
      const { token } = await sdk.experimental.quickAuth();
      console.log('QuickAuth successful, got token');
      
      return { token, method: 'quickAuth' };
    } catch (error) {
      console.error('QuickAuth failed:', error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [isInMiniApp]);

  // Method 2: Traditional SIWF flow
  const signInWithFarcaster = useCallback(async () => {
    if (!isInMiniApp) {
      throw new Error('Sign in is only available in Farcaster Mini App context');
    }

    try {
      setIsSigningIn(true);
      const nonce = generateNonce();
      console.log('Attempting SIWF with nonce:', nonce);
      
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      });
      
      console.log('SIWF result:', result);
      
      // Return the SIWF credential for server verification
      return {
        message: result.message,
        signature: result.signature,
        nonce,
        method: 'siwf'
      };
    } catch (error) {
      console.error('SIWF failed:', error);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [isInMiniApp]);

  // Primary sign in method (using quickAuth for simplicity)
  const signIn = useCallback(async () => {
    try {
      // Try quickAuth first (simpler)
      return await quickAuth();
    } catch (error) {
      console.error('QuickAuth failed, falling back to SIWF:', error);
      // Fallback to traditional SIWF
      return await signInWithFarcaster();
    }
  }, [quickAuth, signInWithFarcaster]);

  const shareQuiz = useCallback(async (quizData) => {
    if (!isInMiniApp) {
      throw new Error('Sharing is only available in Farcaster Mini App context');
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
  }, [isInMiniApp]);

  const shareResult = useCallback(async (resultData) => {
    if (!isInMiniApp) {
      throw new Error('Sharing is only available in Farcaster Mini App context');
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
  }, [isInMiniApp]);

  return {
    isLoaded,
    context,
    user,
    isInMiniApp,
    error,
    isSigningIn,
    signIn,
    quickAuth,
    signInWithFarcaster,
    shareQuiz,
    shareResult,
  };
};

// Helper function to generate a nonce
function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}