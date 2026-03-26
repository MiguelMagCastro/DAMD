import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { newId } from '../config/uuid.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/ping:
 *   get:
 *     summary: Verifica se as rotas de autenticação estão funcionando
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Rotas de autenticação OK
 */
router.get('/ping', (_req, res) => {
    return res.json({
        success: true,
        message: 'Rotas de autenticação OK.',
    });
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *               - full_name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 example: lojista1@teste.com
 *               username:
 *                 type: string
 *                 example: lojista1
 *               password:
 *                 type: string
 *                 example: 123456
 *               full_name:
 *                 type: string
 *                 example: Lojista Teste
 *               role:
 *                 type: string
 *                 enum: [lojista, entregador]
 *                 example: lojista
 *               phone:
 *                 type: string
 *                 example: 31999999999
 *               vehicle:
 *                 type: string
 *                 example: Moto
 *               store_name:
 *                 type: string
 *                 example: Loja Bairro Centro
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email ou username já cadastrado
 */
router.post('/register', async (req, res) => {
    try {
        const {
            email,
            username,
            password,
            full_name,
            role,
            phone = null,
            vehicle = null,
            store_name = null,
        } = req.body;

        if (!email || !username || !password || !full_name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: email, username, password, full_name e role.',
            });
        }

        if (!['lojista', 'entregador'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role inválido. Use lojista ou entregador.',
            });
        }

        const existingUser = db.prepare(`
      SELECT id
      FROM users
      WHERE email = ? OR username = ?
    `).get(email, username);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email ou username já cadastrado.',
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const id = newId();

        db.prepare(`
      INSERT INTO users (
        id, email, username, password, full_name, role, phone, vehicle, store_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            id,
            email,
            username,
            passwordHash,
            full_name,
            role,
            phone,
            vehicle,
            store_name
        );

        return res.status(201).json({
            success: true,
            message: 'Usuário cadastrado com sucesso.',
            data: {
                id,
                email,
                username,
                full_name,
                role,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao cadastrar usuário.',
            error: error.message,
        });
    }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Realiza login e retorna um token JWT
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: lojista1@teste.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e password são obrigatórios.',
            });
        }

        const user = db.prepare(`
      SELECT *
      FROM users
      WHERE email = ?
    `).get(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas.',
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas.',
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({
            success: true,
            message: 'Login realizado com sucesso.',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao realizar login.',
            error: error.message,
        });
    }
});

export default router;