import { APP_URL, FRAME_TEMPLATES } from './constants';

/**
 * Generate frame metadata for a quiz
 */
export const generateQuizFrame = (quiz) => {
  const frame = {
    ...FRAME_TEMPLATES.QUIZ_SHARE,
    imageUrl: generateQuizImageUrl(quiz),
    button: {
      ...FRAME_TEMPLATES.QUIZ_SHARE.button,
      action: {
        ...FRAME_TEMPLATES.QUIZ_SHARE.button.action,
        url: `${APP_URL}/quiz/${quiz.slug}?miniApp=true`,
        name: 'FarQuiz',
        splashImageUrl: `${APP_URL}/splash.png`,
      },
    },
  };

  return JSON.stringify(frame);
};

/**
 * Generate frame metadata for quiz results
 */
export const generateResultFrame = (result) => {
  const frame = {
    ...FRAME_TEMPLATES.RESULT_SHARE,
    imageUrl: generateResultImageUrl(result),
    button: {
      ...FRAME_TEMPLATES.RESULT_SHARE.button,
      action: {
        ...FRAME_TEMPLATES.RESULT_SHARE.button.action,
        url: `${APP_URL}/quiz/${result.quizSlug}?miniApp=true`,
        name: 'FarQuiz',
        splashImageUrl: `${APP_URL}/splash.png`,
      },
    },
  };

  return JSON.stringify(frame);
};

/**
 * Generate dynamic OG image URL for quiz
 */
export const generateQuizImageUrl = (quiz) => {
  const params = new URLSearchParams({
    title: quiz.title,
    emoji: quiz.emoji || '🎯',
    category: quiz.category?.name || 'Quiz',
    difficulty: quiz.difficulty,
    time: quiz.time_limit,
    questions: quiz.total_questions || quiz.questions?.length || 0,
  });

  return `${APP_URL}/api/og/quiz?${params.toString()}`;
};

/**
 * Generate dynamic OG image URL for results
 */
export const generateResultImageUrl = (result) => {
  const params = new URLSearchParams({
    title: result.quizTitle,
    score: result.percentage,
    time: result.timeTaken,
    position: result.position || 0,
    username: result.username,
  });

  return `${APP_URL}/api/og/result?${params.toString()}`;
};

/**
 * Inject frame meta tags into document head
 */
export const injectFrameMetaTags = (frameData) => {
  // Remove existing frame meta tag if present
  const existingMeta = document.querySelector('meta[name="fc:frame"]');
  if (existingMeta) {
    existingMeta.remove();
  }

  // Create and inject new meta tag
  const meta = document.createElement('meta');
  meta.name = 'fc:frame';
  meta.content = frameData;
  document.head.appendChild(meta);
};

/**
 * Parse frame action from URL
 */
export const parseFrameAction = (url) => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    if (pathParts[1] === 'quiz' && pathParts[2]) {
      return {
        type: 'quiz',
        slug: pathParts[2],
        action: pathParts[3] || 'preview',
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing frame action:', error);
    return null;
  }
};

/**
 * Validate frame request signature
 * This is a placeholder - implement proper validation in production
 */
export const validateFrameRequest = async (request) => {
  // TODO: Implement proper frame request validation
  // See: https://docs.farcaster.xyz/developers/frames/spec
  
  const { trustedData } = request;
  
  if (!trustedData?.messageBytes) {
    return { valid: false, error: 'Missing trusted data' };
  }
  
  // In production, verify the signature using Farcaster's public key
  // For now, we'll just check basic structure
  try {
    const message = JSON.parse(atob(trustedData.messageBytes));
    
    return {
      valid: true,
      fid: message.fid,
      buttonIndex: message.buttonIndex,
      inputText: message.inputText,
      castId: message.castId,
    };
  } catch (error) {
    return { valid: false, error: 'Invalid message format' };
  }
};

/**
 * Generate share text for quiz
 */
export const generateQuizShareText = (quiz) => {
  const emojis = ['🧠', '💡', '🎯', '🏆', '⚡'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  return `Test your knowledge with "${quiz.title}" on FarQuiz! ${randomEmoji}\n\n${quiz.description || `Can you beat the ${quiz.difficulty} difficulty?`}`;
};

/**
 * Generate share text for results
 */
export const generateResultShareText = (result) => {
  let message = `I scored ${result.percentage}% on "${result.quizTitle}" in ${result.timeFormatted}! `;
  
  if (result.percentage === 100) {
    message += '🎉 Perfect score!';
  } else if (result.percentage >= 90) {
    message += '🌟 So close to perfection!';
  } else if (result.percentage >= 80) {
    message += '💪 Great job!';
  } else if (result.percentage >= 70) {
    message += '👏 Well done!';
  } else if (result.percentage >= 60) {
    message += '😊 Not bad!';
  } else {
    message += '🎯 Room for improvement!';
  }
  
  if (result.position && result.position <= 10) {
    message += `\n\n🏆 Currently ranked #${result.position} on the leaderboard!`;
  }
  
  message += '\n\nCan you beat my score?';
  
  return message;
};