import { whatsappService } from '../../core/services/WhatsappService';
class AccountController {
    async initialize(req, res) {
        const { accountId } = req.params;
        if (!accountId) {
            return res.status(400).json({ error: 'accountId é obrigatório.' });
        }
        // A inicialização é assíncrona, mas não queremos que o cliente espere.
        // Disparamos a inicialização e retornamos uma resposta imediata.
        // O cliente então deve fazer polling no endpoint de QR code.
        whatsappService.initializeClient(accountId);
        return res.status(202).json({
            message: 'Inicialização da conta iniciada. Por favor, requisite o QR code em breve.',
        });
    }
    async getQRCode(req, res) {
        const { accountId } = req.params;
        const qrCodeImage = await whatsappService.getQRCode(accountId);
        if (qrCodeImage) {
            const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, "");
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            });
            res.end(img);
        }
        else {
            // Erro comum: O cliente pede o QR code antes dele ser gerado ou depois da conexão.
            // Uma boa resposta informa ao cliente o que pode ter acontecido.
            res.status(404).json({ error: 'QR Code não encontrado. A conta pode já estar conectada ou ainda não foi inicializada.' });
        }
    }
}
export const accountController = new AccountController();
//# sourceMappingURL=AccountController.js.map