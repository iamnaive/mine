import React from 'react';

const LoadingScreen = ({ progress, isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <h2>⛏️ Loading Mine...</h2>
        <div className="loading-spinner"></div>
        <p>Preparing blocks and textures...</p>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>
        <p className="loading-subtitle">Loading block textures...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;

