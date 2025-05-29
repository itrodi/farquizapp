import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, Medal, ChevronLeft } from 'lucide-react';
import { useFarcasterContext } from '../context/FarcasterContext';
import { fetchQuizBySlug, fetchQuizLeaderboard } from '../services/api/quizzes';
import { formatTimeDisplay, getOrdinalSuffix } from '../utils/helpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './Leaderboard.css';

const Leaderboard = () => {
  const { quizSlug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useFarcasterContext();
  
  const [quiz, setQuiz] = useState(null);
  const [entries, setEntries] = useState([]);
  const [userEntry, setUserEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
  }, [quizSlug, currentUser]);

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch quiz details
      const quizData = await fetchQuizBySlug(quizSlug);
      setQuiz(quizData);

      // Fetch full leaderboard
      const leaderboardData = await fetchQuizLeaderboard(
        quizData.id,
        50,
        currentUser?.fid
      );
      
      setEntries(leaderboardData);
      
      // Find current user's entry
      if (currentUser) {
        const userRank = leaderboardData.find(
          entry => entry.user_id === currentUser.id
        );
        setUserEntry(userRank);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} className="medal gold" />;
      case 2:
        return <Trophy size={24} className="medal silver" />;
      case 3:
        return <Trophy size={24} className="medal bronze" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading leaderboard..." />;
  }

  if (!quiz) {
    return (
      <div className="error-page">
        <h2>Quiz not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="leaderboard-header">
        <button className="back-button" onClick={() => navigate(`/quiz/${quizSlug}`)}>
          <ChevronLeft size={20} />
          Back to Quiz
        </button>
        
        <div className="quiz-info">
          <span className="quiz-emoji">{quiz.emoji || '🎯'}</span>
          <h1>{quiz.title} Leaderboard</h1>
        </div>
        
        <div className="leaderboard-stats">
          <div className="stat">
            <span className="stat-value">{entries.length}</span>
            <span className="stat-label">Players</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {quiz.average_score ? `${Math.round(quiz.average_score)}%` : 'N/A'}
            </span>
            <span className="stat-label">Avg Score</span>
          </div>
        </div>
      </div>

      {/* Current User Position (if not in top 50) */}
      {userEntry && userEntry.rank > 50 && (
        <div className="user-position-banner">
          <div className="banner-content">
            <span className="your-position">Your Position</span>
            <div className="position-details">
              <span className="rank">{getOrdinalSuffix(userEntry.rank)}</span>
              <span className="score">{userEntry.percentage}%</span>
              <span className="time">{formatTimeDisplay(userEntry.time_taken)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      <div className="podium">
        {entries.slice(0, 3).map((entry, index) => (
          <div 
            key={entry.user_id} 
            className={`podium-place place-${index + 1}`}
          >
            <div className="podium-medal">
              {getMedalIcon(index + 1)}
            </div>
            
            <div className="podium-user">
              {entry.pfp_url ? (
                <img 
                  src={entry.pfp_url} 
                  alt={entry.username}
                  className="user-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {entry.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <h3>{entry.username || `User ${entry.fid}`}</h3>
            </div>
            
            <div className="podium-stats">
              <div className="score">{entry.percentage}%</div>
              <div className="time">{formatTimeDisplay(entry.time_taken)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="leaderboard-table">
        <div className="table-header">
          <span className="rank-col">Rank</span>
          <span className="user-col">Player</span>
          <span className="score-col">Score</span>
          <span className="time-col">Time</span>
        </div>
        
        <div className="table-body">
          {entries.map((entry) => {
            const isCurrentUser = entry.user_id === currentUser?.id;
            
            return (
              <div 
                key={entry.user_id}
                className={`table-row ${isCurrentUser ? 'current-user' : ''}`}
              >
                <div className="rank-col">
                  {entry.rank <= 3 ? (
                    getMedalIcon(entry.rank)
                  ) : (
                    <span className="rank-number">{entry.rank}</span>
                  )}
                </div>
                
                <div className="user-col">
                  {entry.pfp_url ? (
                    <img 
                      src={entry.pfp_url} 
                      alt={entry.username}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {entry.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="username">
                    {entry.username || entry.display_name || `User ${entry.fid}`}
                    {isCurrentUser && ' (You)'}
                  </span>
                </div>
                
                <div className="score-col">
                  <span className="score-value">{entry.percentage}%</span>
                </div>
                
                <div className="time-col">
                  <Clock size={14} />
                  <span>{formatTimeDisplay(entry.time_taken)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {entries.length === 0 && (
        <div className="empty-leaderboard">
          <Medal size={48} />
          <h3>No one has completed this quiz yet</h3>
          <p>Be the first to set a score!</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/quiz/${quizSlug}/play`)}
          >
            Take Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;