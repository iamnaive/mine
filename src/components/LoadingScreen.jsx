import React from 'react';

const LoadingScreen = ({ progress, isLoading, currentAsset }) => {
  if (!isLoading) return null;

  const getLoadingText = (assetName) => {
    if (assetName && assetName.startsWith('player_walk_')) {
      return 'Loading player animations...';
    }
    
    if (assetName && assetName.startsWith('pickaxe_')) {
      return 'Loading pickaxe animations...';
    }
    
    switch (assetName) {
      case 'pickaxe':
        return 'Loading mining tools...';
      case 'stone':
        return 'Loading stone blocks...';
      case 'special':
        return 'Loading special blocks...';
      case 'background':
        return 'Loading mine background...';
      default:
        return 'Preparing blocks and textures...';
    }
  };

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <h2>⛏️ Loading Mine...</h2>
        <div className="loading-spinner"></div>
        <p>{currentAsset ? getLoadingText(currentAsset) : 'Preparing blocks and textures...'}</p>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">{Math.round(progress)}%</p>
        </div>
        <p className="loading-subtitle">
          {currentAsset ? `Loading ${currentAsset}...` : 'Loading block textures...'}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;

