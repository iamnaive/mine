import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useChainId, useSwitchChain, useDisconnect } from "wagmi";
import { config } from "./wagmi";
import GameApp from "./components/GameApp";

const queryClient = new QueryClient();

function AppContent() {
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