import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { generateSlug } from '../../utils/helpers';
import { validateQuizImport } from '../../utils/helpers';
import './ImportQuiz.css';

const ImportQuiz = ({ categories, onSuccess, onCancel }) => {
  const [jsonContent, setJsonContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [file, setFile] = useState(null);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== 'application/json') {
      setValidationResult({
        valid: false,
        errors: ['Please upload a JSON file']
      });
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setJsonContent(content);
        validateJson(content);
      } catch (error) {
        setValidationResult({
          valid: false,
          errors: ['Invalid JSON format']
        });
      }
    };
    
    reader.readAsText(uploadedFile);
  };

  const handleTextChange = (e) => {
    const content = e.target.value;
    setJsonContent(content);
    
    if (content.trim()) {
      validateJson(content);
    } else {
      setValidationResult(null);
    }
  };

  const validateJson = (content) => {
    setIsValidating(true);
    
    try {
      const data = JSON.parse(content);
      const errors = validateQuizImport(data);
      
      if (errors.length === 0) {
        setValidationResult({
          valid: true,
          data,
          preview: {
            title: data.title,
            description: data.description,
            category: data.category,
            difficulty: data.difficulty,
            questionCount: data.questions.length,
            timeLimit: data.time_limit
          }
        });
      } else {
        setValidationResult({
          valid: false,
          errors
        });
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: ['Invalid JSON format: ' + error.message]
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult?.valid || !validationResult?.data) return;
    
    setIsImporting(true);
    
    try {
      const quizData = validationResult.data;
      
      // Find category by name or slug
      const category = categories.find(
        c => c.name.toLowerCase() === quizData.category.toLowerCase() ||
             c.slug === quizData.category.toLowerCase()
      );
      
      if (!category) {
        throw new Error(`Category "${quizData.category}" not found`);
      }
      
      // Create quiz
      const { data: newQuiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizData.title,
          slug: generateSlug(quizData.title),
          description: quizData.description || '',
          category_id: category.id,
          difficulty: quizData.difficulty,
          time_limit: quizData.time_limit,
          emoji: quizData.emoji || '🎯',
          image_url: quizData.image_url || '',
          total_questions: quizData.questions.length,
          is_published: false, // Start as draft
        })
        .select()
        .single();
      
      if (quizError) throw quizError;
      
      // Create questions
      const questions = quizData.questions.map((q, index) => ({
        quiz_id: newQuiz.id,
        question_text: q.text || q.question_text,
        question_image: q.image || q.question_image || null,
        question_type: q.type || q.question_type,
        correct_answer: q.correct || q.correct_answer,
        options: q.options || null,
        points: q.points || 1,
        order_index: index + 1,
        explanation: q.explanation || null,
      }));
      
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questions);
      
      if (questionsError) throw questionsError;
      
      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import quiz: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="import-quiz">
      <div className="import-options">
        <div className="import-option">
          <label htmlFor="file-upload" className="file-upload-label">
            <Upload size={24} />
            <span>Upload JSON File</span>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              hidden
            />
          </label>
        </div>
        
        <div className="divider">OR</div>
        
        <div className="import-option">
          <FileText size={24} />
          <span>Paste JSON Below</span>
        </div>
      </div>

      <div className="json-input">
        <textarea
          value={jsonContent}
          onChange={handleTextChange}
          placeholder='Paste your quiz JSON here...

Example format:
{
  "title": "Quiz Title",
  "description": "Quiz description",
  "category": "geography",
  "difficulty": "medium",
  "time_limit": 300,
  "questions": [
    {
      "text": "Question text",
      "type": "multiple_choice",
      "correct": "Answer",
      "options": ["Answer", "Option 2", "Option 3", "Option 4"]
    }
  ]
}'
          rows="12"
        />
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
          {validationResult.valid ? (
            <>
              <div className="validation-header">
                <Check size={20} />
                <span>Valid quiz format</span>
              </div>
              <div className="quiz-preview">
                <h4>{validationResult.preview.title}</h4>
                <p>{validationResult.preview.description}</p>
                <div className="preview-meta">
                  <span>Category: {validationResult.preview.category}</span>
                  <span>Difficulty: {validationResult.preview.difficulty}</span>
                  <span>Questions: {validationResult.preview.questionCount}</span>
                  <span>Time: {Math.floor(validationResult.preview.timeLimit / 60)}m</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="validation-header">
                <AlertCircle size={20} />
                <span>Validation errors</span>
              </div>
              <ul className="error-list">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="import-actions">
        <button
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isImporting}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={!validationResult?.valid || isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Quiz'}
        </button>
      </div>

      {/* Sample Format Link */}
      <div className="sample-format">
        <a 
          href="/sample-quiz.json" 
          download="sample-quiz.json"
          className="sample-link"
        >
          Download sample quiz format
        </a>
      </div>
    </div>
  );
};

export default ImportQuiz;