// src/wagmi.js
// Wagmi v2 config with explicit injected connectors for MetaMask, Phantom, Backpack, etc.

import { createConfig, http, fallback } from "wagmi";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

// --- ENV ---
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 10143);
const RPC_URL = String(import.meta.env.VITE_RPC_URL ?? "https://testnet-rpc.monad.xyz");
const APP_NAME = String(import.meta.env.VITE_APP_NAME ?? "Crypto Mine Game");
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Log WalletConnect Project ID for debugging
console.log('WalletConnect Project ID:', WC_PROJECT_ID ? 'Set' : 'Not set');

// --- Chain ---
export const MONAD = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "http://testnet.monadexplorer.com" },
  },
  testnet: true,
});

// Helpers to safely read optional globals
const get = (path) => {
  try {
    // e.g. "phantom.ethereum"
    return path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), globalThis);
  } catch {
    return undefined;
  }
};

// --- Connectors ---
// We define one injected connector per brand. If provider is missing, wagmi marks it not-ready.
const connectors = [
  // MetaMask
  injected({
    shimDisconnect: true,
    target: "metaMask",
  }),

  // Phantom (EVM must be enabled in extension)
  injected({
    shimDisconnect: true,
    // @ts-expect-error: wagmi accepts getProvider at runtime
    getProvider: () => get("phantom.ethereum") ?? null,
  }),

  // Backpack (EVM provider lives on window.backpack.ethereum)
  injected({
    shimDisconnect: true,
    // @ts-expect-error
    getProvider: () => get("backpack.ethereum") ?? null,
  }),

  // Coinbase Wallet
  coinbaseWallet({
    appName: APP_NAME,
    preference: "all",
  }),

  // WalletConnect
  ...(WC_PROJECT_ID
    ? [
        walletConnect({
          projectId: WC_PROJECT_ID,
          metadata: {
            name: APP_NAME,
            description: "Crypto Mine Game",
            url: window.location.origin,
            icons: ["https://fav.farm/⛏️"],
          },
          showQrModal: true,
        }),
      ]
    : []),
];

// --- Transports ---
const transports = {
  [MONAD.id]: fallback([http(RPC_URL)]),
};

// --- Config ---
export const config = createConfig({
  chains: [MONAD],
  connectors,
  transports,
  ssr: false, // RainbowKit requires ssr: false
  multiInjectedProviderDiscovery: true,
});
