import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useFarcasterContext } from '../../context/FarcasterContext';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { currentUser } = useFarcasterContext();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')}>
          <Brain size={28} className="logo-icon" />
          <span className="logo-text">FarQuiz</span>
        </div>
        
        {currentUser && (
          <div className="user-avatar" onClick={() => navigate('/profile')}>
            {currentUser.pfp_url ? (
              <img src={currentUser.pfp_url} alt={currentUser.username} />
            ) : (
              <div className="avatar-placeholder">
                {currentUser.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;