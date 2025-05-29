import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, Zap, Film, Trophy, FlaskConical, BookOpen, Pizza, Monitor, Music, Bitcoin, ChevronRight, Clock, Users } from 'lucide-react';
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
  const { currentUser, isLoading: authLoading } = useFarcasterContext();
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

  if (authLoading || isLoading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="auth-prompt">
        <Brain size={64} className="auth-icon" />
        <h1>Welcome to FarQuiz</h1>
        <p>The Ultimate Quiz Experience on Farcaster</p>
        <button className="btn btn-primary mt-4">
          Sign in with Farcaster
        </button>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <Brain size={48} className="hero-icon" />
          <h1>FarQuiz</h1>
          <p>The Ultimate Quiz Experience</p>
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
                  <span><Clock size={12} /> {Math.floor(quiz.time_limit / 60)}s</span>
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