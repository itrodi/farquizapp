import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const isQuizTaking = location.pathname.includes('/play');

  return (
    <div className="app-layout">
      {!isQuizTaking && <Header />}
      <main className="main-content">
        {children}
      </main>
      {!isQuizTaking && <Navigation />}
    </div>
  );
};

export default Layout;