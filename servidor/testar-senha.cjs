const argon2 = require('argon2')

async function testarSenha() {
  const senha = 'ExemploDeSenha123!'
  const hash = await argon2.hash(senha)

  console.log('Hash gerado:', hash)

  const confere = await argon2.verify(hash, senha)

  console.log('A senha confere?', confere)
}

testarSenha().catch(console.error)