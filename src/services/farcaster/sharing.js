import { generateQuizShareText, generateResultShareText } from '../../utils/frameUtils';
import { APP_URL } from '../../utils/constants';

/**
 * Share a quiz as a Farcaster frame
 */
export const shareQuizAsFrame = async (sdk, quizData) => {
  try {
    const shareText = generateQuizShareText(quizData);
    const embedUrl = `${APP_URL}/quiz/${quizData.slug}`;

    const result = await sdk.actions.composeCast({
      text: shareText,
      embeds: [embedUrl],
    });

    return {
      success: true,
      cast: result?.cast,
    };
  } catch (error) {
    console.error('Error sharing quiz:', error);
    
    if (error.message?.includes('rejected')) {
      return {
        success: false,
        error: 'User cancelled sharing',
      };
    }
    
    return {
      success: false,
      error: 'Failed to share quiz',
    };
  }
};

/**
 * Share quiz results as a Farcaster frame
 */
export const shareResultAsFrame = async (sdk, resultData) => {
  try {
    const shareText = generateResultShareText(resultData);
    const embedUrl = `${APP_URL}/quiz/${resultData.quizSlug}`;

    const result = await sdk.actions.composeCast({
      text: shareText,
      embeds: [embedUrl],
    });

    return {
      success: true,
      cast: result?.cast,
    };
  } catch (error) {
    console.error('Error sharing result:', error);
    
    if (error.message?.includes('rejected')) {
      return {
        success: false,
        error: 'User cancelled sharing',
      };
    }
    
    return {
      success: false,
      error: 'Failed to share result',
    };
  }
};

/**
 * Generate frame metadata for a quiz
 */
export const generateQuizFrameData = (quiz) => {
  return {
    version: "next",
    imageUrl: `${APP_URL}/api/og/quiz?title=${encodeURIComponent(quiz.title)}&emoji=${encodeURIComponent(quiz.emoji || '🎯')}&category=${encodeURIComponent(quiz.category?.name || 'Quiz')}&difficulty=${quiz.difficulty}&questions=${quiz.total_questions || quiz.questions?.length || 0}`,
    button: {
      title: "🧠 Take Quiz",
      action: {
        type: "launch_frame",
        url: `${APP_URL}/quiz/${quiz.slug}`,
        name: "FarQuiz",
        splashImageUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/RBv8coHVCER8/farquiz_splash-h61l64V89HzQsrn3v0Ey1RJGCVtPvq.png",
        splashBackgroundColor: "#8B5CF6"
      }
    }
  };
};

/**
 * Generate frame metadata for quiz results
 */
export const generateResultFrameData = (result) => {
  return {
    version: "next",
    imageUrl: `${APP_URL}/api/og/result?score=${result.percentage}&title=${encodeURIComponent(result.quizTitle)}&time=${result.timeTaken || 0}&username=${encodeURIComponent(result.username || 'Player')}`,
    button: {
      title: "🏆 Beat My Score",
      action: {
        type: "launch_frame",
        url: `${APP_URL}/quiz/${result.quizSlug}`,
        name: "FarQuiz",
        splashImageUrl: "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/RBv8coHVCER8/farquiz_splash-h61l64V89HzQsrn3v0Ey1RJGCVtPvq.png",
        splashBackgroundColor: "#8B5CF6"
      }
    }
  };
};