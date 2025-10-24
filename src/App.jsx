import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount, useChainId, useSwitchChain, useConnect, useDisconnect } from "wagmi";
import { config } from "./wagmi";
import GameApp from "./components/GameApp";

const queryClient = new QueryClient();

function AppContent() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const wrongNet = isConnected && chainId !== 10143;

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h2>Woolly Eggs — Mine (Monad Testnet)</h2>
        {isConnected ? (
          <div className="wallet-info">
            <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <button onClick={() => disconnect()}>Disconnect</button>
          </div>
        ) : (
          <button onClick={handleConnect}>Connect Wallet</button>
        )}
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
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}