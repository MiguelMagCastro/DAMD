import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(
    join(__dirname, '..', 'logitrack.db'),
    {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
    }
);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;