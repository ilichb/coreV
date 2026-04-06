
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = '8460282849:AAH0uk3D6IorxTvQvZnmWKFOOgpf8jxBVEc';
const chatId = '332657190';

const bot = new TelegramBot(token, { polling: false });

async function test() {
    console.log('--- Testing Telegram Connection ---');
    console.log('Bot:', '@AndromedaCrossDAO_bot');
    console.log('Chat ID:', chatId);
    
    try {
        const msg = await bot.sendMessage(
            chatId, 
            `🛠️ <b>PRUEBA DE CONEXIÓN</b>\n\nHola Ilich, si estás leyendo esto, las credenciales del bot en el archivo .env son <b>CORRECTAS</b>.\n\n#AndromedaAudit #Diagnostic`,
            { parse_mode: 'HTML' }
        );
        console.log('✅ Message sent successfully!');
        console.log('Message ID:', msg.message_id);
    } catch (e) {
        console.error('❌ FAILED to send message:');
        console.error(e.message);
        if (e.message.includes('403')) {
            console.log('\nTIP: Haz clic en el bot y dale a "START" si no lo has hecho.');
        }
    }
}

test();
