require('dotenv').config()
const mysql = require('mysql2/promise')

async function testarConexao() {
  let conexao

  try {
    conexao = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })

    console.log('Conectado ao MySQL!')
    const [usuarios] = await conexao.query('SELECT id, nome, email FROM usuarios')
    console.table(usuarios)
  } catch (erro) {
    console.error('Falha na conexão:', erro.code)
  } finally {
    if (conexao) {
      await conexao.end()
    }
  }
}

testarConexao()