import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Token não informado ou inválido.',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = db.prepare(`
      SELECT id, email, username, full_name, role, active
      FROM users
      WHERE id = ?
    `).get(decoded.id);

        if (!user || user.active !== 1) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado ou inativo.',
            });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado.',
        });
    }
}