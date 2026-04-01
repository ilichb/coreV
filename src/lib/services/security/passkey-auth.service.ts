import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { redisService } from '../../infrastructure/redis';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

export class PasskeyAuthService {
    private static instance: PasskeyAuthService;
    private _supabase: any = null;

    private static readonly RP_NAME = 'Andromeda Core';
    private static readonly RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
    private static readonly ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    private constructor() { }

    private get supabase() {
        if (!this._supabase) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
            this._supabase = createClient(url, key);
        }
        return this._supabase;
    }

    public static getInstance(): PasskeyAuthService {
        if (!PasskeyAuthService.instance) {
            PasskeyAuthService.instance = new PasskeyAuthService();
        }
        return PasskeyAuthService.instance;
    }

    /**
     * 1. Generar opciones de registro (Challenge)
     */
    async generateRegistrationOptions(userDid: string) {
        // Buscar credenciales existentes para evitar duplicados
        const userPasskeys = await this.getUserPasskeys(userDid);

        const options = await generateRegistrationOptions({
            rpName: PasskeyAuthService.RP_NAME,
            rpID: PasskeyAuthService.RP_ID,
            userName: userDid,
            attestationType: 'none', // Direct suele dar problemas de privacidad, None es standard
            excludeCredentials: userPasskeys.map(key => ({
                id: key.credential_id,
                transports: key.transports,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', // TouchID/FaceID preferido
            },
        });

        // Guardar challenge en Redis (TTL 2 min)
        await redisService.set(
            `webauthn:reg:${userDid}`,
            JSON.stringify({ challenge: options.challenge }),
            120
        );

        return options;
    }

    /**
     * 2. Verificar respuesta de registro
     */
    async verifyRegistration(userDid: string, body: any, userAgent: string) {
        const storedData = await redisService.get(`webauthn:reg:${userDid}`);
        if (!storedData) {
            throw new Error('Challenge expired or not found');
        }

        const { challenge } = JSON.parse(storedData);

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge: challenge,
                expectedOrigin: PasskeyAuthService.ORIGIN,
                expectedRPID: PasskeyAuthService.RP_ID,
            });
        } catch (e) {
            logger.error('WebAuthn Verification Failed:', e);
            throw new Error('Verification failed');
        }

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = verification.registrationInfo as any;

            // Guardar en DB
            const { error } = await this.supabase.from('user_passkeys').insert({
                user_did: userDid,
                credential_id: Buffer.from(credentialID).toString('base64url'),
                public_key: Buffer.from(credentialPublicKey).toString('base64url'),
                counter,
                device_name: this.parseUserAgent(userAgent),
                transports: body.response.transports || [],
            });

            if (error) throw error;

            // Limpiar challenge
            await redisService.del(`webauthn:reg:${userDid}`);

            return { verified: true, credentialID: (verification.registrationInfo as any).credentialID };
        }

        return { verified: false };
    }

    /**
     * 3. Generar opciones de autenticación (Login/Sign)
     */
    async generateAuthenticationOptions(userDid: string) {
        const userPasskeys = await this.getUserPasskeys(userDid);

        const options = await generateAuthenticationOptions({
            rpID: PasskeyAuthService.RP_ID,
            allowCredentials: userPasskeys.map(key => ({
                id: key.credential_id,
                transports: key.transports,
            })),
            userVerification: 'preferred',
        });

        // Guardar challenge en Redis
        await redisService.set(
            `webauthn:auth:${userDid}`,
            JSON.stringify({ challenge: options.challenge }),
            120
        );

        return options;
    }

    /**
     * 4. Verificar firma / autenticación
     */
    async verifyAuthentication(userDid: string, body: any) {
        const storedData = await redisService.get(`webauthn:auth:${userDid}`);
        if (!storedData) {
            throw new Error('Challenge expired');
        }
        const { challenge } = JSON.parse(storedData);

        const dbPasskey = await this.getPasskeyById(body.id); // Buscar por ID de credencial devuelto
        if (!dbPasskey) throw new Error('Credential not found');

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge: challenge,
                expectedOrigin: PasskeyAuthService.ORIGIN,
                expectedRPID: PasskeyAuthService.RP_ID,
                authenticator: {
                    credentialPublicKey: this.base64UrlToBuffer(dbPasskey.public_key),
                    credentialID: this.base64UrlToBuffer(dbPasskey.credential_id),
                    counter: dbPasskey.counter,
                },
            } as any);
        } catch (e) {
            logger.error('Auth verification failed', e);
            throw e;
        }

        if (verification.verified) {
            const { authenticationInfo } = verification;

            // Actualizar contador para evitar replay attacks
            await this.supabase
                .from('user_passkeys')
                .update({
                    counter: authenticationInfo.newCounter,
                    last_used_at: new Date().toISOString()
                })
                .eq('credential_id', dbPasskey.credential_id);

            await redisService.del(`webauthn:auth:${userDid}`);
            return { verified: true };
        }

        return { verified: false };
    }

    // --- Helpers ---

    private async getUserPasskeys(userDid: string): Promise<any[]> {
        const { data } = await this.supabase
            .from('user_passkeys')
            .select('*')
            .eq('user_did', userDid);
        return data || [];
    }

    private async getPasskeyById(credentialId: string): Promise<any> {
        // credentialId viene del frontend como base64url string generalmente
        const { data } = await this.supabase
            .from('user_passkeys')
            .select('*')
            .eq('credential_id', credentialId)
            .single();
        return data;
    }

    private parseUserAgent(ua: string): string {
        if (ua.includes('iPhone')) return 'iPhone Passkey';
        if (ua.includes('Macintosh')) return 'Mac Passkey';
        if (ua.includes('Windows')) return 'Windows Hello';
        if (ua.includes('Android')) return 'Android Passkey';
        return 'Unknown Device';
    }

    private base64UrlToBuffer(base64url: string): Uint8Array {
        const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
        const base64 = (base64url + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        return Uint8Array.from(Buffer.from(base64, 'base64'));
    }
}

export const passkeyAuthService = PasskeyAuthService.getInstance();
