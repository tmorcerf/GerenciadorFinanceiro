# Original User Request

## Initial Request — 2026-07-24T10:24:18Z

O sistema deve gerenciar de forma inteligente a conciliação de transferências (partida dobrada). Quando uma transferência é importada, o sistema deve ser capaz de criar a contra-partida na conta destino. Se o destino estiver em branco, deve marcar como pendente. Erros ou inconsistências (como conflitos com contas já conciliadas) devem ser resolvidos através de uma interface visual dedicada ("Central de Conciliação") que exibe alertas e sugestões inteligentes para o usuário.

Working directory: c:/Corta Gastos/App
Integrity mode: development

## Requirements

### R1. Lógica de Contra-partida Automática
Quando um lançamento for classificado como "TRANSFERENCIA" (incluindo pagamentos de fatura ou aplicações) e possuir um destino claro, o sistema deve ser capaz de gerar ou parear com o lançamento correspondente (débito/crédito) na conta destino informada na subcategoria.

### R2. Tratamento de Destinos Pendentes
Se o usuário (ou importador) deixar a conta destino/origem em branco, o sistema NÃO deve criar uma conta física provisória. Ele deve marcar a transferência como "Pendente de Destino" e destacá-la na Central de Conciliação, sem afetar saldos de outras contas físicas até ser resolvido.

### R3. Central Visual de Conciliação de Transferências
Criar/expandir a "Central de Conciliação" (painel dedicado na UI) para focar especificamente nestes cenários de transferência. A interface deve:
- Listar as transferências "Pendentes de Destino".
- Listar as transferências que conflitam com a realidade de contas já conciliadas/bloqueadas.
- Apresentar sugestões visuais da IA para dar o "match" correto ou corrigir o destino errado, aguardando aprovação manual do usuário.

## Acceptance Criteria

### Lógica de Transferência
- [ ] O código identifica lançamentos de Transferência de forma determinística.
- [ ] Transferências sem destino ficam com status visual indicando "Pendente" (ex: um campo de erro ou flag no JSON).

### Resolução de Conflitos (Regra de Ouro)
- [ ] Se a Conta X está marcada como "Conciliada" (bloqueada), o sistema nunca força alterações nela. Em vez disso, ele usa os dados da Conta X como "Verdade Absoluta" para sugerir a correção no lançamento errado da Conta Y.

### Interface da Central de Conciliação
- [ ] A tela exibe claramente os alertas de transferências soltas ou erradas.
- [ ] O usuário consegue visualizar a sugestão e com 1 clique aceitar a correção (ex: alterar a subcategoria da transferência e engatilhar o salvamento no banco).
