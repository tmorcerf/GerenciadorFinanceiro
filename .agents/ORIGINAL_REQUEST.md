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

## Follow-up — 2026-07-27T22:36:35Z

Implement a conversational AI categorizer ("Grill-Me" style) in the Corta Gastos app. The AI should ask the user for clarification on ambiguous transactions via a side-chat UI, and save the learnings to a Firebase "Regras Pessoais" collection to prevent asking the same question twice.

Working directory: c:\Corta Gastos\App
Integrity mode: development

## Requirements

### R1. AI Categorizer Backend Update
Modify `ia_categorizador.js` to return a hybrid JSON output that includes a status field (`"certeza"` or `"duvida"`). When in doubt, the AI must provide a conversational question asking the user for clarification about the specific transaction.

### R2. Interactive Chat UI
Add a side-panel or modal chat interface in the import screen (`importacao.js`/`importacao.html`). When the AI returns a "duvida" for any transactions, pause the processing and ask the questions sequentially in the chat. Allow the user to respond (via text or category buttons).

### R3. Continuous Learning (Personal Rules)
When the user answers the AI's question, apply the category to the transaction and save the rule to a new `RegrasIA` collection in Firebase (tied to the user's `groupId`). Inject these rules into future AI prompts so the AI does not ask about the same entity twice.

## Acceptance Criteria

### Verification
- [ ] The `ia_categorizador.js` handles the new dual-status JSON format without breaking existing certainty matches.
- [ ] A chat interface is visibly triggered when a transaction requires clarification.
- [ ] The user's answer correctly updates the row's category and subcategory.
- [ ] A new document is successfully written to the `RegrasIA` Firebase collection containing the learned rule.
