# Verzel

Venda e validação de ingressos para sessões de cinema: cinemas publicam sessões, clientes compram assentos, porteiros validam na entrada.

## Language

### Pessoas e papéis

**Cliente**:
Pessoa que compra Ingressos. Papel padrão de toda conta.
_Evitar_: comprador, usuário

**Organizador**:
Pessoa que administra um Cinema. Uma conta tem um único papel; o Organizador usa outra conta para comprar.
_Evitar_: dono, admin

**Porteiro**:
Conta de serviço criada por um Organizador para validar Ingressos das Sessões do seu Cinema.
_Evitar_: gatekeeper, portaria (como pessoa)

### Cinema

**Cinema**:
O negócio (CNPJ, endereço) ao qual pertencem Salas, Combos e Porteiros. Hoje 1:1 com o Organizador.
_Evitar_: venue, estabelecimento

**Sala**:
Modelo de grade de assentos (fileiras × colunas) de um Cinema, de onde a Sessão copia sua grade ao ser criada.

**Sessão**:
Exibição de um filme numa Sala num horário, com um preço de venda atual (cada Ingresso guarda o preço que foi pago). Estados: Rascunho → Publicada, Rascunho → Cancelada, Publicada → Cancelada; Cancelada é terminal e não há volta de Publicada para Rascunho. Enquanto houver Assento Reservado ou Ocupado, horário, filme, duração, Sala e grade ficam travados; o preço continua editável. Só pode ser cancelada antes do início; o cancelamento reembolsa todos os Ingressos não cancelados, inclusive os Utilizados.
_Evitar_: evento, event, screening, exibição

**Assento**:
Posição (fileira, coluna, rótulo como "A1") na grade de uma Sessão. Está Livre, Reservado (tem uma Reserva ativa) ou Ocupado (tem um Ingresso não cancelado).

**Combo**:
Produto adicional de um Cinema (ex.: pipoca + refrigerante), comprado junto com Ingressos numa Compra. Ativo (à venda) ou Inativo (fora da venda, reversível). A Compra guarda como o Combo era no momento da venda (nome, descrição, preço), então editar ou excluir o Combo não altera Compras passadas.

### Compra

**Reserva**:
Bloqueio temporário (10 min) de um Assento por um Cliente, enquanto ele paga. Termina por Compra, desistência do Cliente ou expiração; um pagamento recusado não a termina. Um Cliente tem no máximo 10 Reservas ativas por Sessão.
_Evitar_: hold, bloqueio

**Compra**:
Um checkout pago e aprovado: um pagamento contendo de 1 a 10 Ingressos da mesma Sessão e opcionalmente Combos. Os preços cobrados são os vigentes no momento da Compra. Tentativa recusada não é Compra.
_Evitar_: pedido, order, transação

**Ingresso**:
Direito de um Portador entrar numa Sessão num Assento específico, provado por um QR assinado. Estados: Válido, Utilizado, Cancelado (com motivo), Expirado.
_Evitar_: ticket, entrada

**Reembolso**:
Devolução de parte ou de todo o valor de uma Compra, com motivo: cancelado pelo cliente (só Ingressos não Utilizados) ou sessão cancelada (todos os Ingressos não cancelados).
_Evitar_: estorno

**Titular**:
O Cliente que fez a Compra. Só ele cancela Ingressos (até 2h antes do início da Sessão) e recebe Reembolsos, mesmo depois de compartilhá-los.
_Evitar_: dono

**Portador**:
Quem apresenta o QR do Ingresso na Portaria; tem direito a entrar, não a cancelar.

**Compartilhamento de ingresso**:
Entrega do Ingresso a outra pessoa por link: ela vira Portadora, mas o Titular não muda.
_Evitar_: transferência

### Entrada

**Portaria**:
Posto/área do app onde Porteiros e Organizadores validam Ingressos.

**Validação**:
Ato de conferir um Ingresso na Portaria e marcá-lo como Utilizado, permitido de 1h antes do início até o fim da Sessão. Registra quem validou, mesmo que essa conta seja excluída depois.
_Evitar_: check-in, leitura
