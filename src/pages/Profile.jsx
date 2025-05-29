import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Clock, Award, TrendingUp, Calendar } from 'lucide-react';
import { useFarcasterContext } from '../context/FarcasterContext';
import { supabase } from '../services/supabase';
import { formatTimeDisplay, getOrdinalSuffix, getTimeAgo } from '../utils/helpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import QuizCard from '../components/quiz/QuizCard';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading: authLoading } = useFarcasterContext();
  
  const [stats, setStats] = useState(null);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [topPerformances, setTopPerformances] = useState([]);
  const [globalRank, setGlobalRank] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && currentUser) {
      loadProfileData();
    }
  }, [authLoading, currentUser]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);

      // Fetch user stats
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      setStats(userData);

      // Fetch recent attempts
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quiz:quizzes(
            id,
            title,
            slug,
            emoji,
            category:categories(name)
          )
        `)
        .eq('user_id', currentUser.id)
        .order('completed_at', { ascending: false })
        .limit(5);

      setRecentAttempts(attempts || []);

      // Fetch top performances
      const { data: topScores } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quiz:quizzes(
            id,
            title,
            slug,
            emoji,
            difficulty
          )
        `)
        .eq('user_id', currentUser.id)
        .gte('percentage', 90)
        .order('percentage', { ascending: false })
        .order('time_taken', { ascending: true })
        .limit(5);

      setTopPerformances(topScores || []);

      // Get global rank
      const { data: rankData } = await supabase
        .from('global_leaderboard')
        .select('rank')
        .eq('fid', currentUser.fid)
        .single();

      if (rankData) {
        setGlobalRank(rankData.rank);
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner fullPage text="Loading profile..." />;
  }

  if (!currentUser) {
    return (
      <div className="profile-error">
        <h2>Please sign in to view your profile</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {currentUser.pfp_url ? (
            <img src={currentUser.pfp_url} alt={currentUser.username} />
          ) : (
            <div className="avatar-placeholder">
              {currentUser.username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h1>{currentUser.display_name || currentUser.username}</h1>
          <p className="username">@{currentUser.username}</p>
          {currentUser.bio && <p className="bio">{currentUser.bio}</p>}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-item">
          <Trophy size={24} className="stat-icon gold" />
          <div className="stat-details">
            <span className="stat-value">{stats?.total_points || 0}</span>
            <span className="stat-label">Total Points</span>
          </div>
        </div>

        <div className="stat-item">
          <Target size={24} className="stat-icon" />
          <div className="stat-details">
            <span className="stat-value">{stats?.total_quizzes_taken || 0}</span>
            <span className="stat-label">Quizzes Taken</span>
          </div>
        </div>

        {globalRank && (
          <div className="stat-item">
            <Award size={24} className="stat-icon" />
            <div className="stat-details">
              <span className="stat-value">{getOrdinalSuffix(globalRank)}</span>
              <span className="stat-label">Global Rank</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <section className="profile-section">
        <div className="section-header">
          <h2>
            <Clock size={20} />
            Recent Activity
          </h2>
        </div>

        {recentAttempts.length > 0 ? (
          <div className="activity-list">
            {recentAttempts.map((attempt) => (
              <div 
                key={attempt.id} 
                className="activity-item"
                onClick={() => navigate(`/quiz/${attempt.quiz.slug}`)}
              >
                <div className="activity-emoji">{attempt.quiz.emoji || '🎯'}</div>
                <div className="activity-details">
                  <h3>{attempt.quiz.title}</h3>
                  <div className="activity-meta">
                    <span className="score">{Math.round(attempt.percentage)}%</span>
                    <span className="time">{formatTimeDisplay(attempt.time_taken)}</span>
                    <span className="date">{getTimeAgo(attempt.completed_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No quiz attempts yet</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/explore')}
            >
              Explore Quizzes
            </button>
          </div>
        )}
      </section>

      {/* Top Performances */}
      {topPerformances.length > 0 && (
        <section className="profile-section">
          <div className="section-header">
            <h2>
              <TrendingUp size={20} />
              Top Performances
            </h2>
          </div>

          <div className="performances-grid">
            {topPerformances.map((performance) => (
              <div 
                key={performance.id}
                className="performance-card"
                onClick={() => navigate(`/quiz/${performance.quiz.slug}`)}
              >
                <div className="performance-header">
                  <span className="quiz-emoji">{performance.quiz.emoji || '🎯'}</span>
                  <span className={`difficulty ${performance.quiz.difficulty}`}>
                    {performance.quiz.difficulty}
                  </span>
                </div>
                <h4>{performance.quiz.title}</h4>
                <div className="performance-stats">
                  <span className="score">{Math.round(performance.percentage)}%</span>
                  <span className="time">{formatTimeDisplay(performance.time_taken)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member Since */}
      <div className="member-since">
        <Calendar size={16} />
        <span>Member since {new Date(stats?.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default Profile;