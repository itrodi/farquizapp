import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Trophy, Clock, Activity, Calendar, Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatNumber, getTimeAgo } from '../../utils/helpers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './AdminAnalytics.css';

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7days');
  const [analytics, setAnalytics] = useState({
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalAttempts: 0,
      avgAttemptsPerUser: 0,
      avgScore: 0,
      completionRate: 0
    },
    trends: [],
    topQuizzes: [],
    userActivity: [],
    categoryPerformance: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24hours':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'all':
          startDate.setFullYear(2020); // Far past date
          break;
      }

      // Fetch overview stats
      const { data: users } = await supabase
        .from('users')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*, quiz:quizzes(title, emoji)')
        .gte('completed_at', startDate.toISOString());

      const { data: activeUsersData } = await supabase
        .from('quiz_attempts')
        .select('user_id')
        .gte('completed_at', startDate.toISOString());

      const uniqueActiveUsers = new Set(activeUsersData?.map(a => a.user_id) || []);
      
      const avgScore = attempts?.reduce((sum, a) => sum + a.percentage, 0) / (attempts?.length || 1);
      const completionRate = (attempts?.filter(a => a.is_completed).length / (attempts?.length || 1)) * 100;

      // Fetch top quizzes
      const quizAttemptCounts = attempts?.reduce((acc, attempt) => {
        const quizId = attempt.quiz_id;
        if (!acc[quizId]) {
          acc[quizId] = {
            quiz: attempt.quiz,
            count: 0,
            avgScore: 0,
            scores: []
          };
        }
        acc[quizId].count++;
        acc[quizId].scores.push(attempt.percentage);
        return acc;
      }, {});

      const topQuizzes = Object.entries(quizAttemptCounts || {})
        .map(([quizId, data]) => ({
          quizId,
          title: data.quiz?.title || 'Unknown',
          emoji: data.quiz?.emoji || '🎯',
          attempts: data.count,
          avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 10);

      // Calculate daily trends
      const dailyData = {};
      attempts?.forEach(attempt => {
        const date = new Date(attempt.completed_at).toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            attempts: 0,
            totalScore: 0,
            users: new Set()
          };
        }
        dailyData[date].attempts++;
        dailyData[date].totalScore += attempt.percentage;
        dailyData[date].users.add(attempt.user_id);
      });

      const trends = Object.values(dailyData)
        .map(day => ({
          date: day.date,
          attempts: day.attempts,
          avgScore: Math.round(day.totalScore / day.attempts),
          uniqueUsers: day.users.size
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Get user activity
      const userActivityMap = {};
      attempts?.forEach(attempt => {
        if (!userActivityMap[attempt.user_id]) {
          userActivityMap[attempt.user_id] = {
            userId: attempt.user_id,
            attempts: 0,
            totalScore: 0,
            lastActive: attempt.completed_at
          };
        }
        userActivityMap[attempt.user_id].attempts++;
        userActivityMap[attempt.user_id].totalScore += attempt.percentage;
      });

      const userActivity = Object.values(userActivityMap)
        .map(user => ({
          ...user,
          avgScore: Math.round(user.totalScore / user.attempts)
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 20);

      // Set analytics data
      setAnalytics({
        overview: {
          totalUsers: users?.length || 0,
          activeUsers: uniqueActiveUsers.size,
          totalAttempts: attempts?.length || 0,
          avgAttemptsPerUser: uniqueActiveUsers.size > 0 
            ? Math.round((attempts?.length || 0) / uniqueActiveUsers.size * 10) / 10
            : 0,
          avgScore: Math.round(avgScore),
          completionRate: Math.round(completionRate)
        },
        trends,
        topQuizzes,
        userActivity,
        categoryPerformance: [] // TODO: Implement category performance
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Attempts', 'Average Score', 'Unique Users'],
      ...analytics.trends.map(day => [
        day.date,
        day.attempts,
        day.avgScore,
        day.uniqueUsers
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farquiz-analytics-${timeRange}.csv`;
    a.click();
  };

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading analytics..." />;
  }

  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h1>Analytics Dashboard</h1>
        
        <div className="header-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="24hours">Last 24 Hours</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          
          <button className="btn btn-secondary" onClick={exportData}>
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-icon purple">
            <Users size={24} />
          </div>
          <div className="card-content">
            <h3>Total Users</h3>
            <p className="metric">{formatNumber(analytics.overview.totalUsers)}</p>
            <span className="subtext">
              {analytics.overview.activeUsers} active
            </span>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon blue">
            <Trophy size={24} />
          </div>
          <div className="card-content">
            <h3>Quiz Attempts</h3>
            <p className="metric">{formatNumber(analytics.overview.totalAttempts)}</p>
            <span className="subtext">
              {analytics.overview.avgAttemptsPerUser} per user
            </span>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon green">
            <TrendingUp size={24} />
          </div>
          <div className="card-content">
            <h3>Average Score</h3>
            <p className="metric">{analytics.overview.avgScore}%</p>
            <span className="subtext">
              {analytics.overview.completionRate}% completion
            </span>
          </div>
        </div>
      </div>

      {/* Activity Trends */}
      <div className="analytics-section">
        <h2>
          <Activity size={20} />
          Activity Trends
        </h2>
        
        <div className="trends-chart">
          {analytics.trends.length > 0 ? (
            <div className="simple-chart">
              {analytics.trends.map((day, index) => (
                <div key={index} className="chart-day">
                  <div className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${(day.attempts / Math.max(...analytics.trends.map(d => d.attempts))) * 100}%` 
                      }}
                      title={`${day.attempts} attempts`}
                    />
                  </div>
                  <span className="chart-label">{new Date(day.date).getDate()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No data for selected period</p>
          )}
        </div>
      </div>

      {/* Top Quizzes */}
      <div className="analytics-section">
        <h2>
          <Trophy size={20} />
          Top Quizzes
        </h2>
        
        <div className="top-quizzes-list">
          {analytics.topQuizzes.map((quiz, index) => (
            <div key={quiz.quizId} className="quiz-rank-item">
              <span className="rank">#{index + 1}</span>
              <span className="quiz-emoji">{quiz.emoji}</span>
              <span className="quiz-title">{quiz.title}</span>
              <div className="quiz-stats">
                <span>{quiz.attempts} plays</span>
                <span>{quiz.avgScore}% avg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Active Users */}
      <div className="analytics-section">
        <h2>
          <Users size={20} />
          Most Active Users
        </h2>
        
        <div className="users-table">
          <div className="table-header">
            <span>User ID</span>
            <span>Attempts</span>
            <span>Avg Score</span>
            <span>Last Active</span>
          </div>
          
          {analytics.userActivity.map(user => (
            <div key={user.userId} className="table-row">
              <span className="user-id">{user.userId.slice(0, 8)}...</span>
              <span>{user.attempts}</span>
              <span>{user.avgScore}%</span>
              <span>{getTimeAgo(user.lastActive)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;