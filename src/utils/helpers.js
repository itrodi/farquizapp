// Format time from seconds to human-readable format
export const formatTime = (seconds) => {
    if (seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format time for display (e.g., "2m 30s")
  export const formatTimeDisplay = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (secs === 0) return `${minutes}m`;
    return `${minutes}m ${secs}s`;
  };
  
  // Generate a slug from a string
  export const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  };
  
  // Calculate percentage score
  export const calculatePercentage = (score, maxScore) => {
    if (maxScore === 0) return 0;
    return Math.round((score / maxScore) * 100);
  };
  
  // Get result color based on percentage
  export const getResultColor = (percentage) => {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 70) return '#3b82f6';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };
  
  // Get result message based on percentage
  export const getResultMessage = (percentage) => {
    if (percentage === 100) return 'Perfect! 🎉';
    if (percentage >= 90) return 'Excellent! 🌟';
    if (percentage >= 80) return 'Great job! 👏';
    if (percentage >= 70) return 'Good work! 👍';
    if (percentage >= 60) return 'Not bad! 😊';
    if (percentage >= 50) return 'Keep practicing! 💪';
    return 'Better luck next time! 🤔';
  };
  
  // Shuffle array (Fisher-Yates algorithm)
  export const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Debounce function
  export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  // Format number with commas
  export const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // Get ordinal suffix (1st, 2nd, 3rd, etc.)
  export const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
  };
  
  // Truncate text with ellipsis
  export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };
  
  // Check if answer is correct (case-insensitive, trim whitespace)
  export const checkAnswer = (userAnswer, correctAnswer, questionType) => {
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    if (questionType === 'type_in') {
      // For type-in questions, we might want to be more lenient
      // Remove common punctuation and extra spaces
      const cleanUser = normalizedUser.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').replace(/\s+/g, ' ');
      const cleanCorrect = normalizedCorrect.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').replace(/\s+/g, ' ');
      
      return cleanUser === cleanCorrect;
    }
    
    return normalizedUser === normalizedCorrect;
  };
  
  // Generate a random ID
  export const generateId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };
  
  // Get time ago string
  export const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'just now';
  };
  
  // Validate quiz import data
  export const validateQuizImport = (data) => {
    const errors = [];
    
    if (!data.title || data.title.trim() === '') {
      errors.push('Quiz title is required');
    }
    
    if (!data.category) {
      errors.push('Category is required');
    }
    
    if (!data.difficulty || !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('Valid difficulty level is required (easy, medium, hard)');
    }
    
    if (!data.time_limit || data.time_limit < 30) {
      errors.push('Time limit must be at least 30 seconds');
    }
    
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      errors.push('At least one question is required');
    } else {
      data.questions.forEach((question, index) => {
        if (!question.text || question.text.trim() === '') {
          errors.push(`Question ${index + 1}: Question text is required`);
        }
        
        if (!question.type || !['multiple_choice', 'type_in'].includes(question.type)) {
          errors.push(`Question ${index + 1}: Valid question type is required`);
        }
        
        if (!question.correct || question.correct.trim() === '') {
          errors.push(`Question ${index + 1}: Correct answer is required`);
        }
        
        if (question.type === 'multiple_choice') {
          if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            errors.push(`Question ${index + 1}: At least 2 options are required for multiple choice`);
          } else if (!question.options.includes(question.correct)) {
            errors.push(`Question ${index + 1}: Correct answer must be one of the options`);
          }
        }
      });
    }
    
    return errors;
  };