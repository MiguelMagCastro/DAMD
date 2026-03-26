import express from 'express';
import db from '../config/database.js';
import { newId } from '../config/uuid.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roles.js';

const router = express.Router();

/**
 * @openapi
 * /api/orders/ping:
 *   get:
 *     summary: Verifica se as rotas de pedidos estão funcionando
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: Rotas de pedidos OK
 */
router.get('/ping', (_req, res) => {
    return res.json({
        success: true,
        message: 'Rotas de pedidos OK.',
    });
});

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: Lista pedidos
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos retornada com sucesso
 *       401:
 *         description: Não autenticado
 */
router.get('/', authenticate, (req, res) => {
    try {
        let orders;

        if (req.user.role === 'lojista') {
            orders = db.prepare(`
        SELECT *
        FROM orders
        WHERE lojista_id = ?
        ORDER BY created_at DESC
      `).all(req.user.id);
        } else {
            orders = db.prepare(`
        SELECT *
        FROM orders
        ORDER BY created_at DESC
      `).all();
        }

        return res.json({
            success: true,
            data: orders,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao listar pedidos.',
            error: error.message,
        });
    }
});

/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Cria um novo pedido
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup_address
 *               - delivery_address
 *               - description
 *               - value
 *             properties:
 *               pickup_address:
 *                 type: string
 *                 example: Rua A, 100 - Centro
 *               delivery_address:
 *                 type: string
 *                 example: Rua B, 200 - Savassi
 *               description:
 *                 type: string
 *                 example: Entrega de documento
 *               value:
 *                 type: number
 *                 example: 25.5
 *     responses:
 *       201:
 *         description: Pedido criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado
 */
router.post('/', authenticate, authorizeRoles('lojista'), (req, res) => {
    try {
        const {
            pickup_address,
            delivery_address,
            description,
            value,
        } = req.body;

        if (!pickup_address || !delivery_address || !description || value == null) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios: pickup_address, delivery_address, description e value.',
            });
        }

        const orderId = newId();

        db.prepare(`
      INSERT INTO orders (
        id, lojista_id, pickup_address, delivery_address, description, value, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'disponivel')
    `).run(
            orderId,
            req.user.id,
            pickup_address,
            delivery_address,
            description,
            value
        );

        db.prepare(`
      INSERT INTO order_history (
        id, order_id, status, changed_by, note
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
            newId(),
            orderId,
            'disponivel',
            req.user.id,
            'Pedido criado pelo lojista.'
        );

        const order = db.prepare(`
      SELECT *
      FROM orders
      WHERE id = ?
    `).get(orderId);

        return res.status(201).json({
            success: true,
            message: 'Pedido criado com sucesso.',
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao criar pedido.',
            error: error.message,
        });
    }
});

/**
 * @openapi
 * /api/orders/{id}/accept:
 *   post:
 *     summary: Permite que um entregador aceite um pedido disponível
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Pedido aceito com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Pedido não encontrado
 *       409:
 *         description: Pedido já aceito ou indisponível
 */
router.post('/:id/accept', authenticate, authorizeRoles('entregador'), (req, res) => {
    try {
        const acceptOrderTransaction = db.transaction((orderId, entregadorId) => {
            const order = db.prepare(`
        SELECT *
        FROM orders
        WHERE id = ?
      `).get(orderId);

            if (!order) {
                return {
                    status: 404,
                    body: {
                        success: false,
                        message: 'Pedido não encontrado.',
                    },
                };
            }

            if (order.status !== 'disponivel') {
                return {
                    status: 409,
                    body: {
                        success: false,
                        message: `Pedido não disponível. Status atual: ${order.status}`,
                    },
                };
            }

            const acceptedAt = new Date().toISOString();

            db.prepare(`
        UPDATE orders
        SET entregador_id = ?,
            status = 'aceito',
            accepted_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(entregadorId, acceptedAt, acceptedAt, orderId);

            db.prepare(`
        INSERT INTO order_history (
          id, order_id, status, changed_by, note
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
                newId(),
                orderId,
                'aceito',
                entregadorId,
                'Pedido aceito pelo entregador.'
            );

            const updatedOrder = db.prepare(`
        SELECT *
        FROM orders
        WHERE id = ?
      `).get(orderId);

            return {
                status: 200,
                body: {
                    success: true,
                    message: 'Pedido aceito com sucesso!',
                    data: updatedOrder,
                },
            };
        });

        const result = acceptOrderTransaction.immediate(req.params.id, req.user.id);
        return res.status(result.status).json(result.body);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao aceitar pedido.',
            error: error.message,
        });
    }
});

export default router;