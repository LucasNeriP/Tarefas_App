import { useEffect, useState } from 'react'
import Auth from './Auth'
import { api } from './api'
import './App.css'

function App() {
  const [texto, setTexto] = useState('')
  const [tarefas, setTarefas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // Ao abrir a página, pergunta ao servidor se existe uma sessão.
  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const sessao = await api('/sessao')
        const dados = await api('/tarefas')
        if (ativo) {
          setUsuario(sessao.usuario)
          setTarefas(dados.tarefas)
        }
      } catch (falha) {
        if (ativo && falha.status !== 401) setErro(falha.message)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => { ativo = false }
  }, [])

  async function aoEntrar(conta) {
    const dados = await api('/tarefas')
    setTarefas(dados.tarefas)
    setUsuario(conta)
    setFiltro('todas')
    setErro('')
  }

  async function executar(acao) {
    if (ocupado) return
    setOcupado(true)
    setErro('')
    try {
      await acao()
    } catch (falha) {
      setErro(falha.message)
      if (falha.status === 401) {
        setUsuario(null)
        setTarefas([])
        setTexto('')
      }
    } finally {
      setOcupado(false)
    }
  }

  function sair() {
    executar(async () => {
      await api('/logout', { method: 'POST', body: {} })
      setUsuario(null)
      setTarefas([])
      setTexto('')
      setFiltro('todas')
    })
  }
  const completas = tarefas.filter((tarefa) => tarefa.concluida).length
  const favoritas = tarefas.filter((tarefa) => tarefa.favorita).length
  const progresso = tarefas.length ? Math.round((completas / tarefas.length) * 100) : 0

  const tarefasFiltradas = tarefas.filter((tarefa) => {
    if (filtro === 'completas') {
      return tarefa.concluida
    }

    if (filtro === 'favoritas') {
      return tarefa.favorita
    }

    return true
  })

  function alternarFavorita(id) {
    executar(async () => {
      const favorita = !tarefas.find((tarefa) => tarefa.id === id).favorita
      await api(`/tarefas/${id}`, { method: 'PATCH', body: { favorita } })
      setTarefas((lista) => lista.map((tarefa) => tarefa.id === id ? { ...tarefa, favorita } : tarefa))
    })
  }

  function excluirTarefa(id) {
    executar(async () => {
      await api(`/tarefas/${id}`, { method: 'DELETE', body: {} })
      setTarefas((lista) => lista.filter((tarefa) => tarefa.id !== id))
    })
  }

  function alternarConclusao(id) {
    executar(async () => {
      const concluida = !tarefas.find((tarefa) => tarefa.id === id).concluida
      await api(`/tarefas/${id}`, { method: 'PATCH', body: { concluida } })
      setTarefas((lista) => lista.map((tarefa) => tarefa.id === id ? { ...tarefa, concluida } : tarefa))
    })
  }

  function adicionarTarefa(evento) {

    evento.preventDefault()

    if (texto.trim() === '') {
      return
    }
    executar(async () => {
      const dados = await api('/tarefas', { method: 'POST', body: { titulo: texto } })
      setTarefas((lista) => [...lista, dados.tarefa])
      setTexto('')
    })
  }

  if (carregando) return <main className="loading-screen" role="status">Preparando seu espaço…</main>
  if (!usuario) return <>{erro && <div className="connection-error" role="alert">{erro} <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}<Auth aoEntrar={aoEntrar} /></>

  return (
    <div className="app-layout">
      <aside className="sidebar">
      <a className="brand" href="#inicio"><span className="brand-icon">✓</span> Tarefas<span className="brand-dot">.</span></a>
      <p className="sidebar-label">SEU ESPAÇO</p>

      <nav aria-label="Filtrar tarefas">
        <button
          type="button"
          aria-pressed={filtro === 'todas'}
          onClick={() => setFiltro('todas')}
        >
          <span aria-hidden="true">☰</span> Todas <span className="count">{tarefas.length}</span>
        </button>

        <button
          type="button"
          aria-pressed={filtro === 'completas'}
          onClick={() => setFiltro('completas')}
        >
          <span aria-hidden="true">✓</span> Completas <span className="count">{completas}</span>
        </button>

        <button
          type="button"
          aria-pressed={filtro === 'favoritas'}
          onClick={() => setFiltro('favoritas')}
        >
          <span aria-hidden="true">☆</span> Favoritas <span className="count">{favoritas}</span>
        </button>
      </nav>
      <div className="sidebar-note"><span className="note-star" aria-hidden="true">✦</span><p>Um passo de cada vez.</p><small>Pequenas tarefas, grandes conquistas.</small></div>
      <div className="sidebar-footer"><span className="avatar">{usuario.nome.slice(0, 2).toUpperCase()}</span><div className="account-name">{usuario.nome}<small>Meu espaço</small></div><button className="logout-button" type="button" onClick={sair} disabled={ocupado}>Sair</button></div>
      </aside>

      <main id="inicio" className="workspace">
      <div className="mobile-account"><span>Olá, {usuario.nome}!</span><button type="button" onClick={sair} disabled={ocupado}>Sair da conta</button></div>
      <header className="page-header"><div><p className="eyebrow">MENOS PRESSA. MAIS FOCO.</p><h1>Organize o dia.<br /><span>Abra espaço para você.</span></h1><p className="subtitle">Uma tarefa de cada vez, no seu ritmo.</p></div><span className="header-symbol" aria-hidden="true">✳</span></header>
      <section className="progress-card" aria-label="Progresso das tarefas"><div><span className="progress-icon" aria-hidden="true">✓</span><div><h2>Seu progresso</h2><p>{completas} de {tarefas.length} tarefas concluídas</p></div></div><div className="progress-summary"><strong>{progresso}%</strong><progress max="100" value={progresso} aria-label="Porcentagem de tarefas concluídas" /></div></section>

      <form className="task-form" onSubmit = {adicionarTarefa}>
        <label className="sr-only" htmlFor="nova-tarefa">Nova tarefa</label>
        <span className="input-plus" aria-hidden="true">+</span>
        <input
        id="nova-tarefa"
        maxLength={500}
        disabled={ocupado}
        type="text"
        placeholder="O que você quer fazer hoje?"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />

      <button className="add-button" type="submit" disabled={ocupado || !texto.trim()}><span aria-hidden="true">+</span> {ocupado ? 'Salvando…' : 'Adicionar tarefa'}</button>
      </form>
      {erro && <p className="error-message" role="alert">{erro}</p>}

      <section className="tasks-section" aria-labelledby="list-title">
      <div className="list-heading"><h2 id="list-title">{filtro === 'completas' ? 'Tarefas concluídas' : filtro === 'favoritas' ? 'Suas favoritas' : 'Suas tarefas'} <span>{tarefasFiltradas.length}</span></h2><span>Seu próximo passo começa aqui</span></div>
      {tarefasFiltradas.length === 0 && <div className="empty-state"><span aria-hidden="true">{filtro === 'favoritas' ? '☆' : '✓'}</span><h3>{filtro === 'todas' ? 'Um dia cheio de possibilidades' : 'Nenhuma tarefa por aqui ainda'}</h3><p>{filtro === 'todas' ? 'Adicione sua primeira tarefa e dê o primeiro passo.' : filtro === 'favoritas' ? 'Marque uma tarefa com a estrela para encontrá-la aqui.' : 'As tarefas que você concluir aparecem aqui.'}</p></div>}
      <ul className="task-list">
        {tarefasFiltradas.map((tarefa) => (

          <li key={tarefa.id} className={`task-item ${tarefa.concluida ? 'is-complete' : ''}`}>
            <input
              type="checkbox"
              disabled={ocupado}
              aria-label={`Marcar ${tarefa.titulo} como ${tarefa.concluida ? 'pendente' : 'concluída'}`}
              checked={tarefa.concluida}
              onChange={() => alternarConclusao(tarefa.id)}
            />
            <span className="task-title">
              {tarefa.titulo}
            </span>

            <button
              className={`icon-button favorite-button ${tarefa.favorita ? 'is-favorite' : ''}`}
              disabled={ocupado}
              type="button"
              aria-label={`${tarefa.favorita ? 'Desfavoritar' : 'Favoritar'} ${tarefa.titulo}`}
              aria-pressed={tarefa.favorita}
              title={tarefa.favorita ? 'Desfavoritar' : 'Favoritar'}
              onClick={() => alternarFavorita(tarefa.id)}
            >
              <span aria-hidden="true">{tarefa.favorita ? '★' : '☆'}</span>
            </button>

            <button 
              className="icon-button delete-button"
              disabled={ocupado}
              type="button"
              aria-label={`Excluir ${tarefa.titulo}`}
              title="Excluir tarefa"
              onClick={() => excluirTarefa(tarefa.id)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
            </button>

          </li>

        ))}
      </ul>
      </section>
      <footer className="workspace-footer">Feito é melhor que perfeito. Celebre cada pequena conquista. <span aria-hidden="true">✦</span></footer>
      </main>
    </div>
  )
}

export default App
