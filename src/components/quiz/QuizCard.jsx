import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Trophy, Tag } from 'lucide-react';
import './QuizCard.css';

const QuizCard = ({ quiz, variant = 'default' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/quiz/${quiz.slug}`);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'difficulty-easy';
      case 'medium': return 'difficulty-medium';
      case 'hard': return 'difficulty-hard';
      default: return '';
    }
  };

  if (variant === 'compact') {
    return (
      <div className="quiz-card-compact" onClick={handleClick}>
        <div className="quiz-emoji">{quiz.emoji || '🎯'}</div>
        <div className="quiz-content">
          <h3>{quiz.title}</h3>
          <div className="quiz-meta">
            <span><Clock size={12} /> {formatTime(quiz.time_limit)}</span>
            <span><Users size={12} /> {quiz.total_attempts || 0}</span>
            <span className={getDifficultyColor(quiz.difficulty)}>
              {quiz.difficulty}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-card" onClick={handleClick}>
      <div className="quiz-card-header">
        <div className="quiz-emoji-large">{quiz.emoji || '🎯'}</div>
        {quiz.category && (
          <div className="quiz-category">
            <Tag size={12} />
            {quiz.category.name}
          </div>
        )}
      </div>
      
      <div className="quiz-card-body">
        <h3>{quiz.title}</h3>
        <p>{quiz.description}</p>
        
        <div className="quiz-stats">
          <div className="stat">
            <Clock size={16} />
            <span>{formatTime(quiz.time_limit)}</span>
          </div>
          <div className="stat">
            <Users size={16} />
            <span>{quiz.total_attempts || 0} plays</span>
          </div>
          <div className="stat">
            <Trophy size={16} />
            <span>{quiz.average_score ? `${Math.round(quiz.average_score)}%` : 'New'}</span>
          </div>
        </div>
        
        <div className={`difficulty-badge ${getDifficultyColor(quiz.difficulty)}`}>
          {quiz.difficulty}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;