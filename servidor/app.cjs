const express = require('express')
const session = require('express-session')
const { rateLimit } = require('express-rate-limit')
const argon2 = require('argon2')
const { randomUUID } = require('node:crypto')

function criarApp({ banco, store, secret }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    // O cliente envia este cabeçalho. Não liberamos CORS para sites externos.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
        (!req.is('application/json') || req.get('X-Tarefas-App') !== '1')) {
      return res.status(403).json({ mensagem: 'Pedido inválido. Atualize a página.' })
    }
    next()
  })
  app.use(session({
    name: 'tarefas.sid', secret, store,
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
  }))
  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 30,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { mensagem: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }
  })
  const usuarioPublico = ({ id, nome, email }) => ({ id, nome, email })
  const regenerar = (req) => new Promise((resolve, reject) => req.session.regenerate((erro) => erro ? reject(erro) : resolve()))
  const salvarSessao = (req) => new Promise((resolve, reject) => req.session.save((erro) => erro ? reject(erro) : resolve()))
  app.get('/', (req, res) => res.send('Servidor de tarefas funcionando!'))
  app.get('/testa_banco', async (req, res) => {
    await banco.execute('SELECT 1')
    res.json({ mensagem: 'Servidor conectado ao banco!' })
  })
  app.post('/api/cadastro', limiteLogin, async (req, res) => {
    const { nome, email, senha } = req.body ?? {}
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 100 ||
        typeof email !== 'string' || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof senha !== 'string' || senha.length < 12 || senha.length > 128) {
      return res.status(400).json({ mensagem: 'Informe nome, email válido e senha de 12 a 128 caracteres.' })
    }
    const senhaHash = await argon2.hash(senha, { type: argon2.argon2id })
    try {
      const [resultado] = await banco.execute(
        'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
        [nome.trim(), email.trim().toLowerCase(), senhaHash]
      )
      await regenerar(req)
      req.session.usuarioId = resultado.insertId
      await salvarSessao(req)
      res.status(201).json({ usuario: { id: resultado.insertId, nome: nome.trim(), email: email.trim().toLowerCase() } })
    } catch (erro) {
      if (erro.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensagem: 'Este email já está cadastrado. Tente entrar.' })
      throw erro
    }
  })
  const hashFicticio = argon2.hash(randomUUID())
  app.post('/api/login', limiteLogin, async (req, res) => {
    const { email, senha } = req.body ?? {}
    if (typeof email !== 'string' || email.length > 255 || typeof senha !== 'string' || senha.length > 128) {
      return res.status(400).json({ mensagem: 'Informe email e senha.' })
    }
    const [usuarios] = await banco.execute('SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ?', [email.trim().toLowerCase()])
    const usuario = usuarios[0]
    const confere = await argon2.verify(usuario?.senha_hash ?? await hashFicticio, senha)
    if (!usuario || !confere) return res.status(401).json({ mensagem: 'Email ou senha incorretos.' })
    await regenerar(req)
    req.session.usuarioId = usuario.id
    await salvarSessao(req)
    res.json({ usuario: usuarioPublico(usuario) })
  })
  app.post('/api/logout', async (req, res) => {
    await new Promise((resolve, reject) => req.session.destroy((erro) => erro ? reject(erro) : resolve()))
    res.clearCookie('tarefas.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
    res.json({ mensagem: 'Você saiu da conta.' })
  })
  // Daqui para baixo, cada pedido precisa de uma sessão válida.
  app.use('/api', async (req, res, next) => {
    if (!req.session.usuarioId) return res.status(401).json({ mensagem: 'Entre na sua conta para continuar.' })
    const [usuarios] = await banco.execute('SELECT id, nome, email FROM usuarios WHERE id = ?', [req.session.usuarioId])
    if (!usuarios[0]) return res.status(401).json({ mensagem: 'Sua sessão expirou. Entre novamente.' })
    req.usuario = usuarios[0]
    next()
  })
  app.get('/api/sessao', (req, res) => res.json({ usuario: usuarioPublico(req.usuario) }))
  app.get('/api/tarefas', async (req, res) => {
    const [tarefas] = await banco.execute('SELECT id, titulo, concluida, favorita FROM tarefas WHERE usuario_id = ? ORDER BY criada_em, id', [req.usuario.id])
    res.json({ tarefas: tarefas.map((tarefa) => ({ ...tarefa, concluida: Boolean(tarefa.concluida), favorita: Boolean(tarefa.favorita) })) })
  })
  app.post('/api/tarefas', async (req, res) => {
    const { titulo } = req.body ?? {}
    if (typeof titulo !== 'string' || !titulo.trim() || titulo.trim().length > 500) {
      return res.status(400).json({ mensagem: 'A tarefa deve ter entre 1 e 500 caracteres.' })
    }
    const tarefa = { id: randomUUID(), titulo: titulo.trim(), concluida: false, favorita: false }
    await banco.execute('INSERT INTO tarefas (id, usuario_id, titulo) VALUES (?, ?, ?)', [tarefa.id, req.usuario.id, tarefa.titulo])
    res.status(201).json({ tarefa })
  })
  app.patch('/api/tarefas/:id', async (req, res) => {
    const { concluida, favorita } = req.body ?? {}
    if ((concluida !== undefined && typeof concluida !== 'boolean') ||
        (favorita !== undefined && typeof favorita !== 'boolean') ||
        (concluida === undefined && favorita === undefined)) {
      return res.status(400).json({ mensagem: 'Informe a conclusão ou o favorito da tarefa.' })
    }
    const [resultado] = await banco.execute(
      'UPDATE tarefas SET concluida = COALESCE(?, concluida), favorita = COALESCE(?, favorita) WHERE id = ? AND usuario_id = ?',
      [concluida ?? null, favorita ?? null, req.params.id, req.usuario.id]
    )
    if (!resultado.affectedRows) return res.status(404).json({ mensagem: 'Tarefa não encontrada.' })
    res.json({ mensagem: 'Tarefa atualizada.' })
  })
  app.delete('/api/tarefas/:id', async (req, res) => {
    const [resultado] = await banco.execute('DELETE FROM tarefas WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id])
    if (!resultado.affectedRows) return res.status(404).json({ mensagem: 'Tarefa não encontrada.' })
    res.status(204).end()
  })
  app.use('/api', (req, res) => res.status(404).json({ mensagem: 'Endereço não encontrado.' }))
  app.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro)
    console.error('Falha no servidor:', erro.code || erro.name)
    const status = erro.type === 'entity.parse.failed' ? 400 : erro.status === 413 ? 413 : 500
    res.status(status).json({ mensagem: status === 400 ? 'JSON inválido.' : status === 413 ? 'Dados enviados muito grandes.' : 'Não foi possível concluir. Tente novamente.' })
  })
  return app
}
module.exports = criarApp
