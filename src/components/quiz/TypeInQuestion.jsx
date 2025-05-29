import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Send } from 'lucide-react';
import './TypeInQuestion.css';

const TypeInQuestion = ({ 
  correctAnswer, 
  userAnswer, 
  onSubmit, 
  showResult, 
  isCorrect 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showResult]);

  useEffect(() => {
    if (showResult && !isCorrect) {
      // Show correct answer after a delay for wrong answers
      const timer = setTimeout(() => {
        setShowCorrectAnswer(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showResult, isCorrect]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !showResult) {
      onSubmit(inputValue.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim() && !showResult) {
      handleSubmit(e);
    }
  };

  const getInputClass = () => {
    if (!showResult) return '';
    return isCorrect ? 'correct' : 'incorrect';
  };

  return (
    <div className="type-in-question">
      <form onSubmit={handleSubmit} className="answer-form">
        <div className={`input-wrapper ${getInputClass()}`}>
          <input
            ref={inputRef}
            type="text"
            value={showResult ? userAnswer : inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here..."
            className="answer-input"
            disabled={showResult}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          
          {showResult && (
            <div className="result-icon">
              {isCorrect ? (
                <Check size={20} className="correct-icon" />
              ) : (
                <X size={20} className="incorrect-icon" />
              )}
            </div>
          )}
        </div>

        {!showResult && (
          <button 
            type="submit" 
            className="submit-button"
            disabled={!inputValue.trim()}
          >
            <Send size={20} />
            Submit
          </button>
        )}
      </form>

      {showResult && isCorrect && (
        <div className="feedback correct-feedback">
          <Check size={16} />
          Correct! Well done!
        </div>
      )}

      {showResult && !isCorrect && (
        <div className="feedback incorrect-feedback">
          <div className="try-again-message">
            <X size={16} />
            {!showCorrectAnswer ? 'Not quite right!' : 'The correct answer is:'}
          </div>
          {showCorrectAnswer && (
            <div className="correct-answer-display">
              {correctAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TypeInQuestion;