'use client'

import { useAccount, useSignMessage, useChainId } from 'wagmi'
import { useState, useEffect, useCallback } from 'react'

export interface AndromedaDID {
  did: string;
  chain: 'eth' | 'sol' | 'pol' | 'avax';
  address: string;
  timestamp: string;
}

export default function useAndromedaWallet() {
  const { address, isConnected, connector } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  
  const [did, setDid] = useState<AndromedaDID | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convertir chainId a cadena de cadena
  const getChainFromId = useCallback((id: number): AndromedaDID['chain'] => {
    const chains: Record<number, AndromedaDID['chain']> = {
      1: 'eth',
      11155111: 'eth', // Sepolia
      137: 'pol',
      43114: 'avax',
    }
    return chains[id] || 'eth'
  }, [])

  // Generar DID a partir de address y chain
  const generateDid = useCallback((address: string, chainId: number): AndromedaDID => {
    const chain = getChainFromId(chainId)
    const didString = `did:andromeda:${chain}:${address.toLowerCase()}`
    
    return {
      did: didString,
      chain,
      address: address.toLowerCase(),
      timestamp: new Date().toISOString()
    }
  }, [getChainFromId])

  // Actualizar DID cuando cambia la wallet
  useEffect(() => {
    if (address && chainId) {
      const newDid = generateDid(address, chainId)
      setDid(newDid)
      setError(null)
    } else {
      setDid(null)
    }
  }, [address, chainId, generateDid])

  // Firmar un challenge
  const signChallenge = useCallback(async (challenge: string) => {
    if (!isConnected || !address) {
      throw new Error('Wallet no conectada')
    }

    setIsLoading(true)
    setError(null)

    try {
      const signature = await signMessageAsync({ message: challenge })
      return {
        signature,
        address,
        did: did?.did || generateDid(address, chainId).did
      }
    } catch (err: any) {
      setError(err.message || 'Error al firmar')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, signMessageAsync, did, chainId, generateDid])

  // Verificar si hay una wallet conectada
  const getWalletStatus = useCallback(() => {
    return {
      isConnected,
      address,
      chainId,
      connector: connector?.name || 'Desconocido',
      did
    }
  }, [isConnected, address, chainId, connector, did])

  return {
    // Estado
    isConnected,
    address,
    chainId,
    did,
    isLoading,
    error,
    
    // Métodos
    signChallenge,
    getWalletStatus,
    generateDid: address && chainId ? () => generateDid(address, chainId) : null,
    
    // Utilidades
    getShortAddress: () => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '',
    getChainName: () => {
      if (!chainId) return 'Desconocida'
      const names: Record<number, string> = {
        1: 'Ethereum',
        11155111: 'Sepolia',
        137: 'Polygon',
        43114: 'Avalanche'
      }
      return names[chainId] || `Chain ${chainId}`
    }
  }
}
