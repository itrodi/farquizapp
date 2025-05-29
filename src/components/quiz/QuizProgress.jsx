import React from 'react';
import './QuizProgress.css';

const QuizProgress = ({ current, total }) => {
  const percentage = (current / total) * 100;

  return (
    <div className="quiz-progress">
      <div className="progress-text">
        <span className="current">{current}</span>
        <span className="separator">/</span>
        <span className="total">{total}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default QuizProgress;