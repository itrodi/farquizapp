import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useFarcasterContext } from '../../context/FarcasterContext';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { currentUser } = useFarcasterContext();

  // Helper function to safely get avatar URL
  const getAvatarUrl = (user) => {
    if (!user) return null;
    
    // Handle both pfp_url (from database) and pfpUrl (from context)
    const url = user.pfp_url || user.pfpUrl;
    
    // Ensure it's a valid string and not empty
    if (url && typeof url === 'string' && url.trim() !== '') {
      return url.trim();
    }
    
    return null;
  };

  // Helper function to get avatar placeholder
  const getAvatarPlaceholder = (user) => {
    if (!user) return 'U';
    
    const displayName = user.display_name || user.displayName;
    const username = user.username;
    
    if (displayName && typeof displayName === 'string' && displayName.trim()) {
      return displayName.trim().charAt(0).toUpperCase();
    }
    
    if (username && typeof username === 'string' && username.trim()) {
      return username.trim().charAt(0).toUpperCase();
    }
    
    return 'U';
  };

  const avatarUrl = getAvatarUrl(currentUser);
  const avatarPlaceholder = getAvatarPlaceholder(currentUser);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')}>
          <Brain size={28} className="logo-icon" />
          <span className="logo-text">FarQuiz</span>
        </div>
        
        {currentUser && (
          <div className="user-avatar" onClick={() => navigate('/profile')}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={currentUser.username || 'User'} 
                onError={(e) => {
                  // If image fails to load, hide it and show placeholder
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="avatar-placeholder"
              style={{ display: avatarUrl ? 'none' : 'flex' }}
            >
              {avatarPlaceholder}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;