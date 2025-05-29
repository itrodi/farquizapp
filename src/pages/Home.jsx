import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, AlertCircle } from 'lucide-react';
import { useFarcasterAuth } from '../context/FarcasterAuthContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    error, 
    signIn 
  } = useFarcasterAuth();

  if (isLoading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner" />
        <p>Loading FarQuiz...</p>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (error) {
    return (
      <div className="auth-error">
        <AlertCircle size={64} className="error-icon" />
        <h1>Connection Error</h1>
        <p>{error}</p>
        <button 
          className="btn btn-primary mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
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
        <button 
          className="btn btn-primary mt-4"
          onClick={signIn}
        >
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
          <h1>Welcome, {user?.username || 'User'}!</h1>
          <p>The Ultimate Quiz Experience</p>
        </div>
        <button 
          className="btn btn-primary explore-btn"
          onClick={() => navigate('/explore')}
        >
          Explore Quizzes
        </button>
      </div>
    </div>
  );
};

export default Home;