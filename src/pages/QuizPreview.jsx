import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Users, Trophy, Tag, Share2, Play, ChevronRight, Star } from 'lucide-react';
import { useFarcasterContext } from '../context/FarcasterContext';
import { fetchQuizBySlug, fetchUserQuizAttempts, fetchQuizLeaderboard } from '../services/api/quizzes';
import { formatTimeDisplay, getOrdinalSuffix } from '../utils/helpers';
import MiniLeaderboard from '../components/leaderboard/MiniLeaderboard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import FrameMeta from '../components/FrameMeta';
import './QuizPreview.css';

const QuizPreview = () => {
  const { quizSlug } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, shareQuiz, isInMiniApp } = useFarcasterContext();
  
  const [quiz, setQuiz] = useState(null);
  const [userAttempts, setUserAttempts] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    loadQuizData();
  }, [quizSlug, currentUser]);

  const loadQuizData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch quiz details
      const quizData = await fetchQuizBySlug(quizSlug);
      setQuiz(quizData);

      // Fetch user's previous attempts if logged in
      if (currentUser) {
        const attempts = await fetchUserQuizAttempts(quizData.id, currentUser.id);
        setUserAttempts(attempts);
      }

      // Fetch leaderboard
      const leaderboardData = await fetchQuizLeaderboard(
        quizData.id, 
        5, 
        currentUser?.fid
      );
      setLeaderboard(leaderboardData);

    } catch (error) {
      console.error('Error loading quiz:', error);
      // Handle error - maybe redirect to 404
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (!isAuthenticated) {
      // Show sign in prompt
      return;
    }
    navigate(`/quiz/${quizSlug}/play`);
  };

  const handleShareQuiz = async () => {
    if (!quiz || isSharing) return;
    
    setIsSharing(true);
    try {
      await shareQuiz({
        title: quiz.title,
        slug: quiz.slug,
        description: quiz.description,
        emoji: quiz.emoji,
        difficulty: quiz.difficulty,
        category: quiz.category
      });
    } catch (error) {
      console.error('Error sharing quiz:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleViewFullLeaderboard = () => {
    navigate(`/quiz/${quizSlug}/leaderboard`);
  };

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!quiz) {
    return (
      <div className="quiz-not-found">
        <h2>Quiz not found</h2>
        <p>The quiz you're looking for doesn't exist.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  const bestAttempt = userAttempts[0]; // Assuming sorted by score/time
  const difficultyColor = {
    easy: 'difficulty-easy',
    medium: 'difficulty-medium',
    hard: 'difficulty-hard'
  }[quiz.difficulty];

  return (
    <div className="quiz-preview-page">
      {/* Add Frame Meta for embeds */}
      <FrameMeta type="quiz" data={quiz} />
      
      {/* Quiz Header */}
      <div className="quiz-preview-header">
        <div className="quiz-emoji-container">
          <span className="quiz-emoji">{quiz.emoji || '🎯'}</span>
        </div>
        
        <h1>{quiz.title}</h1>
        <p className="quiz-description">{quiz.description}</p>

        {/* Quiz Meta */}
        <div className="quiz-meta-row">
          <div className="meta-item">
            <Tag size={16} />
            <span>{quiz.category?.name}</span>
          </div>
          <div className={`meta-item ${difficultyColor}`}>
            <Star size={16} />
            <span>{quiz.difficulty}</span>
          </div>
          <div className="meta-item">
            <Clock size={16} />
            <span>{formatTimeDisplay(quiz.time_limit)}</span>
          </div>
          <div className="meta-item">
            <Users size={16} />
            <span>{quiz.total_attempts || 0} plays</span>
          </div>
        </div>
      </div>

      {/* User's Best Score */}
      {bestAttempt && (
        <div className="user-best-score">
          <Trophy size={20} className="trophy-icon" />
          <div className="score-content">
            <span className="score-label">Your Best:</span>
            <span className="score-value">{bestAttempt.percentage}%</span>
            <span className="score-time">in {formatTimeDisplay(bestAttempt.time_taken)}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="quiz-actions">
        <button 
          className="btn btn-primary btn-start"
          onClick={handleStartQuiz}
          disabled={!isAuthenticated}
        >
          <Play size={20} />
          {!isAuthenticated ? 'Sign in to Play' : (bestAttempt ? 'Play Again' : 'Start Quiz')}
        </button>
        
        {isInMiniApp && (
          <button 
            className="btn btn-secondary btn-share"
            onClick={handleShareQuiz}
            disabled={isSharing || !isAuthenticated}
          >
            <Share2 size={20} />
            Share Quiz
          </button>
        )}
      </div>

      {/* Quiz Info */}
      <div className="quiz-info-section">
        <h3>About This Quiz</h3>
        <div className="quiz-info-grid">
          <div className="info-item">
            <span className="info-label">Questions</span>
            <span className="info-value">{quiz.total_questions || quiz.questions?.length || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Time Limit</span>
            <span className="info-value">{formatTimeDisplay(quiz.time_limit)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Avg Score</span>
            <span className="info-value">
              {quiz.average_score ? `${Math.round(quiz.average_score)}%` : 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Attempts</span>
            <span className="info-value">{quiz.total_attempts || 0}</span>
          </div>
        </div>
      </div>

      {/* Mini Leaderboard */}
      <div className="leaderboard-section">
        <div className="section-header">
          <h3>Top Players</h3>
          {leaderboard.length >= 5 && (
            <button 
              className="view-all-btn"
              onClick={handleViewFullLeaderboard}
            >
              View All
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        
        {leaderboard.length > 0 ? (
          <MiniLeaderboard 
            entries={leaderboard}
            currentUserId={currentUser?.id}
          />
        ) : (
          <div className="no-attempts">
            <Trophy size={32} className="empty-icon" />
            <p>Be the first to complete this quiz!</p>
          </div>
        )}
      </div>

      {/* Your Attempts History */}
      {userAttempts.length > 0 && (
        <div className="attempts-section">
          <h3>Your Attempts</h3>
          <div className="attempts-list">
            {userAttempts.slice(0, 3).map((attempt, index) => (
              <div key={attempt.id} className="attempt-item">
                <div className="attempt-rank">#{index + 1}</div>
                <div className="attempt-details">
                  <span className="attempt-score">{attempt.percentage}%</span>
                  <span className="attempt-time">{formatTimeDisplay(attempt.time_taken)}</span>
                </div>
                <div className="attempt-date">
                  {new Date(attempt.completed_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPreview;