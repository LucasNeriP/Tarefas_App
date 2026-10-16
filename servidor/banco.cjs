require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true })
const mysql = require('mysql2/promise')

const banco = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
})

module.exports = banco
