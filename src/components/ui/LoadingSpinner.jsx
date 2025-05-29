import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', fullPage = false, text = 'Loading...' }) => {
  const spinner = (
    <div className={`loading-spinner-container ${size}`}>
      <div className="loading-spinner" />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-spinner-fullpage">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;