import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, Target, Share2, RotateCcw, Home, Check, X } from 'lucide-react';
import { useFarcasterContext } from '../context/FarcasterContext';
import { supabase } from '../services/supabase';
import { formatTimeDisplay, getResultColor, getResultMessage, getOrdinalSuffix } from '../utils/helpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './QuizResults.css';

const QuizResults = () => {
  const { quizSlug, attemptId } = useParams();
  const navigate = useNavigate();
  const { currentUser, shareResult } = useFarcasterContext();
  
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [leaderboardPosition, setLeaderboardPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      setIsLoading(true);

      // Fetch attempt details
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quiz:quizzes(
            *,
            category:categories(name, emoji)
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Verify the attempt belongs to the current user
      if (attemptData.user_id !== currentUser?.id) {
        navigate(`/quiz/${quizSlug}`);
        return;
      }

      setAttempt(attemptData);
      setQuiz(attemptData.quiz);

      // Fetch questions to show correct answers
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', attemptData.quiz_id)
        .order('order_index');

      setQuestions(questionsData || []);

      // Get user's position in leaderboard
      const { data: leaderboardData } = await supabase
        .from('quiz_leaderboards')
        .select('rank')
        .eq('quiz_id', attemptData.quiz_id)
        .eq('user_id', currentUser.id)
        .single();

      if (leaderboardData) {
        setLeaderboardPosition(leaderboardData.rank);
      }

    } catch (error) {
      console.error('Error loading results:', error);
      navigate(`/quiz/${quizSlug}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareResult = async () => {
    if (!quiz || !attempt || isSharing) return;

    setIsSharing(true);
    try {
      await shareResult({
        quizTitle: quiz.title,
        quizSlug: quiz.slug,
        percentage: attempt.percentage,
        timeFormatted: formatTimeDisplay(attempt.time_taken),
        position: leaderboardPosition
      });
    } catch (error) {
      console.error('Error sharing result:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handlePlayAgain = () => {
    navigate(`/quiz/${quizSlug}/play`);
  };

  const handleViewLeaderboard = () => {
    navigate(`/quiz/${quizSlug}/leaderboard`);
  };

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading your results..." />;
  }

  if (!attempt || !quiz) {
    return null;
  }

  const resultColor = getResultColor(attempt.percentage);
  const resultMessage = getResultMessage(attempt.percentage);

  return (
    <div className="quiz-results-page">
      {/* Results Header */}
      <div className="results-header" style={{ borderColor: resultColor }}>
        <div className="score-circle" style={{ borderColor: resultColor }}>
          <span className="score-percentage" style={{ color: resultColor }}>
            {Math.round(attempt.percentage)}%
          </span>
          <span className="score-label">Score</span>
        </div>

        <h1 className="result-message">{resultMessage}</h1>
        
        <div className="quiz-title">
          <span className="quiz-emoji">{quiz.emoji || '🎯'}</span>
          <h2>{quiz.title}</h2>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <Target size={24} className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{attempt.score}/{attempt.max_score}</span>
            <span className="stat-label">Correct Answers</span>
          </div>
        </div>

        <div className="stat-card">
          <Clock size={24} className="stat-icon" />
          <div className="stat-content">
            <span className="stat-value">{formatTimeDisplay(attempt.time_taken)}</span>
            <span className="stat-label">Time Taken</span>
          </div>
        </div>

        {leaderboardPosition && (
          <div className="stat-card">
            <Trophy size={24} className="stat-icon" />
            <div className="stat-content">
              <span className="stat-value">{getOrdinalSuffix(leaderboardPosition)}</span>
              <span className="stat-label">Leaderboard Position</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="btn btn-primary"
          onClick={handleShareResult}
          disabled={isSharing}
        >
          <Share2 size={20} />
          Share Result
        </button>

        <button 
          className="btn btn-secondary"
          onClick={handlePlayAgain}
        >
          <RotateCcw size={20} />
          Play Again
        </button>

        <button 
          className="btn btn-secondary"
          onClick={handleViewLeaderboard}
        >
          <Trophy size={20} />
          Leaderboard
        </button>
      </div>

      {/* Review Answers */}
      <div className="review-section">
        <button 
          className="toggle-answers"
          onClick={() => setShowAnswers(!showAnswers)}
        >
          {showAnswers ? 'Hide' : 'Show'} Correct Answers
        </button>

        {showAnswers && (
          <div className="answers-list">
            {questions.map((question, index) => {
              const userAnswer = attempt.answers[question.id];
              const isCorrect = userAnswer === question.correct_answer;
              
              return (
                <div key={question.id} className="answer-review">
                  <div className="question-header">
                    <span className="question-number">Q{index + 1}</span>
                    {isCorrect ? (
                      <Check size={20} className="correct-icon" />
                    ) : (
                      <X size={20} className="incorrect-icon" />
                    )}
                  </div>
                  
                  <p className="question-text">{question.question_text}</p>
                  
                  {!isCorrect && (
                    <div className="answer-details">
                      <div className="your-answer">
                        <span className="answer-label">Your answer:</span>
                        <span className="answer-value">{userAnswer || 'Skipped'}</span>
                      </div>
                      <div className="correct-answer">
                        <span className="answer-label">Correct answer:</span>
                        <span className="answer-value correct">{question.correct_answer}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="bottom-actions">
        <button 
          className="btn btn-secondary btn-full"
          onClick={() => navigate('/explore')}
        >
          <Home size={20} />
          Explore More Quizzes
        </button>
      </div>
    </div>
  );
};

export default QuizResults;