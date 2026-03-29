import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { pinata } from '@/lib/services/storage/pinata'; // Assuming pinata service exists
import { keccak256, toHex } from 'viem';
import { logger } from '../../utils/logger';

export class ReputationPDFService {
    private static instance: ReputationPDFService;

    private constructor() { }

    public static getInstance(): ReputationPDFService {
        if (!ReputationPDFService.instance) {
            ReputationPDFService.instance = new ReputationPDFService();
        }
        return ReputationPDFService.instance;
    }

    /**
     * Genera un PDF verificable con los datos de reputación del usuario.
     * @param userDid DID del usuario
     * @param reputationData Datos completos de reputación
     */
    async generateVerifiablePDF(userDid: string, reputationData: any): Promise<{ pdfBuffer: Buffer, verificationHash: string, ipfsCid: string }> {
        // 1. Generar hash de verificación (contenido canónico)
        const verificationPayload = {
            userDid,
            score: reputationData.totalScore,
            tier: reputationData.tier,
            generatedAt: new Date().toISOString()
        };
        const verificationHash = keccak256(toHex(JSON.stringify(verificationPayload)));

        // 2. Crear URL de verificación
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://andromeda.computer';
        const verifyUrl = `${appUrl}/verify/${verificationHash}`;

        // 3. Generar QR Code
        const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl);

        // 4. Crear PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();

        // Fuentes
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Cargar Header (Si existe en fs, o usar placeholder)
        // En un entorno edge/serverless esto puede requerir fetch
        // Por ahora asumimos que se pasa o se carga de public via fetch si es necesario
        // Para simplificar, dibujamos texto, el usuario pondrá la imagen luego.

        // Título
        page.drawText('Andromeda Reputation Snapshot', {
            x: 50,
            y: height - 50,
            size: 24,
            font: fontBold,
            color: rgb(0, 0, 0),
        });

        // Datos del Usuario
        page.drawText(`DID: ${userDid}`, { x: 50, y: height - 100, size: 12, font });
        page.drawText(`Tier: ${reputationData.tier}`, { x: 50, y: height - 120, size: 12, font: fontBold });
        page.drawText(`Total Score: ${reputationData.totalScore}`, { x: 50, y: height - 140, size: 12, font });

        // Hash
        page.drawText(`Verification Hash: ${verificationHash}`, { x: 50, y: 100, size: 8, font, color: rgb(0.5, 0.5, 0.5) });

        // QR Code
        const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
        const qrDims = qrImage.scale(0.5);
        page.drawImage(qrImage, {
            x: width - qrDims.width - 50,
            y: 50,
            width: qrDims.width,
            height: qrDims.height,
        });

        // 5. Serializar PDF
        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        // 6. Guardar metadata en IPFS (Pinata)
        // Asumimos que pinata tiene un método pinJSON
        // Si no existe el servicio, esto fallará, ajustar según implementación real
        let ipfsCid = '';
        try {
            // Mock implementation if pinata service not fully ready
            // ipfsCid = await pinata.pinJSON({ ...verificationPayload, verificationHash });
            logger.info('IPFS Pinning skipped for prototype');
            ipfsCid = 'QmMockHash';
        } catch (e) {
            logger.warn('IPFS Pin failed', e);
        }

        return {
            pdfBuffer,
            verificationHash,
            ipfsCid
        };
    }
}

export const reputationPDFService = ReputationPDFService.getInstance();
