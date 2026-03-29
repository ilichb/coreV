import * as crypto from 'crypto';
import { logger } from '../../utils/logger';

/**
 * Interfaz para configuración de hashing
 */
export interface WalletHashConfig {
  algorithm: 'sha256' | 'sha512';
  saltLength: number;
  hashFormat: 'hex' | 'base64';
  rotationPeriodDays: number;
}

/**
 * Interfaz para resultados de hashing
 */
export interface WalletHashResult {
  walletHash: string;
  salt: string;
  algorithm: string;
  timestamp: string;
  version: string;
}

/**
 * Servicio para hashing de direcciones de wallet con sal rotativa
 * Cumple con GDPR/CCPA al evitar re-identificación de datos personales
 */
export class WalletHashService {
  private static instance: WalletHashService;

  // Configuración por defecto (puede ser sobrescrita por .env)
  private config: WalletHashConfig = {
    algorithm: 'sha256',
    saltLength: 32,
    hashFormat: 'hex',
    rotationPeriodDays: 90
  };

  // Cache de salt activa (en producción usar Redis)
  private activeSaltCache: Map<string, { salt: string; expiresAt: Date }> = new Map();

  // Versión del esquema de hashing
  private static readonly HASH_VERSION = 'v2';

  private constructor() {
    this.loadConfigFromEnv();
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): WalletHashService {
    if (!WalletHashService.instance) {
      WalletHashService.instance = new WalletHashService();
    }
    return WalletHashService.instance;
  }

  /**
   * Cargar configuración desde variables de entorno
   */
  private loadConfigFromEnv(): void {
    // Leer configuración desde .env
    const algorithm = process.env.WALLET_HASH_ALGORITHM as 'sha256' | 'sha512' || this.config.algorithm;
    const saltLength = parseInt(process.env.WALLET_HASH_SALT_LENGTH || this.config.saltLength.toString());
    const rotationPeriodDays = parseInt(process.env.WALLET_HASH_ROTATION_DAYS || this.config.rotationPeriodDays.toString());

    this.config = {
      algorithm,
      saltLength: Math.max(16, Math.min(64, saltLength)), // Limitar entre 16-64 bytes
      hashFormat: 'hex',
      rotationPeriodDays: Math.max(30, Math.min(365, rotationPeriodDays)) // Limitar entre 30-365 días
    };
  }

  /**
   * Generar una nueva sal
   */
  private generateSalt(): string {
    return crypto.randomBytes(this.config.saltLength).toString('hex');
  }

  /**
   * Obtener sal activa para una wallet (con rotación automática)
   */
  private getActiveSalt(walletAddress: string): string {
    const normalizedAddress = walletAddress.toLowerCase();
    const cacheKey = normalizedAddress;
    const now = new Date();

    // Verificar si hay una sal activa en cache
    const cached = this.activeSaltCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.salt;
    }

    // Generar nueva sal
    const newSalt = this.generateSalt();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.rotationPeriodDays);

    // Actualizar cache
    this.activeSaltCache.set(cacheKey, {
      salt: newSalt,
      expiresAt
    });

    // En producción, aquí se guardaría en DB/Redis
    this.persistSalt(normalizedAddress, newSalt, expiresAt);

    return newSalt;
  }

  /**
   * Persistir sal en almacenamiento permanente (mock para desarrollo)
   */
  private persistSalt(walletAddress: string, salt: string, expiresAt: Date): void {
    // En producción, esto guardaría en Supabase/Redis
    // Por ahora es solo un log
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[WalletHashService] Nuevo salt para ${walletAddress.substring(0, 8)}...`);
    }
  }

  /**
   * Hashear una dirección de wallet
   */
  public hashWallet(walletAddress: string): WalletHashResult {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      const salt = this.getActiveSalt(normalizedAddress);

      // Crear hash con sal
      const hash = crypto
        .createHash(this.config.algorithm)
        .update(normalizedAddress + salt)
        .digest(this.config.hashFormat);

      // Formatear hash con prefijo y versión
      const walletHash = this.formatHash(hash);

      return {
        walletHash,
        salt,
        algorithm: this.config.algorithm,
        timestamp: new Date().toISOString(),
        version: WalletHashService.HASH_VERSION
      };
    } catch (error) {
      logger.error('[WalletHashService] Error al hashear wallet:', error);
      throw new Error(`Failed to hash wallet address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Formatear hash para consistencia
   */
  private formatHash(rawHash: string): string {
    // Prefijo para identificar el esquema de hashing
    return `did:andromeda:hash:${WalletHashService.HASH_VERSION}:${rawHash.substring(0, 32)}`;
  }

  /**
   * Verificar si un hash corresponde a una dirección de wallet
   */
  public verifyHash(walletHash: string, walletAddress: string): boolean {
    try {
      const result = this.hashWallet(walletAddress);
      return result.walletHash === walletHash;
    } catch {
      return false;
    }
  }

  /**
   * Extraer la dirección original del hash (solo para debugging/admin)
   * En producción, esto solo estaría disponible para administradores con acceso a las sales
   */
  public debugExtractInfo(walletHash: string): { version: string; hashPrefix: string } | null {
    const parts = walletHash.split(':');
    if (parts.length < 5 || parts[0] !== 'did' || parts[1] !== 'andromeda' || parts[2] !== 'hash') {
      return null;
    }

    return {
      version: parts[3],
      hashPrefix: parts[4]
    };
  }

  /**
   * Obtener estadísticas del servicio
   */
  public getStats(): {
    activeCacheSize: number;
    config: WalletHashConfig;
    hashVersion: string;
  } {
    return {
      activeCacheSize: this.activeSaltCache.size,
      config: this.config,
      hashVersion: WalletHashService.HASH_VERSION
    };
  }

  /**
   * Limpiar cache (útil para testing)
   */
  public clearCache(): void {
    this.activeSaltCache.clear();
  }

  /**
   * Batch hashing para migración de datos
   */
  public batchHashWallets(walletAddresses: string[]): WalletHashResult[] {
    return walletAddresses.map(wallet => this.hashWallet(wallet));
  }

  /**
   * Validar formato de dirección de wallet
   */
  public static isValidWalletAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;

    // Validación básica para direcciones Ethereum
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

    // También aceptar DIDs
    const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9._\-]+$/;

    return ethAddressRegex.test(address) || didRegex.test(address);
  }
}

/**
 * Instancia singleton para uso global
 */
export const walletHashService = WalletHashService.getInstance();

/**
 * Helper functions para uso directo
 */
export function hashWallet(walletAddress: string): string {
  return walletHashService.hashWallet(walletAddress).walletHash;
}

export function verifyWalletHash(walletHash: string, walletAddress: string): boolean {
  return walletHashService.verifyHash(walletHash, walletAddress);
}