import { http, fallback, createConfig } from 'wagmi'
import { base, baseSepolia, mainnet, hardhat } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia, mainnet, ...(import.meta.env.DEV ? [hardhat] : [])],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'BasedTrust' }),
  ],
  transports: {
    [base.id]: fallback([
      http('https://mainnet.base.org'),                  // Official Base RPC
      http('https://base.publicnode.com'),               // PublicNode (CORS enabled)
      http('https://rpc.ankr.com/base'),                 // Ankr (CORS enabled)
    ]),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    ...(import.meta.env.DEV ? { [hardhat.id]: http() } : {}),
  },
})
