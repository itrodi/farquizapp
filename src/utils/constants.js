// App Configuration
export const APP_NAME = 'FarQuiz';
export const APP_DESCRIPTION = 'The Ultimate Quiz Experience on Farcaster';
export const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';

// Quiz Configuration
export const QUIZ_TIME_WARNING = 30; // Show warning when 30 seconds remain
export const MIN_QUESTIONS_PER_QUIZ = 1;
export const MAX_QUESTIONS_PER_QUIZ = 50;
export const MAX_QUIZ_TIME = 3600; // 1 hour in seconds
export const LEADERBOARD_PAGE_SIZE = 50;
export const MINI_LEADERBOARD_SIZE = 5;

// Difficulty Levels
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Question Types
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TYPE_IN: 'type_in',
};

// Categories (fallback if DB is empty)
export const DEFAULT_CATEGORIES = [
  { name: 'Geography', slug: 'geography', emoji: '🌍' },
  { name: 'Sports', slug: 'sports', emoji: '⚽' },
  { name: 'Entertainment', slug: 'entertainment', emoji: '🎬' },
  { name: 'Science', slug: 'science', emoji: '🔬' },
  { name: 'History', slug: 'history', emoji: '📚' },
  { name: 'Food & Drink', slug: 'food-drink', emoji: '🍕' },
  { name: 'Technology', slug: 'technology', emoji: '💻' },
  { name: 'Art & Literature', slug: 'art-literature', emoji: '🎨' },
  { name: 'Music', slug: 'music', emoji: '🎵' },
  { name: 'Web3', slug: 'web3', emoji: '₿' },
];

// Sort Options
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  POPULAR: 'popular',
  DIFFICULTY_ASC: 'difficulty_asc',
  DIFFICULTY_DESC: 'difficulty_desc',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ADMIN_SESSION: 'adminSession',
  QUIZ_PROGRESS: 'quizProgress',
  USER_PREFERENCES: 'userPreferences',
};

// API Routes
export const API_ROUTES = {
  WEBHOOK: '/api/webhook',
  FRAME: '/api/frame',
};

// Colors for Quiz Results
export const RESULT_COLORS = {
  EXCELLENT: '#10b981', // 90-100%
  GOOD: '#3b82f6',      // 70-89%
  AVERAGE: '#f59e0b',   // 50-69%
  POOR: '#ef4444',      // Below 50%
};

// Animation Durations
export const ANIMATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

// Quiz Import Schema
export const QUIZ_IMPORT_SCHEMA = {
  title: { type: 'string', required: true, maxLength: 255 },
  description: { type: 'string', required: false },
  category: { type: 'string', required: true },
  difficulty: { type: 'string', required: true, enum: Object.values(DIFFICULTY_LEVELS) },
  time_limit: { type: 'number', required: true, min: 30, max: MAX_QUIZ_TIME },
  emoji: { type: 'string', required: false, maxLength: 10 },
  image_url: { type: 'string', required: false },
  questions: {
    type: 'array',
    required: true,
    minItems: MIN_QUESTIONS_PER_QUIZ,
    maxItems: MAX_QUESTIONS_PER_QUIZ,
    items: {
      text: { type: 'string', required: true },
      image: { type: 'string', required: false },
      type: { type: 'string', required: true, enum: Object.values(QUESTION_TYPES) },
      correct: { type: 'string', required: true },
      options: { type: 'array', required: false, minItems: 2, maxItems: 6 },
      points: { type: 'number', required: false, default: 1 },
      explanation: { type: 'string', required: false },
    },
  },
};

// Frame Templates
export const FRAME_TEMPLATES = {
  QUIZ_SHARE: {
    version: 'next',
    button: {
      title: '🧠 Take Quiz',
      action: {
        type: 'launch_frame',
        splashBackgroundColor: '#7c3aed',
      },
    },
  },
  RESULT_SHARE: {
    version: 'next',
    button: {
      title: '🏆 Beat My Score',
      action: {
        type: 'launch_frame',
        splashBackgroundColor: '#7c3aed',
      },
    },
  },
};