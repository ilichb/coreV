import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, avalanche } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Variable global para evitar doble inicialización
let _config: any = null

export const getConfig = () => {
  if (!_config) {
    _config = createConfig({
      chains: [mainnet, sepolia, polygon, avalanche],
      connectors: [
        injected(),
        walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
          showQrModal: true,
          qrModalOptions: {
            themeMode: 'dark',
            themeVariables: {
              '--wcm-accent-color': '#3b82f6',
              '--wcm-z-index': '9999'
            }
          }
        })
      ],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
        [polygon.id]: http(),
        [avalanche.id]: http(),
      },
      ssr: true
    })
  }
  return _config
}

export const config = getConfig()
