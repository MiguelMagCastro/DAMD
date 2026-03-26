import { createRequire } from 'module';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import db from './config/database.js';
import { initDatabase } from './database/init.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';

const require = createRequire(import.meta.url);
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

initDatabase();

const app = express();

app.use(helmet());
app.use(cors());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
  },
}));

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      user: req.user?.username || 'anonymous',
    }));
  });

  next();
});

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LogiTrack API V1 — Monolito (SQLite / ESM)',
      version: '1.0.0',
      description: `
## LogiTrack — Plataforma de Logística de Bairro

**Sprint 1: Monolito com SQLite e Pessimistic Locking (BEGIN IMMEDIATE)**

### Como testar o controle de concorrência:
1. Crie um pedido como Lojista
2. Tente aceitar o mesmo pedido com múltiplos tokens de Entregador simultaneamente
3. Apenas um deve ter sucesso (HTTP 200); os outros devem receber HTTP 409

### Diferença em relação à versão PostgreSQL:
- PostgreSQL usa \`SELECT ... FOR UPDATE\` — lock por linha
- SQLite usa \`BEGIN IMMEDIATE\` — lock por banco
- A corretude é a mesma; a granularidade e o throughput diferem
      `,
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'],
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    return res.json({
      status: 'healthy',
      database: 'sqlite',
      mode: 'WAL',
    });
  } catch {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
    });
  }
});

app.get('/', (_req, res) => {
  return res.json({
    success: true,
    message: 'API LogiTrack V1 rodando com sucesso.',
    docs: 'http://localhost:3001/docs',
    health: 'http://localhost:3001/health',
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LogiTrack V1 (SQLite/ESM) iniciado na porta ${PORT}`);
  console.log(`Docs:   http://localhost:${PORT}/docs`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;