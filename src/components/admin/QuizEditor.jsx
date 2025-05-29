import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Move, Image } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { generateSlug } from '../../utils/helpers';
import QuestionEditor from './QuestionEditor';
import './QuizEditor.css';

const QuizEditor = ({ quiz, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    difficulty: 'medium',
    time_limit: 300,
    emoji: '🎯',
    image_url: '',
    is_published: false,
  });
  
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (quiz) {
      setFormData({
        title: quiz.title || '',
        description: quiz.description || '',
        category_id: quiz.category_id || '',
        difficulty: quiz.difficulty || 'medium',
        time_limit: quiz.time_limit || 300,
        emoji: quiz.emoji || '🎯',
        image_url: quiz.image_url || '',
        is_published: quiz.is_published || false,
      });
      
      loadQuestions(quiz.id);
    }
  }, [quiz]);

  const loadQuestions = async (quizId) => {
    try {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');
      
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleTimeChange = (e) => {
    const minutes = parseInt(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      time_limit: minutes * 60
    }));
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `new_${Date.now()}`,
      question_text: '',
      question_image: '',
      question_type: 'multiple_choice',
      correct_answer: '',
      options: ['', '', '', ''],
      points: 1,
      order_index: questions.length + 1,
      explanation: '',
    };
    
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index, updatedQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Update order indices
    newQuestions.forEach((q, i) => {
      q.order_index = i + 1;
    });
    setQuestions(newQuestions);
  };

  const moveQuestion = (index, direction) => {
    if (
      (direction === -1 && index === 0) ||
      (direction === 1 && index === questions.length - 1)
    ) {
      return;
    }
    
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + direction];
    newQuestions[index + direction] = temp;
    
    // Update order indices
    newQuestions.forEach((q, i) => {
      q.order_index = i + 1;
    });
    
    setQuestions(newQuestions);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    if (formData.time_limit < 30) {
      newErrors.time_limit = 'Time limit must be at least 30 seconds';
    }
    
    if (questions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }
    
    // Validate each question
    questions.forEach((q, index) => {
      if (!q.question_text.trim()) {
        newErrors[`question_${index}_text`] = 'Question text is required';
      }
      
      if (!q.correct_answer.trim()) {
        newErrors[`question_${index}_answer`] = 'Correct answer is required';
      }
      
      if (q.question_type === 'multiple_choice') {
        const validOptions = q.options.filter(o => o.trim());
        if (validOptions.length < 2) {
          newErrors[`question_${index}_options`] = 'At least 2 options are required';
        }
        
        if (!q.options.includes(q.correct_answer)) {
          newErrors[`question_${index}_correct`] = 'Correct answer must be one of the options';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const slug = quiz?.slug || generateSlug(formData.title);
      
      // Prepare quiz data
      const quizData = {
        ...formData,
        slug,
        total_questions: questions.length,
      };
      
      let savedQuiz;
      
      if (quiz) {
        // Update existing quiz
        const { data, error } = await supabase
          .from('quizzes')
          .update(quizData)
          .eq('id', quiz.id)
          .select()
          .single();
        
        if (error) throw error;
        savedQuiz = data;
        
        // Delete existing questions
        await supabase
          .from('questions')
          .delete()
          .eq('quiz_id', quiz.id);
      } else {
        // Create new quiz
        const { data, error } = await supabase
          .from('quizzes')
          .insert(quizData)
          .select()
          .single();
        
        if (error) throw error;
        savedQuiz = data;
      }
      
      // Save questions
      if (questions.length > 0) {
        const questionsToSave = questions.map(q => {
          const { id, ...questionData } = q;
          return {
            ...questionData,
            quiz_id: savedQuiz.id,
            options: q.question_type === 'multiple_choice' ? q.options : null,
          };
        });
        
        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToSave);
        
        if (questionsError) throw questionsError;
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Failed to save quiz. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="quiz-editor">
      {/* Basic Info */}
      <div className="editor-section">
        <h3>Basic Information</h3>
        
        <div className="form-row">
          <div className="form-group flex-1">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter quiz title"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>
          
          <div className="form-group" style={{ width: '100px' }}>
            <label>Emoji</label>
            <input
              type="text"
              name="emoji"
              value={formData.emoji}
              onChange={handleInputChange}
              placeholder="🎯"
              maxLength="2"
              className="emoji-input"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter quiz description"
            rows="3"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className={errors.category_id ? 'error' : ''}
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
            {errors.category_id && <span className="error-message">{errors.category_id}</span>}
          </div>
          
          <div className="form-group">
            <label>Difficulty</label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Time Limit (minutes)</label>
            <input
              type="number"
              value={Math.floor(formData.time_limit / 60)}
              onChange={handleTimeChange}
              min="1"
              max="60"
              className={errors.time_limit ? 'error' : ''}
            />
            {errors.time_limit && <span className="error-message">{errors.time_limit}</span>}
          </div>
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleInputChange}
            />
            Publish immediately
          </label>
        </div>
      </div>
      
      {/* Questions */}
      <div className="editor-section">
        <div className="section-header">
          <h3>Questions</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addQuestion}>
            <Plus size={16} />
            Add Question
          </button>
        </div>
        
        {errors.questions && (
          <div className="error-message">{errors.questions}</div>
        )}
        
        <div className="questions-list">
          {questions.map((question, index) => (
            <div key={question.id || index} className="question-item">
              <div className="question-header">
                <span className="question-number">Question {index + 1}</span>
                <div className="question-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === questions.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn delete"
                    onClick={() => deleteQuestion(index)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <QuestionEditor
                question={question}
                index={index}
                errors={errors}
                onChange={(updated) => updateQuestion(index, updated)}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="editor-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : quiz ? 'Update Quiz' : 'Create Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizEditor;