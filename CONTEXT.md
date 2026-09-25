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
Exibição de um filme numa Sala num horário, com preço único por Ingresso. Estados: Rascunho, Publicada, Cancelada (terminal).
_Evitar_: evento, event, screening, exibição

**Assento**:
Posição (fileira, coluna, rótulo como "A1") na grade de uma Sessão.

**Combo**:
Produto adicional de um Cinema (ex.: pipoca + refrigerante), comprado junto com Ingressos numa Compra.

### Compra

**Reserva**:
Bloqueio temporário (10 min) de um Assento por um Cliente, enquanto ele paga.
_Evitar_: hold, bloqueio

**Compra**:
Um checkout pago e aprovado: um pagamento contendo de 1 a 10 Ingressos da mesma Sessão e opcionalmente Combos. Tentativa recusada não é Compra.
_Evitar_: pedido, order, transação

**Ingresso**:
Direito de um portador entrar numa Sessão num Assento específico, provado por um QR assinado. Estados: Válido, Utilizado, Cancelado (com motivo), Expirado.
_Evitar_: ticket, entrada

**Reembolso**:
Devolução de parte ou de todo o valor de uma Compra, com motivo: cancelado pelo cliente ou sessão cancelada.
_Evitar_: estorno

**Compartilhamento de ingresso**:
Entrega do Ingresso a outra pessoa por link; quem tem o QR pode usá-lo, a titularidade não muda.
_Evitar_: transferência

### Entrada

**Portaria**:
Posto/área do app onde Porteiros e Organizadores validam Ingressos.

**Validação**:
Ato de conferir um Ingresso na Portaria e marcá-lo como Utilizado, permitido de 1h antes do início até o fim da Sessão.
_Evitar_: check-in, leitura
