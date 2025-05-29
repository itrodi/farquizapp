import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Trophy, TrendingUp, Plus, Activity, Calendar } from 'lucide-react';
import { useAdminContext } from '../../context/AdminContext';
import { supabase } from '../../services/supabase';
import { fetchQuizStats } from '../../services/api/quizzes';
import { formatNumber, getTimeAgo } from '../../utils/helpers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { adminUser } = useAdminContext();
  
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalUsers: 0,
    totalAttempts: 0,
    averageScore: 0,
    categoryBreakdown: {},
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch quiz statistics
      const quizStats = await fetchQuizStats();

      // Fetch user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch recent activity
      const { data: recentActivity } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          percentage,
          completed_at,
          user:users(username, pfp_url),
          quiz:quizzes(title, emoji)
        `)
        .order('completed_at', { ascending: false })
        .limit(10);

      setStats({
        ...quizStats,
        totalUsers: userCount || 0,
        recentActivity: recentActivity || []
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage text="Loading dashboard..." />;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/admin/quizzes')}
        >
          <Plus size={20} />
          Create Quiz
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Quizzes</h3>
            <p className="stat-number">{formatNumber(stats.totalQuizzes)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{formatNumber(stats.totalUsers)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <Trophy size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Attempts</h3>
            <p className="stat-number">{formatNumber(stats.totalAttempts)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Average Score</h3>
            <p className="stat-number">{stats.averageScore}%</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>
            <Activity size={20} />
            Category Performance
          </h2>
        </div>
        
        <div className="category-breakdown">
          {Object.entries(stats.categoryStats || {}).map(([category, data]) => {
            const percentage = stats.totalAttempts > 0 
              ? Math.round((data.attempts / stats.totalAttempts) * 100)
              : 0;
              
            return (
              <div key={category} className="category-stat">
                <div className="category-info">
                  <span className="category-name">{category}</span>
                  <span className="category-details">
                    {data.count} quizzes • {formatNumber(data.attempts)} attempts
                  </span>
                </div>
                <div className="category-bar">
                  <div 
                    className="category-bar-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="category-percentage">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>
            <Calendar size={20} />
            Recent Activity
          </h2>
        </div>

        <div className="activity-table">
          <div className="table-header">
            <span>User</span>
            <span>Quiz</span>
            <span>Score</span>
            <span>Time</span>
          </div>
          
          {stats.recentActivity.map((activity) => (
            <div key={activity.id} className="table-row">
              <div className="user-cell">
                {activity.user.pfp_url ? (
                  <img 
                    src={activity.user.pfp_url} 
                    alt={activity.user.username}
                    className="user-avatar" 
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {activity.user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span>{activity.user.username}</span>
              </div>
              
              <div className="quiz-cell">
                <span className="quiz-emoji">{activity.quiz.emoji || '🎯'}</span>
                <span>{activity.quiz.title}</span>
              </div>
              
              <div className="score-cell">
                <span className={`score ${activity.percentage >= 80 ? 'high' : activity.percentage >= 60 ? 'medium' : 'low'}`}>
                  {Math.round(activity.percentage)}%
                </span>
              </div>
              
              <div className="time-cell">
                {getTimeAgo(activity.completed_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="action-card"
          onClick={() => navigate('/admin/quizzes')}
        >
          <FileText size={32} />
          <h3>Manage Quizzes</h3>
          <p>Create, edit, and delete quizzes</p>
        </button>
        
        <button 
          className="action-card"
          onClick={() => navigate('/admin/analytics')}
        >
          <TrendingUp size={32} />
          <h3>View Analytics</h3>
          <p>Detailed statistics and trends</p>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;