import React from 'react';
import { Image, X } from 'lucide-react';
import './QuestionEditor.css';

const QuestionEditor = ({ question, index, errors, onChange }) => {
  const handleChange = (field, value) => {
    onChange({
      ...question,
      [field]: value
    });
  };

  const handleOptionChange = (optionIndex, value) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    handleChange('options', newOptions);
  };

  const addOption = () => {
    if (question.options.length < 6) {
      handleChange('options', [...question.options, '']);
    }
  };

  const removeOption = (optionIndex) => {
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      handleChange('options', newOptions);
      
      // If the removed option was the correct answer, clear it
      if (question.correct_answer === question.options[optionIndex]) {
        handleChange('correct_answer', '');
      }
    }
  };

  return (
    <div className="question-editor">
      {/* Question Type */}
      <div className="form-row">
        <div className="form-group">
          <label>Question Type</label>
          <select
            value={question.question_type}
            onChange={(e) => handleChange('question_type', e.target.value)}
          >
            <option value="multiple_choice">Multiple Choice</option>
            <option value="type_in">Type In Answer</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Points</label>
          <input
            type="number"
            value={question.points}
            onChange={(e) => handleChange('points', parseInt(e.target.value) || 1)}
            min="1"
            max="10"
          />
        </div>
      </div>

      {/* Question Text */}
      <div className="form-group">
        <label>Question Text *</label>
        <textarea
          value={question.question_text}
          onChange={(e) => handleChange('question_text', e.target.value)}
          placeholder="Enter your question here..."
          rows="2"
          className={errors[`question_${index}_text`] ? 'error' : ''}
        />
        {errors[`question_${index}_text`] && (
          <span className="error-message">{errors[`question_${index}_text`]}</span>
        )}
      </div>

      {/* Question Image (Optional) */}
      <div className="form-group">
        <label>
          <Image size={16} className="inline-icon" />
          Question Image URL (Optional)
        </label>
        <input
          type="url"
          value={question.question_image || ''}
          onChange={(e) => handleChange('question_image', e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {/* Answer Options or Correct Answer */}
      {question.question_type === 'multiple_choice' ? (
        <>
          <div className="form-group">
            <label>Answer Options *</label>
            <div className="options-list">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="option-row">
                  <input
                    type="radio"
                    name={`correct_${index}`}
                    checked={question.correct_answer === option}
                    onChange={() => handleChange('correct_answer', option)}
                    disabled={!option.trim()}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                    className="option-input"
                  />
                  {question.options.length > 2 && (
                    <button
                      type="button"
                      className="remove-option"
                      onClick={() => removeOption(optionIndex)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {question.options.length < 6 && (
              <button
                type="button"
                className="add-option-btn"
                onClick={addOption}
              >
                + Add Option
              </button>
            )}
            
            {errors[`question_${index}_options`] && (
              <span className="error-message">{errors[`question_${index}_options`]}</span>
            )}
            
            {errors[`question_${index}_correct`] && (
              <span className="error-message">{errors[`question_${index}_correct`]}</span>
            )}
          </div>
        </>
      ) : (
        <div className="form-group">
          <label>Correct Answer *</label>
          <input
            type="text"
            value={question.correct_answer}
            onChange={(e) => handleChange('correct_answer', e.target.value)}
            placeholder="Enter the correct answer"
            className={errors[`question_${index}_answer`] ? 'error' : ''}
          />
          {errors[`question_${index}_answer`] && (
            <span className="error-message">{errors[`question_${index}_answer`]}</span>
          )}
          <p className="help-text">
            For type-in questions, answers are case-insensitive and extra spaces are ignored.
          </p>
        </div>
      )}

      {/* Explanation (Optional) */}
      <div className="form-group">
        <label>Explanation (Optional)</label>
        <textarea
          value={question.explanation || ''}
          onChange={(e) => handleChange('explanation', e.target.value)}
          placeholder="Explain why this is the correct answer..."
          rows="2"
        />
      </div>
    </div>
  );
};

export default QuestionEditor;