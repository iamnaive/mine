import React, { useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useChainId, useSwitchChain, useDisconnect } from "wagmi";
import { config } from "./wagmi";
import GameApp from "./components/GameApp";

const queryClient = new QueryClient();

function AppContent() {
  // Force dark theme for RainbowKit modal
  useEffect(() => {
    const forceDarkModal = () => {
      // Find all possible modal elements
      const modalSelectors = [
        '[data-rk] [role="dialog"]',
        '[data-rk] [class*="modal"]',
        '[data-rk] [class*="overlay"]',
        'div[style*="position: fixed"][style*="z-index"]',
        'div[style*="background-color: white"]',
        'div[style*="background-color: #fff"]',
        'div[style*="background-color: #ffffff"]',
        'div[style*="background: white"]',
        'div[style*="background: #fff"]',
        'div[style*="background: #ffffff"]'
      ];

      modalSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Force dark background
          element.style.setProperty('background', 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 'important');
          element.style.setProperty('background-color', '#1a1a1a', 'important');
          element.style.setProperty('color', '#ffffff', 'important');
          
          // Also apply to all children
          const children = element.querySelectorAll('*');
          children.forEach(child => {
            child.style.setProperty('color', '#ffffff', 'important');
            if (child.style.background && (
              child.style.background.includes('white') || 
              child.style.background.includes('#fff') ||
              child.style.background.includes('#ffffff')
            )) {
              child.style.setProperty('background', 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 'important');
            }
          });
        });
      });
    };

    // Run immediately
    forceDarkModal();

    // Set up observer to watch for modal changes
    const observer = new MutationObserver(forceDarkModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Also run periodically as backup
    const interval = setInterval(forceDarkModal, 100);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="container">
      <div className="header">
        <div className="header-group">
          <ConnectButton />
        </div>
      </div>

      <div className="card">
        <GameApp />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}