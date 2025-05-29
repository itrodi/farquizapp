import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, User } from 'lucide-react';
import './Navigation.css';

const Navigation = () => {
  return (
    <nav className="bottom-navigation">
      <NavLink 
        to="/" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Home size={24} />
        <span>Home</span>
      </NavLink>
      
      <NavLink 
        to="/explore" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Search size={24} />
        <span>Explore</span>
      </NavLink>
      
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <User size={24} />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
};

export default Navigation;