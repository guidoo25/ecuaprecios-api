const { Pool } = require('pg');
const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, DB_PORT } = require('../const/config');

const pool = new Pool({
    user: DB_USER,
    host: DB_HOST,
    database: DB_DATABASE,
    password: DB_PASSWORD,
    port: DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;