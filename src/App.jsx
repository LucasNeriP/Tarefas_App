import { useState } from 'react'
import './App.css'

function App() {
  const [texto, setTexto] = useState('')
  const [tarefas, setTarefas] = useState([])

  function alternarFavorita(id) {
    setTarefas(
      tarefas.map((tarefa) => {
        if (tarefa.id === id) {
          return {
            ...tarefa,
            favorita: !tarefa.favorita
          }
        }

        return tarefa
      }
    )
  )
  }

  function excluirTarefa(id) {
  setTarefas(
    tarefas.filter((tarefa) => tarefa.id !== id)
  )
}

  function alternarConclusao(id) {
  setTarefas(
    tarefas.map((tarefa) => {
      if (tarefa.id === id) {
        return {
          ...tarefa,
          concluida: !tarefa.concluida
        }
      }

      return tarefa
    })
  )
}

  function adicionarTarefa(evento) {

    evento.preventDefault()

    if (texto.trim() === '') {
      return
    }
    const novaTarefa = {
      id: crypto.randomUUID(),
      titulo: texto,
      concluida: false,
      favorita: false
    }
    setTarefas([...tarefas, novaTarefa])
    setTexto('')
  }

  return (
    <div>
      <h1>Tarefas App</h1>

      <form onSubmit = {adicionarTarefa}>
        <input
        type="text"
        placeholder="Digite uma tarefa"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />

      <button type="submit">Adicionar Tarefa</button>
      </form>

      <ul>
        {tarefas.map((tarefa) => (

          <li key={tarefa.id} >
            <input
              type="checkbox"
              checked={tarefa.concluida}
              onChange={() => alternarConclusao(tarefa.id)}
            />
            <span style={{ textDecoration: tarefa.concluida ? 'line-through' : 'none' }}>
              {tarefa.titulo}
            </span>

            <button
              type="button"
              onClick={() => alternarFavorita(tarefa.id)}
            >
              {tarefa.favorita ? 'Desfavoritar' : 'Favoritar'}
            </button>
            
            <button 
              type="button"
              onClick={() => excluirTarefa(tarefa.id)}
            >
              Excluir
            </button>

          </li>

        ))}
      </ul>
    </div>
  )
}

export default App
