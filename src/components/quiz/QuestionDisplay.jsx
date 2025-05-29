import React from 'react';
import MultipleChoice from './MultipleChoice';
import TypeInQuestion from './TypeInQuestion';
import './QuestionDisplay.css';

const QuestionDisplay = ({ 
  question, 
  userAnswer, 
  onAnswer, 
  showResult, 
  isCorrect 
}) => {
  return (
    <div className="question-display">
      <div className="question-content">
        <h3 className="question-text">{question.question_text}</h3>
        
        {question.question_image && (
          <div className="question-image-container">
            <img 
              src={question.question_image} 
              alt="Question visual" 
              className="question-image"
            />
          </div>
        )}
      </div>

      <div className="answer-section">
        {question.question_type === 'multiple_choice' ? (
          <MultipleChoice
            options={question.shuffledOptions || question.options}
            correctAnswer={question.correct_answer}
            userAnswer={userAnswer}
            onSelect={onAnswer}
            showResult={showResult}
            isCorrect={isCorrect}
          />
        ) : (
          <TypeInQuestion
            correctAnswer={question.correct_answer}
            userAnswer={userAnswer}
            onSubmit={onAnswer}
            showResult={showResult}
            isCorrect={isCorrect}
          />
        )}
      </div>

      {showResult && question.explanation && (
        <div className="explanation">
          <p className="explanation-label">Explanation:</p>
          <p className="explanation-text">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;