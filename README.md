# Nexo Assist — O Agent do Service Desk de TI

Solução desenvolvida para o desafio técnico prático da Nexo. O **Nexo Assist** é um assistente conversacional inteligente projetado para atuar no Service Desk de TI de uma empresa com ~2.000 funcionários, eliminando formulários engessados, resolvendo dúvidas sem fila, prevenindo chamados duplicados e orquestrando o transbordo inteligente para analistas humanos.

---

## 🚀 Como Rodar Localmente

A aplicação foi desenhada para rodar em poucos comandos de forma simples e sem dependências externas complexas.

### Pré-requisitos
* Node.js v18+ (testado e homologado no Node v24)
* npm v9+

### 1. Clonar e Instalar Dependências
```bash
# Instalar pacotes
npm install
```

### 2. Configurar Variáveis de Ambiente
O projeto já conta com um `.env.example`. Copie para `.env` (os valores padrão já funcionam imediatamente):
```bash
cp .env.example .env
```
*(Opcional: adicione uma `GEMINI_API_KEY` se desejar chamadas dinâmicas ao modelo Gemini; caso ausente, o motor autônomo executa todas as regras do Anexo A com previsibilidade e sem custos).*

### 3. Sincronizar o Banco de Dados e Rodar o Seed
O projeto utiliza **SQLite** com **Prisma ORM**, persistindo todos os dados no arquivo local `prisma/dev.db`:
```bash
# Cria o banco SQLite e gera o cliente Prisma
npx prisma db push

# Popula o banco com os usuários, chamados e artigos do Anexo B
npm run seed
```

