import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';

export const useFarcaster = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [context, setContext] = useState(null);
  const [user, setUser] = useState(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        // Check if we're in a mini app context
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Get the context
          const frameContext = sdk.context;
          setContext(frameContext);
          
          if (frameContext?.user) {
            setUser(frameContext.user);
          }

          // Hide splash screen when ready
          await sdk.actions.ready();
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
        setIsLoaded(true);
      }
    };

    initializeFarcaster();
  }, []);

  const signIn = useCallback(async () => {
    try {
      const nonce = generateNonce();
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true,
      });
      
      // Here you would verify the signature on your backend
      // For now, we'll just return the result
      return result;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }, []);

  const shareQuiz = useCallback(async (quizData) => {
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
  }, []);

  const shareResult = useCallback(async (resultData) => {
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
  }, []);

  return {
    isLoaded,
    context,
    user,
    isInMiniApp,
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