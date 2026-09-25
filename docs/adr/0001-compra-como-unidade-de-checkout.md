# Compra como unidade de checkout

Hoje cada assento vira sua própria reserva, pagamento e ingresso, e os Combos ficam presos ao pagamento do primeiro assento. Decidimos introduzir a **Compra**: um checkout aprovado com um único pagamento, de 1 a 10 Ingressos da mesma Sessão e opcionalmente Combos. O Cliente cancela **por Ingresso**, e cada devolução vira um **Reembolso** próprio ligado à Compra (valor e motivo), em vez de mudar o status do pagamento. Isso permite reembolsos parciais. Os Combos só são reembolsados quando o último Ingresso ativo da Compra é cancelado.

## Considered Options

- **Um pagamento por assento (modelo atual)**: rejeitado. Não representa o que o Cliente fez (pagou uma vez) e deixa os Combos sem dono claro.
- **Reembolso como status do pagamento** (`refunded`): rejeitado. Não comporta cancelar 1 de 3 Ingressos.
