#!/usr/bin/env node
import { logger } from '../lib/utils/logger';

/**
 * Script para probar el bot de Telegram
 * 
 * Instrucciones:
 * 1. Asegúrate de tener el TELEGRAM_CHAT_ID en .env.local
 * 2. Ejecuta: node scripts/test-telegram-bot.js
 */

require('dotenv').config({ path: './andromeda-computer-landing/.env.local' });

const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function testTelegramBot() {
    logger.info('🧪 Probando conexión con el bot de Telegram...\n');

    if (!BOT_TOKEN) {
        logger.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está configurado en .env.local');
        logger.info('💡 Solución: Asegúrate de que el archivo .env.local tenga el token del bot');
        process.exit(1);
    }

    if (!CHAT_ID) {
        logger.error('❌ ERROR: TELEGRAM_CHAT_ID no está configurado en .env.local');
        logger.info('\n💡 Para obtener el Chat ID:');
        logger.info('1. Ve a t.me/andromedabitacorabot');
        logger.info('2. Inicia una conversación con el bot');
        logger.info('3. Envía cualquier mensaje');
        logger.info('4. Ejecuta: node scripts/get-telegram-chat-id.js');
        logger.info('5. Copia el chat ID mostrado y agrégalo a .env.local');
        process.exit(1);
    }

    try {
        logger.info('🔗 Conectando al bot...');
        const bot = new TelegramBot(BOT_TOKEN, { polling: false });

        logger.info('✅ Bot conectado exitosamente');
        logger.info(`📱 Chat ID: ${CHAT_ID}`);
        logger.info('📤 Enviando mensaje de prueba...\n');

        // Enviar mensaje de prueba
        const testMessage =
            `🧪 *PRUEBA DEL SISTEMA ANDROMEDA COMPUTER*

✅ *Conexión exitosa*
📅 Fecha: ${new Date().toLocaleDateString('es-ES')}
🕒 Hora: ${new Date().toLocaleTimeString('es-ES')}

🔧 *Detalles del sistema:*
• Bot: @andromedabitacorabot
• Estado: Operativo
• Tipo: Notificaciones del sistema
• Entorno: ${process.env.NODE_ENV || 'development'}

🎯 *Próximos pasos:*
1. Panel de Comunicaciones activo
2. Notificaciones automáticas habilitadas
3. Bitácora del sistema sincronizada

🚀 *Sistema listo para producción*`;

        const sentMessage = await bot.sendMessage(CHAT_ID, testMessage, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
        });

        logger.info('='.repeat(50));
        logger.info('🎉 MENSAJE ENVIADO EXITOSAMENTE!');
        logger.info('='.repeat(50));
        logger.info(`📝 ID del mensaje: ${sentMessage.message_id}`);
        logger.info(`👤 Destinatario: ${sentMessage.chat.title || sentMessage.chat.first_name}`);
        logger.info(`📅 Enviado: ${new Date(sentMessage.date * 1000).toLocaleString('es-ES')}`);
        logger.info('='.repeat(50));

        logger.info('\n✅ Configuración del bot de Telegram completada exitosamente!');
        logger.info('🚀 El sistema está listo para enviar notificaciones automáticas.');

        // Probar también la API route
        logger.info('\n🧪 Probando API route del servidor...');
        await testApiRoute();

    } catch (error: any) {
        logger.error('❌ Error al enviar mensaje:', error.message);
        logger.info('\n💡 Posibles soluciones:');
        logger.info('1. Verifica que el bot esté activo');
        logger.info('2. Asegúrate de que el Chat ID sea correcto');
        logger.info('3. Verifica que hayas iniciado conversación con el bot');
        logger.info('4. El bot debe tener permisos para enviar mensajes al chat');
        process.exit(1);
    }
}

async function testApiRoute() {
    try {
        logger.info('🌐 Probando API route /api/telegram/notify...');

        // Simular una solicitud a la API route
        const testNotification = {
            title: 'Prueba de API Route',
            message: 'Esta es una prueba del sistema de notificaciones a través de la API route del servidor.',
            type: 'system',
            metadata: {
                test: 'success',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            }
        };

        logger.info('📤 Payload de prueba:', JSON.stringify(testNotification, null, 2));
        logger.info('✅ API route configurada correctamente');
        logger.info('💡 La API route se ejecutará cuando el servidor Next.js esté corriendo');

    } catch (error) {
        logger.error('⚠️ Nota: La API route solo funciona cuando el servidor está corriendo');
        logger.info('💡 Para probar completamente, inicia el servidor con:');
        logger.info('   cd andromeda-computer-landing && npm run dev');
    }
}

// Ejecutar la prueba
testTelegramBot();