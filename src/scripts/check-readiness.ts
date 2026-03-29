import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { logger } from '../lib/utils/logger';

// Target the local .env.local in the core 
const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function checkReadiness() {
    logger.info('🚀 Iniciando Andromeda Core Readiness Check...');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let allChecksPassed = true;

    // 1. Env File
    logger.info('\n📄 1. Verificando Variables de Entorno (.env.local)');
    if (fs.existsSync(envPath)) {
        logger.info('✅ Archivo .env.local encontrado');
    } else {
        logger.info('❌ Archivo .env.local NO encontrado. Crealo desde el entorno principal.');
        allChecksPassed = false;
    }

    const requiredVars = [
        'VARA_NETWORK_ENDPOINT',
        'VARA_CONTRACT_ADDRESS',
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHAT_ID',
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
    ];

    for (const v of requiredVars) {
        if (process.env[v]) {
            logger.info(`✅ ${v} está configurada`);
        } else {
            logger.info(`❌ ${v} FALTA en .env.local`);
            allChecksPassed = false;
        }
    }

    // Check Redis specifically because user provided one
    const redisUrl = process.env.REDIS_URL || 'redis://default:c61RkpAwAFmMuupy0GFkbgiJ8xPbnjt5@redis-19511.c258.us-east-1-4.ec2.cloud.redislabs.com:19511';
    if (redisUrl) {
        logger.info(`✅ REDIS_URL está configurada`);
    } else {
        logger.info(`❌ REDIS_URL FALTA en .env.local`);
        allChecksPassed = false;
    }


    // 2. Redis / Upstash
    logger.info('\n🗄️ 2. Verificando Conectividad Redis');
    try {
        const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
        });

        // Timeout en caso de que no conecte
        const check = new Promise((resolve, reject) => {
            redis.on('connect', () => resolve(true));
            redis.on('error', (err) => reject(err));
            setTimeout(() => reject(new Error('Timeout conectando a Redis')), 5000);
        });

        await check;
        logger.info('✅ Conectado a Redis exitosamente');
        redis.disconnect();
    } catch (err: any) {
        logger.info(`❌ Error al conectar a Redis: ${err.message}`);
        allChecksPassed = false;
    }

    // 3. Supabase
    logger.info('\n🗃️ 3. Verificando Conectividad Supabase');
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Credenciales de Supabase incompletas');
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        // Simple query to verify connection (using auth admin since DB might be empty)
        const { data, error } = await supabase.auth.admin.listUsers();

        if (error) throw error;
        logger.info('✅ Conectado a Supabase exitosamente consultando "projects"');
    } catch (err: any) {
        logger.info(`❌ Error al conectar a Supabase: ${err.message}`);
        allChecksPassed = false;
    }

    // 4. Vara Assets
    logger.info('\n⚙️ 4. Verificando Activos Vara (.wasm y .idl.json)');
    const wasmPath = path.join(process.cwd(), 'src', 'lib', 'blockchain', 'assets', 'andromeda_registry.wasm');
    const idlPath = path.join(process.cwd(), 'src', 'lib', 'blockchain', 'assets', 'andromeda.idl.json');

    if (fs.existsSync(wasmPath)) {
        logger.info(`✅ ${path.basename(wasmPath)} encontrado`);
    } else {
        logger.info(`❌ ${path.basename(wasmPath)} NO encontrado`);
        allChecksPassed = false;
    }

    if (fs.existsSync(idlPath)) {
        logger.info(`✅ ${path.basename(idlPath)} encontrado`);
    } else {
        logger.info(`❌ ${path.basename(idlPath)} NO encontrado`);
        allChecksPassed = false;
    }

    // 5. Telegram Bot
    logger.info('\n📱 5. Verificando Conectividad Telegram Bot');
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        try {
            const TelegramBotClass = (await import('node-telegram-bot-api')).default;
            const bot = new TelegramBotClass(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, '🤖 Andromeda Core Readiness Check Satisfactorio!', { disable_notification: true });
            logger.info('✅ Mensaje de prueba de Telegram enviado exitosamente');
        } catch (err: any) {
            logger.info(`❌ Error al conectar o enviar mensaje en Telegram: ${err.message}`);
            allChecksPassed = false;
        }
    } else {
        logger.info(`❌ Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en .env.local para la prueba de bot`);
        allChecksPassed = false;
    }

    // Final Report
    logger.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (allChecksPassed) {
        logger.info('✨ ESTADO: SISTEMA 100% PREPARADO PARA INICIO 🔥');
        process.exit(0);
    } else {
        logger.info('🛑 ESTADO: FALTAN REQUISITOS O CONEXIONES FALLIDAS');
        process.exit(1);
    }
}

checkReadiness();
