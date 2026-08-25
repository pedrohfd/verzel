# Ticket

Este projeto foi criado com o [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), uma stack TypeScript moderna que combina React, TanStack Router, Fastify e mais.

## Funcionalidades

- **TypeScript** - Para segurança de tipos e melhor experiência de desenvolvimento
- **TanStack Router** - Roteamento baseado em arquivos com tipagem completa
- **TailwindCSS** - CSS utility-first para desenvolvimento rápido de UI
- **Pacote de UI compartilhado** - primitivos shadcn/ui em `packages/ui`
- **Fastify** - Framework web rápido e de baixo overhead
- **Node.js** - Ambiente de execução
- **Drizzle** - ORM TypeScript-first
- **PostgreSQL** - Banco de dados
- **Autenticação** - Better-Auth
- **Biome** - Linting e formatação
- **Husky** - Git hooks para qualidade de código
- **Turborepo** - Sistema de build otimizado para monorepo

## Para começar

Primeiro, instale as dependências:

```bash
bun install
```

## Configuração do banco de dados

Este projeto usa PostgreSQL com Drizzle ORM.

### Desenvolvimento local (Docker)

1. Copie `apps/server/.env.example` para `apps/server/.env` (os valores padrão já apontam para o Postgres local do Docker).
2. Suba uma instância local do Postgres:

```bash
bun run docker:up
```

3. Aplique o schema no banco de dados:

```bash
bun run db:push
```

Pare o banco local com `bun run docker:down` (os dados persistem em um volume Docker entre reinicializações).

### Usando um banco de dados hospedado (ex.: Neon)

Atualize `apps/server/.env` com os dados de conexão do seu PostgreSQL (uma URL Neon `postgresql://...?sslmode=require` funciona sem configuração adicional — o SSL é habilitado automaticamente quando `sslmode=require` está presente) e então rode `bun run db:push`.

Em seguida, rode o servidor de desenvolvimento:

```bash
bun run dev
```

