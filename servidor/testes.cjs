const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const argon2 = require('argon2')
const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const banco = require('./banco.cjs')
const prepararBanco = require('./schema.cjs')
const criarApp = require('./app.cjs')

test('Cadastro, login, persistência e isolamento no MySQL real', async (t) => {
  const contas = []
  const sessoes = new Set()
  const store = new MySQLStore({ createDatabaseTable: true, endConnectionOnClose: false }, banco)
  let servidor
  const senha = 'SenhaFicticiaDeTeste123!'
  const email = `teste-${randomUUID()}@example.invalid`
  const emailB = `teste-${randomUUID()}@example.invalid`
  try {
    await prepararBanco(banco)
    await store.onReady()
    servidor = criarApp({ banco, store, secret: 'chave-exclusiva-dos-testes-com-mais-de-32-caracteres' }).listen(0, '127.0.0.1')
    await once(servidor, 'listening')
    const base = `http://127.0.0.1:${servidor.address().port}/api`
    async function pedir(caminho, { method = 'GET', body, cookie, cabecalho = true } = {}) {
      const resposta = await fetch(base + caminho, {
        method, headers: { 'Content-Type': 'application/json', ...(cabecalho ? { 'X-Tarefas-App': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
      })
      const novoCookie = resposta.headers.get('set-cookie')?.split(';')[0]
      if (novoCookie) {
        const valor = decodeURIComponent(novoCookie.slice(novoCookie.indexOf('=') + 1))
        if (valor.startsWith('s:')) sessoes.add(valor.slice(2, valor.lastIndexOf('.')))
      }
      return { status: resposta.status, cookie: novoCookie, dados: resposta.status === 204 ? null : await resposta.json() }
    }
    await t.test('bloqueia visitantes e pedidos externos', async () => {
      assert.equal((await pedir('/tarefas')).status, 401)
      assert.equal((await pedir('/cadastro', { method: 'POST', body: {}, cabecalho: false })).status, 403)
      assert.equal((await pedir('/cadastro', { method: 'POST', body: { nome: 'Teste', email, senha: 'curta' } })).status, 400)
    })
    const cadastro = await pedir('/cadastro', { method: 'POST', body: { nome: 'Teste A', email, senha } })
    assert.equal(cadastro.status, 201)
    contas.push(cadastro.dados.usuario.id)
    const cookieA = cadastro.cookie
    const cadastroB = await pedir('/cadastro', { method: 'POST', body: { nome: 'Teste B', email: emailB, senha } })
    assert.equal(cadastroB.status, 201)
    contas.push(cadastroB.dados.usuario.id)
    const cookieB = cadastroB.cookie
    await t.test('protege a senha e impede duplicidade', async () => {
      const [[usuario]] = await banco.execute('SELECT senha_hash FROM usuarios WHERE id = ?', [contas[0]])
      assert.notEqual(usuario.senha_hash, senha)
      assert.ok(usuario.senha_hash.startsWith('$argon2id$'))
      assert.ok(await argon2.verify(usuario.senha_hash, senha))
      assert.equal(cadastro.dados.usuario.senha_hash, undefined)
      assert.equal((await pedir('/cadastro', { method: 'POST', body: { nome: 'Teste', email: email.toUpperCase(), senha } })).status, 409)
    })
    await t.test('rejeita senha incorreta e tentativa de SQL injection', async () => {
      assert.equal((await pedir('/login', { method: 'POST', body: { email, senha: 'incorreta' } })).status, 401)
      assert.equal((await pedir('/login', { method: 'POST', body: { email: "' OR 1=1 --", senha } })).status, 401)
    })
    const criacao = await pedir('/tarefas', { method: 'POST', cookie: cookieA, body: { titulo: 'Tarefa de teste' } })
    assert.equal(criacao.status, 201)
    const id = criacao.dados.tarefa.id
    await t.test('separa tarefas e bloqueia alteração/exclusão por outro usuário', async () => {
      assert.deepEqual((await pedir('/tarefas', { cookie: cookieB })).dados.tarefas, [])
      assert.equal((await pedir(`/tarefas/${id}`, { method: 'PATCH', cookie: cookieB, body: { concluida: true } })).status, 404)
      assert.equal((await pedir(`/tarefas/${id}`, { method: 'DELETE', cookie: cookieB, body: {} })).status, 404)
      assert.equal((await pedir('/tarefas', { method: 'POST', cookie: cookieA, body: { titulo: '   ' } })).status, 400)
    })
    await t.test('salva conclusão e favoritos no banco', async () => {
      assert.equal((await pedir(`/tarefas/${id}`, { method: 'PATCH', cookie: cookieA, body: { concluida: true, favorita: true } })).status, 200)
      const lista = (await pedir('/tarefas', { cookie: cookieA })).dados.tarefas
      assert.equal(lista[0].concluida, true)
      assert.equal(lista[0].favorita, true)
    })
    await t.test('logout invalida a sessão e novo login recupera as tarefas', async () => {
      assert.equal((await pedir('/logout', { method: 'POST', cookie: cookieA, body: {} })).status, 200)
      assert.equal((await pedir('/sessao', { cookie: cookieA })).status, 401)
      const login = await pedir('/login', { method: 'POST', body: { email, senha } })
      assert.equal(login.status, 200)
      assert.notEqual(login.cookie, cookieA)
      assert.equal((await pedir('/sessao', { cookie: login.cookie })).dados.usuario.id, contas[0])
      assert.equal((await pedir('/tarefas', { cookie: login.cookie })).dados.tarefas[0].id, id)
      assert.equal((await pedir(`/tarefas/${id}`, { method: 'DELETE', cookie: login.cookie, body: {} })).status, 204)
      assert.deepEqual((await pedir('/tarefas', { cookie: login.cookie })).dados.tarefas, [])
    })
  } finally {
    if (servidor) await new Promise((resolve) => servidor.close(resolve))
    // Remove exclusivamente os registros criados por este teste.
    for (const id of contas) await banco.execute('DELETE FROM usuarios WHERE id = ?', [id])
    for (const id of sessoes) await banco.execute('DELETE FROM sessions WHERE session_id = ?', [id])
    await store.close()
    await banco.end()
  }
})
