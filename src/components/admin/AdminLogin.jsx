import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle } from 'lucide-react';
import './AdminLogin.css';

// Temporary solution - in production, use proper authentication
const TEMP_ADMIN_CREDENTIALS = {
  username: 'admin',
  password: process.env.REACT_APP_ADMIN_PASSWORD || 'admin123',
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Temporary authentication - replace with proper Supabase auth
      if (
        formData.username === TEMP_ADMIN_CREDENTIALS.username &&
        formData.password === TEMP_ADMIN_CREDENTIALS.password
      ) {
        // Store admin session
        const session = {
          user: { username: formData.username },
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };
        localStorage.setItem('adminSession', JSON.stringify(session));
        
        // Redirect to admin dashboard
        navigate('/admin');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <div className="admin-login-logo">
            <Lock size={32} />
          </div>
          <h1>Admin Login</h1>
          <p>Sign in to access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-login-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <div className="input-wrapper">
              <User size={20} className="input-icon" />
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-input with-icon"
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input with-icon"
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <button 
            className="back-to-app"
            onClick={() => navigate('/')}
          >
            ← Back to FarQuiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;