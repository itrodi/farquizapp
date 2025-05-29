import React from 'react';
import { Check, X } from 'lucide-react';
import './MultipleChoice.css';

const MultipleChoice = ({ 
  options, 
  correctAnswer, 
  userAnswer, 
  onSelect, 
  showResult, 
  isCorrect 
}) => {
  const handleOptionClick = (option) => {
    if (!showResult) {
      onSelect(option);
    }
  };

  const getOptionClass = (option) => {
    if (!showResult) {
      return userAnswer === option ? 'selected' : '';
    }

    if (option === correctAnswer) {
      return 'correct';
    }

    if (option === userAnswer && !isCorrect) {
      return 'incorrect';
    }

    return 'disabled';
  };

  const getOptionIcon = (option) => {
    if (!showResult) return null;

    if (option === correctAnswer) {
      return <Check size={20} className="option-icon correct-icon" />;
    }

    if (option === userAnswer && !isCorrect) {
      return <X size={20} className="option-icon incorrect-icon" />;
    }

    return null;
  };

  return (
    <div className="multiple-choice">
      {options.map((option, index) => (
        <button
          key={index}
          className={`option-button ${getOptionClass(option)}`}
          onClick={() => handleOptionClick(option)}
          disabled={showResult}
        >
          <span className="option-letter">
            {String.fromCharCode(65 + index)}
          </span>
          <span className="option-text">{option}</span>
          {getOptionIcon(option)}
        </button>
      ))}
    </div>
  );
};

export default MultipleChoice;