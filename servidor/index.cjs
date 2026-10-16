const banco = require('./banco.cjs')
const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const prepararBanco = require('./schema.cjs')
const criarApp = require('./app.cjs')
const { randomBytes } = require('node:crypto')
const { readFileSync, appendFileSync } = require('node:fs')
const { join } = require('node:path')

async function iniciar() {
  // Gera a chave local uma vez, sem exibi-la no terminal.
  if (!process.env.SESSION_SECRET) {
    if (process.env.NODE_ENV === 'production') throw new Error('Configure SESSION_SECRET no ambiente de produção.')
    const caminho = join(__dirname, '.env')
    const conteudo = readFileSync(caminho, 'utf8')
    process.env.SESSION_SECRET = randomBytes(48).toString('hex')
    appendFileSync(caminho, `${conteudo.endsWith('\n') ? '' : '\n'}SESSION_SECRET=${process.env.SESSION_SECRET}\n`)
  }
  await prepararBanco(banco)
  const store = new MySQLStore({ createDatabaseTable: true }, banco)
  await store.onReady()
  const app = criarApp({ banco, store, secret: process.env.SESSION_SECRET })
  const servidor = app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log('Servidor em http://localhost:' + (process.env.PORT || 3001)))
  servidor.on('error', (erro) => {
    console.error(erro.code === 'EADDRINUSE' ? 'A porta já está em uso. Pare o servidor antigo com Ctrl+C e tente novamente.' : erro.code)
    process.exit(1)
  })
}
iniciar().catch((erro) => {
  console.error('Não foi possível iniciar:', erro.code || erro.message)
  process.exit(1)
})
