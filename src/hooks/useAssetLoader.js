import { useState, useEffect, useCallback } from 'react';

export const useAssetLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadedAssets, setLoadedAssets] = useState({});
  const [error, setError] = useState(null);
  const [currentAsset, setCurrentAsset] = useState('');
  const [isEssentialLoaded, setIsEssentialLoaded] = useState(false);

  const loadImage = useCallback((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  const loadAssets = useCallback(async (assetList, animationAssets = []) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setLoadedAssets({});
    setCurrentAsset('');
    setIsEssentialLoaded(false);

    // Sort assets by priority (critical > high > medium > low)
    const sortedAssets = [...assetList].sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const totalAssets = sortedAssets.length + animationAssets.length;
    let loadedCount = 0;
    const assets = {};

    try {
      // Load essential assets first
      for (const asset of sortedAssets) {
        try {
          setCurrentAsset(asset.name);
          console.log(`Loading essential asset: ${asset.name} from ${asset.src}`);
          const loadedAsset = await loadImage(asset.src);
          assets[asset.name] = loadedAsset;
          loadedCount++;
          
          const newProgress = (loadedCount / totalAssets) * 100;
          setProgress(newProgress);
          
          console.log(`Essential asset loaded: ${asset.name} (${loadedCount}/${totalAssets})`);
        } catch (err) {
          console.error(`Failed to load essential asset ${asset.name}:`, err);
          loadedCount++;
          const newProgress = (loadedCount / totalAssets) * 100;
          setProgress(newProgress);
        }
      }

      // Mark essential assets as loaded
      setLoadedAssets(assets);
      setIsEssentialLoaded(true);
      console.log('Essential assets loaded - game can start!');

      // Load animation assets in background (parallel loading)
      if (animationAssets.length > 0) {
        console.log('Loading animation assets in background...');
        
        // Load animations in parallel batches for better performance
        const batchSize = 4; // Load 4 assets at once
        for (let i = 0; i < animationAssets.length; i += batchSize) {
          const batch = animationAssets.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (asset) => {
            try {
              setCurrentAsset(asset.name);
              console.log(`Loading animation asset: ${asset.name}`);
              const loadedAsset = await loadImage(asset.src);
              assets[asset.name] = loadedAsset;
              loadedCount++;
              
              const newProgress = (loadedCount / totalAssets) * 100;
              setProgress(newProgress);
              
              console.log(`Animation asset loaded: ${asset.name} (${loadedCount}/${totalAssets})`);
            } catch (err) {
              console.error(`Failed to load animation asset ${asset.name}:`, err);
              loadedCount++;
              const newProgress = (loadedCount / totalAssets) * 100;
              setProgress(newProgress);
            }
          });

          await Promise.all(batchPromises);
          setLoadedAssets({...assets}); // Update loaded assets
        }
      }

      setCurrentAsset('');
      setIsLoading(false);
      console.log('All assets loaded successfully');
    } catch (err) {
      setError(err);
      setCurrentAsset('');
      setIsLoading(false);
      console.error('Asset loading failed:', err);
    }
  }, [loadImage]);

  return {
    isLoading,
    progress,
    loadedAssets,
    error,
    currentAsset,
    isEssentialLoaded,
    loadAssets
  };
};

