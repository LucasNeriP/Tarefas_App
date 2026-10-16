// /api é encaminhado pelo Vite para o servidor Express.
export async function api(caminho, opcoes = {}) {
  let resposta
  try {
    resposta = await fetch(`/api${caminho}`, {
      ...opcoes,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Tarefas-App': '1', ...opcoes.headers },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    })
  } catch {
    throw new Error('Não foi possível acessar o servidor. Confira se ele está ligado.')
  }
  if (resposta.status === 204) return null
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    const erro = new Error(dados.mensagem || 'Não foi possível acessar o servidor. Confira se ele está ligado.')
    erro.status = resposta.status
    throw erro
  }
  return dados
}
