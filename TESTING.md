# Guia de Testes

Este documento define as convenções que devem ser seguidas ao escrever testes neste projeto. O repositório ainda não possui infraestrutura de testes configurada — este guia é a base para introduzi-la de forma consistente.

## Stack

- **Runner**: [Vitest](https://vitest.dev) — integra bem com Vite (já usado em `apps/web`) e com TypeScript/ESM sem configuração extra, e roda nativamente sob Bun.
- **Componentes React** (`apps/web`): [`@testing-library/react`](https://testing-library.com/react).
- **Rotas HTTP** (`apps/server`, Fastify): `fastify.inject()` para testes de integração, sem precisar subir um servidor real na porta.

## Nomenclatura e localização

- Arquivos de teste ficam ao lado do arquivo testado (colocation), não em uma pasta `__tests__` separada.
- Nomenclatura: `<arquivo>.test.ts` ou `<arquivo>.test.tsx`.
  - Exemplo: `apps/server/src/lib/tickets.ts` → `apps/server/src/lib/tickets.test.ts`.
- `describe`/`it` em **inglês**, consistente com o restante do código e com a convenção de commits em inglês.

## O que testar em cada camada

| Camada | Local | Tipo de teste |
|---|---|---|
| Lógica de negócio do servidor | `apps/server/src/lib/*.ts` | Unitário, com mock de DB quando necessário |
| Rotas HTTP | `apps/server/src/routes/*.ts` | Integração via `fastify.inject()` |
| Funções puras do frontend | `apps/web/src/lib/*.ts` | Unitário |
| Componentes React | `apps/web/src/components/*.tsx` | Testing Library, focado em comportamento visível ao usuário, não em detalhes de implementação |
| Requests de API | `apps/web/src/api/requests/**` | Normalmente não precisam de teste próprio (thin wrappers); testar apenas se houver lógica de transformação |

## O que NÃO testar

- Código de configuração/roteamento gerado automaticamente (ex: `routeTree.gen.ts`).
- Definições de tipos.
- Wrappers triviais sem lógica própria.

## Banco de dados nos testes

- Testes de integração que precisam de DB usam um banco Postgres de teste local (mesmo Docker do ambiente de dev, banco separado do de desenvolvimento).
- Sempre que possível, preferir testes unitários com mocks para lógica pura, evitando dependência de banco de dados.

## Estrutura do teste

- Seguir o padrão Arrange-Act-Assert.
- Sem comentários explicando o óbvio — seguir a regra geral do projeto (`CLAUDE.md`) de não adicionar comentários em código gerado.

## Cobertura

O ideal é manter no mínimo **80% de cobertura de testes**.

## Scripts

Cada workspace (`apps/server`, `apps/web`) deve ter um script `test` (`vitest run`) no seu `package.json`. Na raiz, os testes rodam via Turborepo (`turbo run test`). Essa configuração deve ser adicionada quando os primeiros testes forem escritos.
