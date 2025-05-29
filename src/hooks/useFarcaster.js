import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';

export const useFarcaster = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        console.log('Initializing Farcaster SDK...');
        
        // Check if we're in a mini app context
        const inMiniApp = await sdk.isInMiniApp();
        console.log('Is in Mini App:', inMiniApp);
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          try {
            // According to the docs, context is accessed directly as a property
            const contextData = sdk.context;
            console.log('Raw context data:', contextData);
            
            if (contextData) {
              // Create a plain object to avoid Proxy issues
              const plainContext = {
                user: null,
                client: null,
                location: null
              };

              // Safely extract user data
              if (contextData.user) {
                plainContext.user = {
                  fid: contextData.user.fid,
                  username: contextData.user.username,
                  displayName: contextData.user.displayName,
                  pfpUrl: contextData.user.pfpUrl
                };
                console.log('Extracted user data:', plainContext.user);
              }

              // Safely extract client data
              if (contextData.client) {
                plainContext.client = {
                  clientFid: contextData.client.clientFid,
                  added: contextData.client.added,
                  safeAreaInsets: contextData.client.safeAreaInsets,
                  notificationDetails: contextData.client.notificationDetails
                };
              }

              // Safely extract location data
              if (contextData.location) {
                plainContext.location = contextData.location;
              }

              setContext(plainContext);
              
              if (plainContext.user && plainContext.user.fid) {
                setUser(plainContext.user);
                console.log('User set successfully:', plainContext.user);
              } else {
                console.warn('No valid user data found in context');
                setError('Unable to get user information from Farcaster');
              }
            }
          } catch (contextError) {
            console.error('Error accessing context:', contextError);
            setError('Failed to access Farcaster context');
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

  const signIn = useCallback(async () => {
    if (!isInMiniApp) {
      throw new Error('Sign in is only available in Farcaster Mini App context');
    }

    try {
      const nonce = generateNonce();
      console.log('Attempting sign in with nonce:', nonce);
      
      const result = await sdk.actions.signIn({
        nonce,
      });
      
      console.log('Sign in result:', result);
      
      // After successful sign in, we need to re-check the context
      const contextData = sdk.context;
      if (contextData && contextData.user) {
        const userData = {
          fid: contextData.user.fid,
          username: contextData.user.username,
          displayName: contextData.user.displayName,
          pfpUrl: contextData.user.pfpUrl
        };
        setUser(userData);
        console.log('User updated after sign in:', userData);
      }
      
      return result;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, [isInMiniApp]);

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
    signIn,
    shareQuiz,
    shareResult,
  };
};

// Helper function to generate a nonce
function generateNonce() {
  const length = 32;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    result += charset[randomIndex];
  }
  return result;
}