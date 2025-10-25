import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton, darkTheme, useConnectModal } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useChainId, useSwitchChain, useDisconnect } from "wagmi";
import { config } from "./wagmi";
import GameApp from "./components/GameApp";

const queryClient = new QueryClient();

function AppContent() {
  const { openConnectModal } = useConnectModal();

  return (
    <div className="container">
      <div className="header">
        <div className="header-group">
          {/* Custom graphic Connect Wallet button in top-right corner */}
          <button 
            className="graphic-btn btn-connect header-connect-btn"
            onClick={openConnectModal}
          >
            <img 
              src="/images/Connect.png"
              alt="Connect Wallet" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </button>
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
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#9B59B6', // Purple accent like in the image
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}