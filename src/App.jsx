import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { config } from "./wagmi";
import GameApp from "./components/GameApp";

const queryClient = new QueryClient();

function AppContent() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const wrongNet = isConnected && chainId !== 10143;

  return (
    <div className="container">
      <div className="header">
        <h2>Woolly Eggs — Mine (Monad Testnet)</h2>
        <div className="header-info">
          {isConnected && (
            <div className="game-status">
              <div className="status-item">
                <span className="status-label">Network:</span>
                <span className="status-value">{chainId === 10143 ? 'Monad Testnet ✅' : `Chain ${chainId} ❌`}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Daily Game:</span>
                <span className="status-value">Available ✅</span>
              </div>
              <div className="status-item">
                <span className="status-label">Tickets:</span>
                <span className="status-value">0/3</span>
              </div>
              <div className="status-item">
                <span className="status-label">Days Played:</span>
                <span className="status-value">0/3</span>
              </div>
            </div>
          )}
          <ConnectButton />
        </div>
      </div>

      {wrongNet && (
        <div className="card">
          <b>Wrong network</b>
          <div className="btn-row">
            <button
              onClick={() => switchChain({ chainId: 10143 })}
              style={{ cursor: "pointer" }}
            >
              Switch to Monad Testnet
            </button>
          </div>
        </div>
      )}

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