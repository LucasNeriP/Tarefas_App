# Tarefas App

Aplicação local de tarefas com React, Express e MySQL. Inclui cadastro, login, logout, conclusão, favoritos e filtros. Cada conta tem sua própria lista, salva no banco.

## Como abrir

Deixe o MySQL funcionando. Na pasta `Tarefas`, abra dois terminais:

**Terminal 1 — servidor:**

```bash
npm run servidor
```

**Terminal 2 — tela React:**

```bash
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente http://localhost:5173. Clique em **Criar conta**, informe nome, email e uma senha de 12 a 128 caracteres. O cadastro já entra na conta. Use **Sair** para encerrar a sessão.

Se aparecer que a porta 3001 está ocupada, encerre o servidor antigo com Ctrl+C no terminal onde ele está rodando. Inicie o novo comando novamente. Use sempre o mesmo endereço do navegador (`localhost` ou `127.0.0.1`) para manter a sessão.

## Configuração em outro computador

1. Instale Node.js e MySQL Server.
2. Execute `npm install` na pasta `Tarefas`.
3. Execute `npm install --prefix servidor`.
4. Crie o banco com `CREATE DATABASE tarefas_app CHARACTER SET utf8mb4;` no Workbench.
5. Copie `servidor/.env.example` para `servidor/.env` e preencha os dados de conexão localmente.
6. Inicie os dois terminais acima. O servidor cria as tabelas que estiverem faltando, sem apagar dados existentes. Ele gera e salva uma chave de sessão no `.env` na primeira inicialização local.

Nunca envie o `.env` ao GitHub. Ele está excluído pelo `.gitignore`.

## Entenda o caminho

```text
React → fetch('/api/...') → Express → consulta SQL → MySQL
React ← resposta JSON   ← Express ← resultado   ← MySQL
```

- `src/Auth.jsx`: formulários de cadastro e login.
- `src/App.jsx`: tarefas, filtros e estado da tela.
- `src/api.js`: pedidos da tela para o servidor.
- `vite.config.js`: encaminha `/api` ao Express em desenvolvimento.
- `servidor/app.cjs`: valida dados, autentica e consulta tarefas.
- `servidor/banco.cjs`: conexão com o MySQL.
- `servidor/schema.cjs`: cria as tabelas ausentes.
- `servidor/index.cjs`: inicia banco, sessões e servidor.

O cadastro transforma a senha com Argon2id e salva somente o hash. O login verifica esse hash e cria uma sessão no MySQL. O navegador recebe um cookie HttpOnly. Nas tarefas, o servidor usa o usuário da sessão para verificar a propriedade de cada registro; ele não confia em um identificador de usuário enviado pela tela.

## Verificações

Na pasta `Tarefas`:

```bash
npm run build
npm run lint
npm --prefix servidor test
```

Os testes de integração usam o MySQL configurado no `.env`, criam contas e tarefas fictícias e removem apenas os próprios registros ao terminar. Verificam cadastro, hash, duplicidade, credenciais incorretas, SQL injection, sessão, logout, persistência e isolamento das tarefas.

## Escopo

Preparado para uso e aprendizado local. Recuperação de senha e verificação de email ainda não fazem parte do projeto. A publicação exige configurar hospedagem, HTTPS, cookies seguros, credenciais de produção e roteamento `/api`; `vite preview` sozinho não executa o backend.
