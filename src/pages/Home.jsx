import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, Zap, Film, Trophy, FlaskConical, BookOpen, Pizza, Brain, Monitor, Music, Bitcoin, ChevronRight, Clock, Users, AlertCircle, LogIn } from 'lucide-react';
import { useFarcasterContext } from '../context/FarcasterContext';
import { supabase } from '../services/supabase';
import './Home.css';

// Category icons mapping
const categoryIcons = {
  'geography': Globe,
  'web3': Bitcoin,
  'entertainment': Film,
  'sports': Trophy,
  'science': FlaskConical,
  'history': BookOpen,
  'food-drink': Pizza,
  'technology': Monitor,
  'music': Music,
  'art-literature': BookOpen,
};

const Home = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    isLoading: authLoading, 
    isAuthenticated, 
    error: authError,
    isInMiniApp,
    user: contextUser,
    signIn,
    isSigningIn
  } = useFarcasterContext();
  
  const [categories, setCategories] = useState([]);
  const [trendingQuizzes, setTrendingQuizzes] = useState([]);
  const [featuredQuizzes, setFeaturedQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchHomeData();
    }
  }, [authLoading]);

  const fetchHomeData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCategories(categoriesData || []);

      // Fetch trending quizzes (most attempted in last 7 days)
      const { data: trendingData } = await supabase
        .from('quizzes')
        .select(`
          *,
          category:categories(name, emoji),
          _count:quiz_attempts(count)
        `)
        .eq('is_published', true)
        .order('total_attempts', { ascending: false })
        .limit(5);

      setTrendingQuizzes(trendingData || []);

      // Fetch featured quizzes (newest)
      const { data: featuredData } = await supabase
        .from('quizzes')
        .select(`
          *,
          category:categories(name, emoji)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(2);

      setFeaturedQuizzes(featuredData || []);

    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/explore?category=${category.slug}`);
  };

  const handleQuizClick = (quiz) => {
    navigate(`/quiz/${quiz.slug}`);
  };

  const handleSignIn = async () => {
    if (!isInMiniApp) {
      console.log('Sign in attempted outside of Farcaster context');
      return;
    }

    try {
      const result = await signIn();
      if (result.success) {
        console.log('Sign in successful!');
      } else {
        console.error('Sign in failed:', result.error);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner" />
        <p>Loading FarQuiz...</p>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (authError) {
    return (
      <div className="auth-error">
        <AlertCircle size={64} className="error-icon" />
        <h1>Connection Error</h1>
        <p>{authError}</p>
        {isInMiniApp && (
          <button 
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="auth-prompt">
        <Brain size={64} className="auth-icon" />
        <h1>Welcome to FarQuiz</h1>
        <p>The Ultimate Quiz Experience on Farcaster</p>
        
        {contextUser && (
          <div className="user-preview">
            <div className="user-info">
              {contextUser.pfpUrl ? (
                <img 
                  src={contextUser.pfpUrl} 
                  alt={contextUser.username}
                  className="preview-avatar"
                />
              ) : (
                <div className="preview-avatar-placeholder">
                  {contextUser.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="user-details">
                <h3>{contextUser.displayName || contextUser.username}</h3>
                <p>@{contextUser.username}</p>
              </div>
            </div>
          </div>
        )}
        
        {isInMiniApp ? (
          <button 
            className="btn btn-primary auth-button"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            <LogIn size={20} />
            {isSigningIn ? 'Signing in...' : 'Sign in with Farcaster'}
          </button>
        ) : (
          <div className="development-notice">
            <p>Open this app in Farcaster to sign in</p>
            <small>Or running in development mode</small>
          </div>
        )}
        
        <div className="auth-features">
          <div className="feature-item">
            <Trophy size={24} />
            <span>Compete on leaderboards</span>
          </div>
          <div className="feature-item">
            <Brain size={24} />
            <span>Track your progress</span>
          </div>
          <div className="feature-item">
            <Zap size={24} />
            <span>Share your achievements</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <Brain size={48} className="hero-icon" />
          <h1>Welcome back, {currentUser.display_name || currentUser.username}!</h1>
          <p>Ready for your next challenge?</p>
        </div>
        <button 
          className="btn btn-primary explore-btn"
          onClick={() => navigate('/explore')}
        >
          Explore Quizzes
        </button>
      </div>

      {/* Featured Quizzes */}
      {featuredQuizzes.length > 0 && (
        <section className="featured-section">
          <div className="section-header">
            <h2>Featured</h2>
            <Link to="/explore" className="see-all">See all</Link>
          </div>
          <div className="featured-grid">
            {featuredQuizzes.map((quiz) => (
              <div 
                key={quiz.id} 
                className="featured-card"
                onClick={() => handleQuizClick(quiz)}
              >
                <div className="featured-emoji">{quiz.emoji || '🎯'}</div>
                <div className="featured-content">
                  <h3>{quiz.title}</h3>
                  <p>{quiz.description}</p>
                  <div className="featured-meta">
                    <span><Clock size={14} /> {Math.floor(quiz.time_limit / 60)}m</span>
                    <span><Users size={14} /> {quiz.total_attempts} plays</span>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm play-btn">
                  Play
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="categories-section">
        <div className="section-header">
          <h2>Categories</h2>
          <Link to="/explore" className="see-all">See all</Link>
        </div>
        <div className="categories-grid">
          {categories.slice(0, 4).map((category) => {
            const Icon = categoryIcons[category.slug] || Zap;
            return (
              <div 
                key={category.id} 
                className="category-card"
                onClick={() => handleCategoryClick(category)}
              >
                <Icon size={32} className="category-icon" />
                <span>{category.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trending Now */}
      <section className="trending-section">
        <div className="section-header">
          <h2>Trending Now</h2>
          <Link to="/explore?sort=popular" className="see-all">See all</Link>
        </div>
        <div className="trending-list">
          {trendingQuizzes.map((quiz, index) => (
            <div 
              key={quiz.id} 
              className="trending-item"
              onClick={() => handleQuizClick(quiz)}
            >
              <div className="trending-rank">{index + 1}</div>
              <div className="trending-content">
                <h3>{quiz.title}</h3>
                <div className="trending-meta">
                  <span><Clock size={12} /> {Math.floor(quiz.time_limit / 60)}m</span>
                  <span><Users size={12} /> {quiz.total_attempts} plays</span>
                </div>
              </div>
              <ChevronRight size={20} className="trending-arrow" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;