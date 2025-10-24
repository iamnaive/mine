import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
        <ConnectButton />
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