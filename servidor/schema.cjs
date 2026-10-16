// Cria somente as tabelas ausentes, sem apagar dados existentes.
async function prepararBanco(banco) {
  await banco.execute(`CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL
  ) CHARACTER SET utf8mb4`)
  await banco.execute(`CREATE TABLE IF NOT EXISTS tarefas (
    id CHAR(36) PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(500) NOT NULL,
    concluida BOOLEAN NOT NULL DEFAULT FALSE,
    favorita BOOLEAN NOT NULL DEFAULT FALSE,
    criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`)
}
module.exports = prepararBanco