Abra [http://localhost:3001](http://localhost:3001) no navegador para ver a aplicação web.
A API está rodando em [http://localhost:3000](http://localhost:3000).

## Customização da UI

As aplicações web React desta stack compartilham primitivos shadcn/ui através de `packages/ui`.

- Altere tokens de design e estilos globais em `packages/ui/src/styles/globals.css`
- Atualize os primitivos compartilhados em `packages/ui/src/components/*`
- Ajuste aliases do shadcn ou configurações de estilo em `packages/ui/components.json` e `apps/web/components.json`

### Adicionar mais componentes compartilhados

Rode isso a partir da raiz do projeto para adicionar mais primitivos ao pacote de UI compartilhado:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Importe componentes compartilhados assim:

```tsx
import { Button } from "@verzel/ui/components/button";
```

### Adicionar blocos específicos da aplicação

Se você quiser adicionar blocos específicos da aplicação em vez de primitivos compartilhados, rode a CLI do shadcn a partir de `apps/web`.

## Deploy

### Vercel Services

- Alvo: web + server
- Configuração: `vercel.json`
- Vincule o projeto primeiro: bun run deploy:setup
- Vercel dev local: bun run dev:vercel
- Sincronizar env de preview: bun run env:preview
- Sincronizar env de produção: bun run env:production
- Verificação dry-run (sem upload): bun run deploy:check
- Deploy de preview: bun run deploy
- Deploy de produção: bun run deploy:prod
- Requisições da web sob `/api/*` são roteadas para o serviço de servidor e reescritas antes de chegar ao backend.
  Vercel Services compartilham variáveis de ambiente do projeto, mas os deploys não fazem upload automático dos arquivos `.env` locais. Vincule o projeto com `vercel link` e então rode o comando de sincronização de env antes do primeiro deploy (caso contrário o deploy começa sem variáveis de ambiente), ou passe envs pontuais com `vercel deploy -e KEY=value`.
  Passe flags da Vercel CLI diretamente para o comando de sincronização de env, por exemplo: `bun run env:production --scope your-team`.

Para mais detalhes, veja o guia de [Deploy na Vercel](https://www.better-t-stack.dev/docs/guides/vercel).

## Git Hooks e Formatação

- Inicializar hooks: `bun run prepare`
- Rodar checagens: `bun run check`

## Testes

As convenções de testes deste projeto estão descritas em [`TESTING.md`](./TESTING.md) (Vitest, Testing Library, `fastify.inject()`, colocation, padrão AAA). Esta seção documenta como rodar e verificar os testes.

### Como rodar

```bash
bun run test
```

Roda os testes de todos os workspaces (`apps/server`, `apps/web`) via Turborepo. Também é possível rodar por workspace:

```bash
cd apps/server && bun run test
cd apps/web && bun run test
```

### Cobertura

A cobertura mínima exigida é **80%** (statements, branches, functions e lines), configurada em `coverage.thresholds` de cada `vitest.config.ts`/`vite.config.ts`. Ela é calculada automaticamente em todo `bun run test` (não é preciso passar `--coverage`) e, se qualquer métrica ficar abaixo de 80%, o comando termina com código de erro. O relatório em HTML fica em `coverage/` dentro de cada workspace (ignorado pelo Git).

### Banco de dados de teste

Os testes de integração de `apps/server` (rotas via `fastify.inject()`) usam um banco Postgres de teste separado (`verzel_test`), no mesmo container Docker do ambiente de desenvolvimento (`bun run docker:up`). Antes de cada execução de `bun run test` em `apps/server`, o script `pretest` (`apps/server/scripts/migrate-test-db.ts`) cria o banco `verzel_test` (se ainda não existir) e aplica as migrations nele — não é preciso nenhum passo manual, desde que o Postgres do `docker-compose` esteja rodando.

Os valores de ambiente usados nos testes (dummy, sem segredos reais) ficam em `apps/server/.env.test` e `apps/web/.env.test`, versionados no repositório.

### Bloqueio de push com testes falhando ou cobertura insuficiente

Há um hook `.husky/pre-push` que roda `bun run test` antes de qualquer `git push`. Como a cobertura mínima já é verificada dentro do próprio `vitest run`, o push é bloqueado tanto quando um teste falha quanto quando a cobertura fica abaixo de 80%.

**Limitação conhecida:** esse bloqueio é local — `git push --no-verify` ainda contorna o hook, e não há CI configurado neste repositório como segunda camada de proteção (decisão consciente para manter o escopo enxuto; pode ser adicionado depois, se necessário).

### Fora do escopo de testes

`packages/db` (schema Drizzle, migrations e fábrica de conexão) não tem uma suíte de testes dedicada — é uma decisão consciente, já que o pacote tem pouca lógica própria para testar isoladamente. Ele é exercitado indiretamente pelos testes de integração de `apps/server` que usam o banco de teste real.

### Uso de IA neste trabalho

A infraestrutura de testes (configuração do Vitest, o refactor de `apps/server/src/index.ts` para extrair `buildApp()`, o script de migração do banco de teste, o hook `pre-push` e os arquivos de teste iniciais listados acima) foi escrita com apoio de IA (Claude Code), incluindo a escolha das ferramentas (Vitest, Testing Library, `fastify.inject()`) e a cobertura dos principais fluxos de sucesso e erro de cada camada.

## Funcionalidades além do escopo mínimo

### Combos (lanchonete)

Adicionado um passo de **"Monte seu combo"** entre a seleção de assentos e o pagamento, com CRUD de combos para o organizador. Não fazia parte do escopo mínimo do desafio, mas as imagens de referência em `ui/combos.jpeg` e `ui/pagamento.jpeg` já desenhavam um fluxo de checkout de 3 passos (**1. Sessão & Assentos → 2. Combo → 3. Pagamento**), então foi implementado para completar esse fluxo.

- **Organizador** (`/organizer/combos`): criar, listar, editar e excluir combos (nome, descrição, preço, ativo/inativo). Os combos pertencem ao organizador — como as salas de cinema —, então aparecem em todas as sessões dele, não em um evento específico.
- **Cliente**: após reservar os assentos, a nova etapa `/checkout/$reservationIds/combo` lista os combos ativos do organizador daquela sessão, com um contador de quantidade por item. O total (ingressos + combos) é exibido no resumo do pedido e propagado para a tela de pagamento via query param.
- **Pagamento**: o valor dos combos escolhidos é somado ao pagamento simulado (não é apenas visual) — a integração acontece em `apps/server/src/lib/payments.ts`, que valida se os combos pertencem ao organizador do evento, soma o subtotal ao primeiro pagamento do lote e grava um snapshot dos itens comprados (nome/preço no momento da compra) na tabela `payment_combo_item`, para o caso de o combo ser editado ou removido depois.

## Estrutura do projeto

```
verzel/
├── apps/
│   ├── web/         # Aplicação frontend (React + TanStack Router)
│   └── server/      # API backend (Fastify)
├── packages/
│   ├── ui/          # Componentes e estilos shadcn/ui compartilhados
│   ├── auth/        # Configuração e lógica de autenticação
│   └── db/          # Schema e queries do banco de dados
```

## Scripts disponíveis

- `bun run dev`: Inicia todas as aplicações em modo de desenvolvimento
- `bun run build`: Builda todas as aplicações
- `bun run dev:web`: Inicia apenas a aplicação web
- `bun run dev:server`: Inicia apenas o servidor
- `bun run check-types`: Checa os tipos TypeScript em todas as aplicações
- `bun run test`: Roda todos os testes (com verificação de cobertura) em todos os workspaces
- `bun run db:push`: Envia mudanças de schema para o banco de dados
- `bun run db:generate`: Gera o client/tipos do banco de dados
- `bun run db:migrate`: Roda as migrations do banco de dados
- `bun run db:studio`: Abre a UI do database studio
- `bun run docker:up`: Sobe o container local do Postgres
- `bun run docker:down`: Para o container local do Postgres
- `bun run check`: Roda formatação e linting do Biome
- `bun run deploy:setup`: Vincula este repositório a um projeto Vercel (configuração inicial)
- `bun run dev:vercel`: Roda o ambiente de dev do Vercel Services localmente
- `bun run env:preview`: Sincroniza os arquivos de env locais com o ambiente de preview da Vercel
- `bun run env:production`: Sincroniza os arquivos de env locais com o ambiente de produção da Vercel
- `bun run deploy`: Cria um deploy de preview na Vercel
- `bun run deploy:prod`: Faz deploy para produção na Vercel
- `bun run deploy:check`: Faz um dry-run do deploy para pré-visualizar a detecção de framework e os arquivos incluídos, sem fazer upload