### 4. Iniciar a Aplicação
```bash
npm run dev
```
Acesse no seu navegador: **[http://localhost:3000](http://localhost:3000)**

### 5. Executar a Suíte de Testes Automatizados
```bash
npm test
```

---

## 👤 Personas de Demonstração Rápidas

Para facilitar a avaliação de cada cenário do PRD, a tela de login conta com atalhos de 1 clique:

| Persona | E-mail | Perfil / Cenário |
| :--- | :--- | :--- |
| **Ana Souza** | `ana.souza@nexo.com.br` | Funcionária (Financeiro): Caso VPN Erro 809 (Tela 2) e Consulta de Chamado Vencido INC-20311 (Tela 3). |
| **Rafael Lima** | `rafael.lima@nexo.com.br` | Analista Suporte N2: Acesso ao Console do Analista, fila de chamados, assumir conversa pausada e suporte direto (Telas 4 e 5). |
| **Carla Mendes** | `carla.mendes@nexo.com.br` | Funcionária (Vendas): Chamado de Urgência no SAP e teste de privacidade de dados. |
| **Bruno Tavares** | `bruno.tavares@nexo.com.br` | Funcionário (Marketing): Caso de Baixa Confiança (41%) com transbordo automático. |

---

## 🏛️ Visão Geral da Arquitetura

O sistema é construído sob uma arquitetura limpa com separação estrita de responsabilidades:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                           │
│  - /login   : Identificação e showcase (Fiel ao Frame 0)               │
│  - /chat    : Atendimento conversacional com o Nexo Assist (Frames 1-2)│
│  - /analyst : Console do Analista N1/N2 em 3 colunas (Frames 3-4)      │
│  - /perfil  : Perfil do colaborador e gestão de senha (Frame 5)        │
│  - DecisionInspector: Gaveta de transparência e auditoria de IA (Req 7)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API ROUTES & CONTROLLERS (Next.js)                  │
│  /api/auth/*  |  /api/chat/*  |  /api/tickets/*  |  /api/analyst/*     │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐ ┌──────────────▼────────────────────┐
│      AGENT DECISION ENGINE       │ │   SERVIÇO DE CHAMADOS SIMULADO    │
│  - Intent & Entity Extraction    │ │  (LegacyTicketService)            │
│  - Regras de Negócio (Anexo A)   │ │  - Consulta, Criação e Edição     │
│  - Transparência & Confiança %   │ │  - Verificação de Privacidade     │
│  - Central de Ajuda (KB Service) │ │  - Simulação de instabilidade     │
└───────────────────┬──────────────┘ └──────────────┬────────────────────┘
                    │                               │
┌───────────────────▼───────────────────────────────▼────────────────────┐
│               PERSISTÊNCIA (SQLite + Prisma 5 ORM)                     │
│  - User | Ticket | KnowledgeArticle | Conversation | Message           │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Interface (Next.js 15 App Router & Tailwind CSS)**:
   - Desenvolvida com fidelidade pixel-perfect ao protótipo do arquivo `nexo.pen`.
   - Utiliza as cores e tokens do design system (`$paper`, `$desk`, `$ink`, `$rule`, `$primary`, etc.).
   - Componentes ricos: cards de chamado, pílulas de ação, rascunho com botões de confirmação (`[Confirmar ⌘↵]`, `[Editar]`, `[Cancelar]`), botões de múltipla escolha e contador de limite de 30 mensagens por sessão.

2. **Agente & Motor de Decisão (`src/agent/`)**:
   - Módulo desacoplado responsável por interpretar cada turno de conversa.
   - Avalia escopo de TI, consulta a Central de Ajuda, verifica chamados existentes, classifica prioridades e monta o rascunho antes da abertura.
   - Gera metadados de visibilidade estruturada em cada resposta.

3. **Serviço de Chamados Simulado (`src/services/ticket-service.ts`)**:
   - Camada isolada do agente que simula o sistema legado de chamados.
   - Aplica isolamento de privacidade (Ana não acessa chamados de Carla).
   - Suporta simulação de falhas transitórias e latência via flag `SIMULATE_LEGACY_FLAKINESS`.

4. **Persistência (`prisma/schema.prisma`)**:
   - Armazenamento em SQLite (`dev.db`), garantindo que conversas, mensagens, chamados e estados de atendimento sobrevivam a reinicializações da aplicação.

---

## 🧠 Como o Agent Decide o que Fazer

O motor de decisão do Nexo Assist segue rigorosamente o pipeline de raciocínio orientado pelas regras do **Anexo A**:

1. **Filtro de Limite de Escopo**:
   - Identifica se a dúvida trata de assuntos alheios a TI (ex: RH, salários, férias, facilities).
   - Quando fora de escopo, responde com cortesia explicando sua especialidade e sugerindo os canais adequados.
2. **Autoatendimento sem Fila (Central de Ajuda)**:
   - Busca na base de conhecimento. Se houver procedimento homologado compatível com o sistema operacional do usuário, entrega a solução imediatamente.
   - Caso o artigo informe que a versão do usuário necessita de atendimento (ex: VPN Erro 809 no Windows 11 vs Windows 10), inicia o processo de abertura de chamado.
3. **Prevenção de Duplicidade (Anti-Duplicidade)**:
   - Antes de abrir um novo chamado, verifica se o usuário já possui um chamado aberto sobre o mesmo sistema ou componente.
   - Se existir, oferece a atualização do chamado existente com novas informações, prevenindo duplicações na fila dos analistas.
4. **Matriz de Prioridade & Prazos (SLA)**:
   - Avalia o impacto (indivíduo, equipe ou empresa) e urgência (reunião agendada ou compromisso no mesmo dia):
     - **Crítica**: Impacto em equipe ou empresa parada $\rightarrow$ **1 hora** (plantão 24h).
     - **Alta**: Impede 1 pessoa de trabalhar ou reunião no mesmo dia $\rightarrow$ **4 horas úteis**.
     - **Média**: Atrapalha mas há alternativa de trabalho $\rightarrow$ **3 dias úteis**.
     - **Baixa**: Pedidos e melhorias sem urgência $\rightarrow$ **5 dias úteis**.
5. **Rascunho Pré-Abertura (Confirmação Obrigatória)**:
   - O chamado nunca é persistido diretamente: o agente monta o card de rascunho estruturado (`Rascunho D-381`) e aguarda o clique em `Confirmar` pelo colaborador.
6. **Transbordo para Atendente Humano**:
   - Acontece automaticamente quando:
     a) O usuário solicita expressamente ("falar com um analista").
     b) O chamado em consulta está vencido (ex: `INC-20311` parado há 5 dias com SLA de 3 dias).
     c) O grau de segurança/confiança do agente é inferior a 60% (ex: `confiança 41%`).
   - Ao transferir, o agente **para de responder** enquanto a conversa estiver aguardando ou sob atendimento de um analista.

---

## 🔍 Visibilidade das Decisões (Parte Mais Importante do Desafio)

Para atender com excelência ao requisito 7 do PRD:
* **Acima de cada resposta**: Exibição das pílulas de ação rápida (`consultou seus chamados`, `classificou a prioridade`, `montou o rascunho`).
* **Botão "Ver decisão IA"**: Abre uma gaveta lateral de inspeção profunda (*Decision Inspector Drawer*), expondo:
  * **Intenção Reconhecida**: Ex: `CLASSIFICAR_PRIORIDADE_E_MONTAR_RASCUNHO`
  * **Ação Executada**: Ex: `PROPOSE_DRAFT`
  * **Grau de Segurança (Confiança)**: Barra percentual visual (ex: `98%` verde ou `41%` vermelho)
  * **Regra de Negócio Aplicada**: Citação direta da regra do Anexo A
  * **Por que esta ação foi tomada**: Justificativa detalhada do raciocínio
  * **Entidades e Parâmetros Extraídos**: JSON estruturado dos dados detectados

---

## ⚖️ Principais Trade-offs

1. **SQLite com Prisma vs PostgreSQL / Redis**:
   - *Decisão*: Optou-se por SQLite local para proporcionar uma experiência **zero-setup** ao avaliador. A aplicação roda instantaneamente em qualquer máquina sem precisar instalar Docker ou configurar bancos em nuvem.
2. **Motor Híbrido Autônomo com Suporte Opcional a LLM**:
   - *Decisão*: O motor implementa algoritmos determinísticos de NLP e regras do Anexo A com latência sub-100ms e custo zero por conversa, eliminando o risco de falhas por falta de cota ou rede. Quando uma chave de API (`GEMINI_API_KEY`) é fornecida, ela enriquece a variação semântica mantendo as mesmas regras seguras.
3. **Simulação de Sistema Legado Isolada**:
   - *Decisão*: O serviço de chamados reside em módulo desacoplado (`LegacyTicketService`) simulando as regras de um sistema ERP/ITSM real com latências pontuais e verificações estritas de permissão.

---

## 🔮 O Que Faria com Mais Tempo

1. **WebSockets Bidirecionais com Socket.io ou WebRTC DataChannels**:
   - Para envio de digitação em tempo real ("digitando...") e notificações sonoras instantâneas no console do analista.
2. **Busca Vetorial RAG com Embeddings**:
   - Vetorização de artigos da base de conhecimento com pgvector para suportar bases com milhares de artigos e busca híbrida (BM25 + Dense Retrieval).
3. **Integrações de Canal Corporativo**:
   - Adaptador para conectar o bot diretamente como app do Microsoft Teams ou Slack via webhooks.
4. **Análise de Sentimento e SLA Preditivo**:
   - Painel para o gestor com predição de risco de estouro de SLA antes que o chamado vença.

---

## 📄 Licença
Projeto desenvolvido exclusivamente para o processo seletivo da Beyond the Bytes / Nexo.
