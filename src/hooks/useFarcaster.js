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
          // Wait a bit for the context to be available
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Get the context
          const frameContext = sdk.context;
          console.log('Frame context:', frameContext);
          
          if (frameContext) {
            setContext(frameContext);
            
            if (frameContext.user && frameContext.user.fid) {
              console.log('User found:', frameContext.user);
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
          // You can mock user data here if needed
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
        acceptAuthAddress: true,
      });
      
      console.log('Sign in result:', result);
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
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}