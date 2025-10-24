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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  return (
    <div className="container">
      <div className="header">
        {/* Left side: Lives, Network, Chain */}
        <div className="header-group">
          <div className="header-chip header-chip-icon">
            <span role="img" aria-label="heart">❤️</span> Lives: 0
          </div>
          {isConnected && chainId === 10143 && (
            <>
              <div className="header-chip">
                Monad Testnet
              </div>
              <div className="header-chip">
                chain {chainId}
              </div>
            </>
          )}
        </div>

        {/* Right side: Address, Get Life, Disconnect, Muted Icon, Connect Button */}
        <div className="header-group">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} type="button" className="header-button connect-wallet-btn">
                          Connect Wallet
                        </button>
                      );
                    }

                    // If connected but on unsupported chain
                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} type="button" className="header-button wrong-network-btn">
                          Wrong network
                        </button>
                      );
                    }

                    // If connected and on supported chain
                    return (
                      <>
                        <div className="header-chip" onClick={openAccountModal}>
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ''}
                        </div>
                        <button className="header-button">Get life</button>
                        <button className="header-button" onClick={() => disconnect()}>Disconnect</button>
                        <div className="header-chip header-chip-icon">
                          <span role="img" aria-label="muted speaker">🔇</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
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