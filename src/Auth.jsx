import { useState } from 'react'
import { api } from './api'

export default function Auth({ aoEntrar }) {
  const [cadastro, setCadastro] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const dados = Object.fromEntries(new FormData(evento.currentTarget))
    setErro('')
    setEnviando(true)
    try {
      const resultado = await api(cadastro ? '/cadastro' : '/login', { method: 'POST', body: dados })
      await aoEntrar(resultado.usuario)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Bem-vindo ao Tarefas">
        <a className="brand" href="#login"><span className="brand-icon">✓</span> Tarefas<span className="brand-dot">.</span></a>
        <div className="auth-pitch"><p className="eyebrow">UM DIA MAIS LEVE COMEÇA AQUI</p><h1>Menos na cabeça.<br /><span>Mais espaço<br />para viver.</span></h1><p>Guarde suas tarefas em um só lugar.<br />O próximo passo fica mais simples.</p><span className="auth-flower" aria-hidden="true">✳</span></div>
        <p className="auth-note">Seu espaço. Seu ritmo. Uma tarefa de cada vez.</p>
      </section>
      <section id="login" className="auth-panel">
        <div className="auth-card">
          <span className="auth-welcome" aria-hidden="true">✦</span>
          <p className="eyebrow">BEM-VINDO AO SEU ESPAÇO</p>
          <h2>{cadastro ? 'Vamos começar?' : 'Bom ter você aqui.'}</h2>
          <p className="auth-description">{cadastro ? 'Crie sua conta e organize o que importa.' : 'Entre para continuar de onde parou.'}</p>
          <div className="auth-tabs" role="group" aria-label="Acesso à conta">
            <button type="button" disabled={enviando} aria-pressed={!cadastro} onClick={() => { setCadastro(false); setErro('') }}>Entrar</button>
            <button type="button" disabled={enviando} aria-pressed={cadastro} onClick={() => { setCadastro(true); setErro('') }}>Criar conta</button>
          </div>
          <form key={String(cadastro)} className="auth-form" onSubmit={enviar}>
            <fieldset disabled={enviando}>
              {cadastro && <label>Seu nome<input name="nome" autoComplete="name" placeholder="Como podemos chamar você?" maxLength={100} required /></label>}
              <label>Email<input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" maxLength={255} required /></label>
              <label>Senha<input name="senha" type="password" autoComplete={cadastro ? 'new-password' : 'current-password'} placeholder={cadastro ? 'Crie uma senha com 12 caracteres ou mais' : 'Sua senha'} minLength={cadastro ? 12 : 1} maxLength={128} required /></label>
              {cadastro && <small>Use de 12 a 128 caracteres. Pode ser uma frase fácil de lembrar.</small>}
              {erro && <p className="error-message" role="alert">{erro}</p>}
              <button className="add-button" type="submit">{enviando ? 'Aguarde…' : cadastro ? 'Criar minha conta →' : 'Entrar no meu espaço →'}</button>
            </fieldset>
          </form>
          <p className="auth-bottom">Um passo de cada vez já é um começo.</p>
        </div>
      </section>
    </main>
  )
}
