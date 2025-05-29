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
 * Generate frame preview data
 */
export const generateFramePreview = (type, data) => {
  if (type === 'quiz') {
    return {
      title: data.title,
      description: data.description || `Test your knowledge with this ${data.difficulty} quiz!`,
      image: `${APP_URL}/api/og/quiz?title=${encodeURIComponent(data.title)}&emoji=${data.emoji || '🎯'}`,
      button: '🧠 Take Quiz',
    };
  }

  if (type === 'result') {
    return {
      title: `${data.username} scored ${data.percentage}% on ${data.quizTitle}`,
      description: 'Can you beat their score?',
      image: `${APP_URL}/api/og/result?score=${data.percentage}&title=${encodeURIComponent(data.quizTitle)}`,
      button: '🏆 Beat My Score',
    };
  }

  return null;
};