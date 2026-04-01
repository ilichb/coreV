import { MongoClient, Db, Collection } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Configuración de conexión MongoDB Atlas
 */
interface MongoDBConfig {
  uri: string;
  database: string;
  collection: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}

/**
 * Cliente Singleton para MongoDB Atlas
 * Optimizado para el Tier M0 con pooling eficiente
 */
export class MongoDBClient {
  private static instance: MongoDBClient;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  private config: MongoDBConfig;

  private constructor() {
    // Constructor privado para patrón Singleton
    this.config = {
      uri: '', // Se establecerá dinámicamente en connect()
      database: 'andromeda_core',
      collection: 'milestones',
      options: {
        maxPoolSize: 5,          // Límite conservador para Tier M0
        minPoolSize: 1,          // Pool mínimo para mantener conexión
        maxIdleTimeMS: 30000,    // 30 segundos de inactividad
        serverSelectionTimeoutMS: 15000, // 15 segundos timeout de selección (aumentado desde 5s)
        socketTimeoutMS: 20000,  // 20 segundos timeout de socket (aumentado desde 10s)
      }
    };
  }

  /**
   * Obtiene la instancia Singleton del cliente MongoDB
   */
  public static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  /**
   * Construye la URI de MongoDB a partir de variables de entorno
   * Prioridad: MONGODB_URI > MONGODB_USERNAME/MONGODB_PASSWORD > valores por defecto
   */
  private buildMongoURI(): string {
    // DEBUG: Log para ver qué variables están disponibles
    console.log('[MongoDB Debug] MONGODB_URI:', process.env.MONGODB_URI ? '✅ Presente' : '❌ Ausente');
    console.log('[MongoDB Debug] MONGODB_USERNAME:', process.env.MONGODB_USERNAME || 'No configurado');
    console.log('[MongoDB Debug] MONGODB_PASSWORD:', process.env.MONGODB_PASSWORD ? '✅ Presente' : '❌ Ausente');

    // Primero intentar usar MONGODB_URI completa si está disponible
    if (process.env.MONGODB_URI) {
      console.log('[MongoDB Debug] Usando MONGODB_URI completa del entorno');
      return process.env.MONGODB_URI;
    }

    // Si no, construir desde componentes
    const username = process.env.MONGODB_USERNAME || 'admin_andromeda';
    const password = process.env.MONGODB_PASSWORD || '***REMOVED***'; // Contraseña correcta
    const cluster = process.env.MONGODB_CLUSTER || 'andromedacore.jtkz6fn.mongodb.net';
    const appName = process.env.MONGODB_APP_NAME || 'AndromedaCore';

    const constructedURI = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cluster}/?appName=${encodeURIComponent(appName)}`;
    console.log('[MongoDB Debug] URI construida desde componentes:', constructedURI.replace(/:([^:@]+)@/, ':****@'));

    return constructedURI;
  }

  /**
   * Conecta al cliente MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      // Construir la URI dinámicamente cada vez que nos conectamos
      this.config.uri = this.buildMongoURI();

      this.log('Conectando a MongoDB Atlas...');
      this.log(`URI construida: ${this.config.uri.replace(/:([^:@]+)@/, ':****@')}`); // Mask password

      this.client = new MongoClient(this.config.uri, this.config.options);
      await this.client.connect();

      this.db = this.client.db(this.config.database);
      this.isConnected = true;

      // Crear índice único en atlasId si no existe
      await this.ensureIndexes();

      this.log('✅ Conexión a MongoDB Atlas establecida');
    } catch (error) {
      this.logError('Error conectando a MongoDB Atlas:', error);
      throw error;
    }
  }

  /**
   * Cierra la conexión a MongoDB
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.log('Conexión a MongoDB cerrada');
      } catch (error) {
        this.logError('Error cerrando conexión MongoDB:', error);
      }
    }
  }

  /**
   * Obtiene la colección de milestones
   */
  public getMilestonesCollection(): Collection {
    if (!this.db) {
      throw new Error('MongoDB no está conectado');
    }
    return this.db.collection(this.config.collection);
  }

  /**
   * Obtiene la instancia de la base de datos
   */
  public getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB no está conectado');
    }
    return this.db;
  }

  /**
   * Asegura que los índices necesarios existan
   */
  private async ensureIndexes(): Promise<void> {
    try {
      const collection = this.getMilestonesCollection();

      // Índice único en atlasId para prevenir colisiones
      await collection.createIndex(
        { atlasId: 1 },
        { unique: true, name: 'atlasId_unique' }
      );

      // Índice compuesto para consultas frecuentes
      await collection.createIndex(
        { status: 1, createdAt: -1 },
        { name: 'status_createdAt' }
      );

      // Índice en sourceScorecardHash para trazabilidad
      await collection.createIndex(
        { sourceScorecardHash: 1 },
        { name: 'sourceScorecardHash', sparse: true }
      );

      this.log('Índices de MongoDB creados/verificados');
    } catch (error) {
      this.logError('Error creando índices MongoDB:', error);
    }
  }

  /**
   * Inserta un documento en la colección de milestones
   * Implementa upsert basado en atlasId (idempotente)
   */
  public async upsertMilestone(
    milestone: any,
    options?: { suppressErrors?: boolean }
  ): Promise<{ success: boolean; existing?: boolean; error?: string }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const collection = this.getMilestonesCollection();
      const atlasId = milestone.atlasId;

      console.log(`[MongoDBClient] Upserting milestone to ${this.config.database}.${this.config.collection}: ${atlasId}`);

      if (!atlasId) {
        throw new Error('El milestone no tiene atlasId');
      }

      // Preparar documento con metadatos adicionales
      const document = {
        ...milestone,
        _mongoInsertedAt: new Date(),
        _mongoUpdatedAt: new Date(),
        _mongoVersion: '1.0'
      };

      // Upsert basado en atlasId
      const result = await collection.updateOne(
        { atlasId },
        { $set: document, $setOnInsert: { _mongoCreatedAt: new Date() } },
        { upsert: true }
      );

      const existing = result.upsertedCount === 0;

      this.log(`Milestone ${atlasId} ${existing ? 'actualizado' : 'insertado'} en MongoDB`);

      return {
        success: true,
        existing
      };

    } catch (error: any) {
      const errorMsg = `Error upserting milestone en MongoDB: ${error.message}`;

      if (options?.suppressErrors) {
        this.logError(errorMsg, error);
        return {
          success: false,
          error: error.message
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Busca un milestone por atlasId
   */
  public async findMilestoneByAtlasId(atlasId: string): Promise<any | null> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const collection = this.getMilestonesCollection();
      const result = await collection.findOne({ atlasId });

      return result;
    } catch (error) {
      this.logError(`Error buscando milestone ${atlasId} en MongoDB:`, error);
      return null;
    }
  }

  /**
   * Verifica la salud de la conexión
   */
  public async healthCheck(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const start = Date.now();
      await this.db?.command({ ping: 1 });
      const latency = Date.now() - start;

      return {
        connected: true,
        latency
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Logging centralizado con escritura en archivo
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [MongoDB] ${message}`;

    logger.info(logMessage);
    this.writeToAuditLog(logMessage);
  }

  /**
   * Logging de errores
   */
  private logError(message: string, error: any): void {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] [MongoDB] [ERROR] ${message} ${error.message || error}`;

    logger.error(errorMessage);
    this.writeToAuditLog(errorMessage);
  }

  /**
   * Escribe en el log de auditoría
   */
  private writeToAuditLog(entry: string): void {
    try {
      const logPath = path.join(process.cwd(), 'logs/atlas_audit.log');
      const logDir = path.dirname(logPath);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(logPath, entry + '\n');
    } catch (error) {
      logger.error('Error escribiendo en log de auditoría:', error);
    }
  }
}

// Exportar instancia Singleton
export const mongoDBClient = MongoDBClient.getInstance();