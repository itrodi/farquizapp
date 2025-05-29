import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, SkipForward, AlertTriangle } from 'lucide-react';
import { useFarcasterContext } from '../context/FarcasterContext';
import { fetchQuizBySlug, submitQuizAttempt } from '../services/api/quizzes';
import { checkAnswer, shuffleArray } from '../utils/helpers';
import QuizTimer from '../components/quiz/QuizTimer';
import QuizProgress from '../components/quiz/QuizProgress';
import QuestionDisplay from '../components/quiz/QuestionDisplay';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './QuizTaking.css';

const QuizTaking = () => {
  const { quizSlug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useFarcasterContext();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Load quiz data
  useEffect(() => {
    loadQuiz();
  }, [quizSlug]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      const quizData = await fetchQuizBySlug(quizSlug);
      
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        throw new Error('Invalid quiz data');
      }

      // Shuffle multiple choice options
      const processedQuestions = quizData.questions.map(q => {
        if (q.question_type === 'multiple_choice' && q.options) {
          return {
            ...q,
            shuffledOptions: shuffleArray(q.options)
          };
        }
        return q;
      });

      setQuiz(quizData);
      setQuestions(processedQuestions);
      setTimeRemaining(quizData.time_limit);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Error loading quiz:', error);
      navigate(`/quiz/${quizSlug}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer submission
  const handleAnswer = useCallback((answer) => {
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = checkAnswer(answer, currentQuestion.correct_answer, currentQuestion.question_type);

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        answer,
        isCorrect,
        questionId: currentQuestion.id
      }
    }));

    // Auto-advance for correct answers or multiple choice
    if (isCorrect || currentQuestion.question_type === 'multiple_choice') {
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          handleQuizComplete();
        }
      }, isCorrect ? 800 : 1500); // Shorter delay for correct answers
    }
  }, [currentQuestionIndex, questions]);

  // Skip question
  const handleSkip = useCallback(() => {
    const currentQuestion = questions[currentQuestionIndex];
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        answer: null,
        isCorrect: false,
        questionId: currentQuestion.id,
        skipped: true
      }
    }));

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleQuizComplete();
    }
  }, [currentQuestionIndex, questions]);

  // Navigate between questions
  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Handle quiz completion
  const handleQuizComplete = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    const endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);

    try {
      // Calculate score
      const correctAnswers = Object.values(answers).filter(a => a.isCorrect).length;
      const totalQuestions = questions.length;
      const maxScore = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      const score = Object.entries(answers).reduce((sum, [questionId, answer]) => {
        if (answer.isCorrect) {
          const question = questions.find(q => q.id === questionId);
          return sum + (question?.points || 1);
        }
        return sum;
      }, 0);

      // Submit attempt
      const attempt = await submitQuizAttempt({
        userId: currentUser.id,
        quizId: quiz.id,
        answers: Object.entries(answers).reduce((acc, [qId, ans]) => ({
          ...acc,
          [qId]: ans.answer
        }), {}),
        score,
        maxScore,
        timeTaken: Math.min(timeTaken, quiz.time_limit)
      });

      // Navigate to results
      navigate(`/quiz/${quizSlug}/results/${attempt.id}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setIsSubmitting(false);
    }
  }, [answers, questions, quiz, currentUser, startTime, isSubmitting, navigate, quizSlug]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    handleQuizComplete();
  }, [handleQuizComplete]);

  // Handle end quiz confirmation
  const handleEndQuiz = () => {
    setShowEndConfirm(true);
  };

  const confirmEndQuiz = () => {
    setShowEndConfirm(false);
    handleQuizComplete();
  };

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading quiz..." />;
  }

  if (!quiz || !currentUser) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="quiz-taking-page">
      {/* Header */}
      <div className="quiz-header">
        <QuizProgress 
          current={currentQuestionIndex + 1}
          total={questions.length}
        />
        
        <QuizTimer 
          timeRemaining={timeRemaining}
          onTimeUp={handleTimeUp}
          onTimeChange={setTimeRemaining}
        />
        
        <button 
          className="end-quiz-btn"
          onClick={handleEndQuiz}
          disabled={isSubmitting}
        >
          <X size={20} />
        </button>
      </div>

      {/* Quiz Info */}
      <div className="quiz-info">
        <h2>{quiz.title}</h2>
        <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
      </div>

      {/* Question Display */}
      <div className="question-container">
        <QuestionDisplay
          question={currentQuestion}
          userAnswer={answers[currentQuestion.id]?.answer}
          onAnswer={handleAnswer}
          showResult={answers[currentQuestion.id] !== undefined}
          isCorrect={answers[currentQuestion.id]?.isCorrect}
        />
      </div>

      {/* Actions */}
      <div className="quiz-actions">
        <button 
          className="btn btn-secondary"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0 || isSubmitting}
        >
          Back
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={handleSkip}
          disabled={isSubmitting || answers[currentQuestion.id] !== undefined}
        >
          <SkipForward size={20} />
          Skip
        </button>
        
        {isLastQuestion && !answers[currentQuestion.id] && (
          <button 
            className="btn btn-primary"
            onClick={handleQuizComplete}
            disabled={isSubmitting}
          >
            Finish Quiz
          </button>
        )}
      </div>

      {/* End Quiz Confirmation Modal */}
      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={48} className="warning-icon" />
            <h3>End Quiz?</h3>
            <p>
              You've answered {Object.keys(answers).length} out of {questions.length} questions. 
              Are you sure you want to end the quiz now?
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEndConfirm(false)}
              >
                Continue Quiz
              </button>
              <button 
                className="btn btn-error"
                onClick={confirmEndQuiz}
              >
                End Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="submitting-overlay">
          <LoadingSpinner text="Submitting your answers..." />
        </div>
      )}
    </div>
  );
};

export default QuizTaking;