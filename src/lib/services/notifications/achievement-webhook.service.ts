// Native fetch used instead of discord.js to avoid build errors with zlib-sync
import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import TelegramBotClass from 'node-telegram-bot-api';
import { logger } from '../../utils/logger';

// Inicializar Supabase para preferencias
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '***REMOVED***';

const supabase = createClient(supabaseUrl, supabaseKey);

interface UserPreferences {
    telegram?: boolean;
    telegramChatId?: string;
    telegramUsername?: string;
    discord?: boolean;
    discordWebhookUrl?: string;
    email?: string;
    preferences: {
        batchConfirmed: boolean;
        milestoneAchieved: boolean;
        scoreThreshold: number;
    }
}

interface Batch {
    id: string;
    milestone_ids: string[];
    transaction_hash: string;
    gas_used: number;
    efficiency_score: number;
    confirmed_at: string;
}

export class AchievementWebhookService {
    private static instance: AchievementWebhookService;
    private telegramBot: any | null = null;
    private discordWebhookUrl: string | null = null;

    private constructor() {
        // Initialize clients if tokens exist
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                this.telegramBot = new TelegramBotClass(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            } catch (e) {
                logger.error('Failed to load TelegramBot:', e);
            }
        }

        // Default/System Discord Webhook
        if (process.env.DISCORD_WEBHOOK_URL) {
            this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        }

        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        }
    }

    public static getInstance(): AchievementWebhookService {
        if (!AchievementWebhookService.instance) {
            AchievementWebhookService.instance = new AchievementWebhookService();
        }
        return AchievementWebhookService.instance;
    }

    async getUserNotificationPreferences(userDid: string): Promise<UserPreferences | null> {
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_did', userDid)
            .single();

        if (error || !data) return null;

        // Map DB columns to interface
        return {
            telegram: !!data.telegram_chat_id,
            telegramChatId: data.telegram_chat_id,
            telegramUsername: data.telegram_username,
            discord: !!data.discord_webhook,
            discordWebhookUrl: data.discord_webhook,
            email: data.email,
            preferences: data.preferences
        };
    }

    async upsertNotificationPreferences(userDid: string, prefs: Partial<UserPreferences>): Promise<void> {
        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_did: userDid,
                telegram_username: prefs.telegramUsername,
                email: prefs.email,
                discord_webhook: prefs.discordWebhookUrl,
                preferences: prefs.preferences || { batchConfirmed: true, milestoneAchieved: true, scoreThreshold: 0 },
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_did' });

        if (error) {
            logger.error('❌ Failed to upsert notification preferences:', error.message);
            throw error;
        }
    }

    // Fallback / Mock method if DB table doesn't exist yet
    async getUserNotificationPreferencesMock(userDid: string): Promise<UserPreferences> {
        // In a real scenario, fetch from DB. For now, we define structure.
        return {
            telegram: false,
            discord: false,
            email: undefined,
            preferences: { batchConfirmed: true, milestoneAchieved: true, scoreThreshold: 0 }
        };
    }

    async notifyBatchConfirmation(batch: Batch, userDid: string): Promise<void> { // userDid passed for context, though batch has many users
        // Logic: In a real batch, we'd notify ALL users in the batch. 
        // Here we simulate notifying a specific user for the demo.

        // 1. Obtener preferencias (Mocking payload for now)
        // const userPrefs = await this.getUserNotificationPreferences(userDid);

        // DEMO: We will assume we send to system channels if configured, or log if not.
        logger.info(`🔔 Preparing notification for ${userDid} regarding Batch ${batch.id}`);

        const message = this.buildAchievementMessage(batch, userDid);

        // 2. Telegram
        if (this.telegramBot && process.env.TELEGRAM_TEST_CHAT_ID) { // Send to a test group/user for demo
            try {
                await this.telegramBot.sendMessage(
                    process.env.TELEGRAM_TEST_CHAT_ID,
                    message.telegram,
                    { parse_mode: 'HTML' }
                );
                logger.info('✅ Telegram sent');
            } catch (e) {
                logger.error('❌ Telegram failed', e);
            }
        }

        // 3. Discord
        if (this.discordWebhookUrl) {
            try {
                await this.notifyDiscord(this.discordWebhookUrl, {
                    title: '🎉 Logro Andromeda Confirmado!',
                    description: message.discord,
                    color: 0x6366f1,
                    timestamp: batch.confirmed_at,
                    content: `Notification for <${userDid}>`
                });
                logger.info('✅ Discord notification sent');
            } catch (e) {
                logger.error('❌ Discord failed', e);
            }
        }

        // 4. Email
        if (process.env.SENDGRID_API_KEY && process.env.TEST_EMAIL_RECIPIENT) {
            try {
                await sgMail.send({
                    to: process.env.TEST_EMAIL_RECIPIENT,
                    from: process.env.SENDGRID_FROM_EMAIL || 'notifications@andromeda.computer',
                    subject: '🎉 Tu hito ha sido inmortalizado en Vara Network!',
                    html: message.email,
                    text: message.text
                });
                logger.info('✅ Email sent');
            } catch (e) {
                logger.error('❌ Email failed', e);
            }
        }
    }

    private buildAchievementMessage(batch: Batch, userDid: string) {
        const milestoneCount = batch.milestone_ids.length;
        const transactionUrl = `https://vara.subscan.io/transaction/${batch.transaction_hash}`;
        const explorerUrl = transactionUrl;
        const formatGas = (g: number) => `${(g / 1_000_000_000).toFixed(4)} TVARA`; // Simple format

        return {
            text: `Andromeda Core: ${milestoneCount} hitos confirmados en batch ${batch.id}. TX: ${batch.transaction_hash}`,
            telegram: `
🎖️ <b>Logro Andromeda Confirmado!</b>

✅ <b>${milestoneCount} hitos</b> inmortalizados en Vara Network
📊 <b>Transacción:</b> <a href="${transactionUrl}">${batch.transaction_hash.slice(0, 16)}...</a>
⛽ <b>Gas utilizado:</b> ${formatGas(batch.gas_used)}
🏆 <b>Eficiencia:</b> ${batch.efficiency_score.toFixed(2)} hitos/gas

<i>Tu reputación en Web3 acaba de aumentar permanentemente.</i>
      `,
            discord: `**${milestoneCount} hitos** inmortalizados en Vara Network\n**TX:** [${batch.transaction_hash.slice(0, 66)}](${transactionUrl})\n**Gas:** ${formatGas(batch.gas_used)}\n**Eff:** ${batch.efficiency_score.toFixed(2)}`,
            email: `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #6366f1;">🎉 Logro Confirmado en Andromeda Core</h2>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
    <p><strong>${milestoneCount} hitos</strong> han sido confirmados en blockchain.</p>
    
    <div style="margin: 20px 0;">
      <a href="${transactionUrl}" 
         style="background: #6366f1; color: white; padding: 10px 20px; 
                text-decoration: none; border-radius: 5px;">
        🔍 Ver Transacción en Explorer
      </a>
    </div>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td>📊 Hash:</td><td><code>${batch.transaction_hash}</code></td></tr>
      <tr><td>⛽ Gas:</td><td>${formatGas(batch.gas_used)}</td></tr>
      <tr><td>📅 Fecha:</td><td>${new Date(batch.confirmed_at).toLocaleDateString()}</td></tr>
    </table>
  </div>
  
  <p style="color: #64748b; font-size: 14px;">
    Este es un logro permanente en tu historial de reputación Web3.
  </p>
</div>
      `
        };
    }
    public async notifyGenericSuccess(title: string, content: string, userDid?: string): Promise<void> {
        logger.info(`🔔 Sending generic notification: ${title}`);

        // 1. Telegram (System/Test Channel)
        if (this.telegramBot && process.env.TELEGRAM_TEST_CHAT_ID) {
            try {
                await this.telegramBot.sendMessage(
                    process.env.TELEGRAM_TEST_CHAT_ID,
                    `<b>${title}</b>\n\n${content}${userDid ? `\n\n<i>Operator: ${userDid}</i>` : ''}`,
                    { parse_mode: 'HTML' }
                );
            } catch (e) {
                logger.error('❌ Telegram notifyGenericSuccess failed:', e);
            }
        }

        // 2. Discord (System Webhook)
        if (this.discordWebhookUrl) {
            try {
                await this.notifyDiscord(this.discordWebhookUrl, {
                    title: title,
                    description: content,
                    color: 0x00f0ff,
                    content: userDid ? `User: ${userDid}` : undefined
                });
            } catch (e) {
                logger.error('❌ Discord notifyGenericSuccess failed:', e);
            }
        }
    }

    /**
     * Helper to send Discord Webhook notifications using native fetch
     */
    private async notifyDiscord(url: string, options: {
        title: string;
        description: string;
        color?: number;
        content?: string;
        timestamp?: string;
    }): Promise<void> {
        const payload = {
            content: options.content,
            embeds: [{
                title: options.title,
                description: options.description,
                color: options.color || 0x00f0ff,
                timestamp: options.timestamp || new Date().toISOString()
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Discord API error (${response.status}): ${errorText}`);
        }
    }
}

export const achievementWebhookService = AchievementWebhookService.getInstance();
