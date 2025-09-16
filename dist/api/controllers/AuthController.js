import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { persistenceService } from '../../core/services/PersistenceService';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
// Mock: Em um sistema real, o accountId viria do subdomínio ou de um passo anterior.
const MOCK_ACCOUNT_ID = 'a2b1f3c5-e8d7-4a6b-9c1d-0f2e3d4c5b6a';
class AuthController {
    async register(req, res) {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
        }
        try {
            const existingAgent = await persistenceService.findAgentByEmail(MOCK_ACCOUNT_ID, email);
            if (existingAgent) {
                return res.status(409).json({ error: 'Email já cadastrado.' });
            }
            const newAgent = await persistenceService.createAgent({
                accountId: MOCK_ACCOUNT_ID,
                name,
                email,
                password_plain: password,
            });
            return res.status(201).json(newAgent);
        }
        catch (error) {
            console.error('Erro no registro:', error);
            return res.status(500).json({ error: 'Falha ao registrar atendente.' });
        }
    }
    async login(req, res) {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
        }
        try {
            const agent = await persistenceService.findAgentByEmail(MOCK_ACCOUNT_ID, email);
            if (!agent) {
                return res.status(401).json({ error: 'Credenciais inválidas.' }); // Usuário não encontrado
            }
            const isPasswordValid = await bcrypt.compare(password, agent.password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Credenciais inválidas.' }); // Senha incorreta
            }
            const tokenPayload = {
                agentId: agent.id,
                accountId: agent.account_id,
                type: agent.type
            };
            const options = { expiresIn: JWT_EXPIRES_IN };
            const token = jwt.sign(tokenPayload, JWT_SECRET, options);
            return res.status(200).json({
                agent: { id: agent.id, name: agent.name, email: agent.email },
                token,
            });
        }
        catch (error) {
            console.error('Erro no login:', error);
            return res.status(500).json({ error: 'Falha ao fazer login.' });
        }
    }
}
export const authController = new AuthController();
//# sourceMappingURL=AuthController.js.map