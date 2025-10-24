import React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import GameApp from "./components/GameApp";

// Define Monad Testnet
const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "http://testnet.monadexplorer.com" },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: "Woolly Eggs — Mine (Monad Testnet)",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "your-project-id",
  chains: [monadTestnet],
  ssr: false,
});

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