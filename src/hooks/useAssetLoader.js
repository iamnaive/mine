import { useState, useEffect, useCallback } from 'react';

export const useAssetLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadedAssets, setLoadedAssets] = useState({});
  const [error, setError] = useState(null);
  const [currentAsset, setCurrentAsset] = useState('');

  const loadImage = useCallback((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }, []);

  const loadAssets = useCallback(async (assetList) => {
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setLoadedAssets({});
    setCurrentAsset('');

    // Sort assets by priority (high priority first, then by order)
    const sortedAssets = [...assetList].sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
    });

    const totalAssets = sortedAssets.length;
    let loadedCount = 0;
    const assets = {};

    try {
      for (const asset of sortedAssets) {
        try {
          setCurrentAsset(asset.name);
          console.log(`Loading asset: ${asset.name} from ${asset.src}`);
          const loadedAsset = await loadImage(asset.src);
          assets[asset.name] = loadedAsset;
          loadedCount++;
          
          const newProgress = (loadedCount / totalAssets) * 100;
          setProgress(newProgress);
          
          console.log(`Asset loaded: ${asset.name} (${loadedCount}/${totalAssets})`);
        } catch (err) {
          console.error(`Failed to load asset ${asset.name}:`, err);
          // Continue loading other assets even if one fails
          loadedCount++;
          const newProgress = (loadedCount / totalAssets) * 100;
          setProgress(newProgress);
        }
      }

      setLoadedAssets(assets);
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
    loadAssets
  };
};

