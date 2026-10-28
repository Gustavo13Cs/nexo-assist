# Nexo Assist — O Agent do Service Desk de TI

Solução desenvolvida para o desafio prático de contratação da Nexo. O **Nexo Assist** é um assistente conversacional inteligente projetado para atuar no Service Desk de TI de uma empresa com ~2.000 funcionários, eliminando formulários engessados, resolvendo dúvidas sem fila, prevenindo chamados duplicados e orquestrando o transbordo inteligente para analistas humanos.

---

## 🌐 Deploy em Produção (Diferencial)

A aplicação está publicada e pronta para testes online sem necessidade de instalação local:

🔗 **Link de Acesso Online:** **[https://nexo-nine-theta.vercel.app](https://nexo-nine-theta.vercel.app)**  
*(Espelho oficial na Vercel: [https://nexo-3reloumqz-gustavocunha0401-2427s-projects.vercel.app](https://nexo-3reloumqz-gustavocunha0401-2427s-projects.vercel.app))*

> **Como o deploy foi arquitetado:**
> O deploy foi realizado na plataforma **Vercel** conectado diretamente ao repositório GitHub (`Gustavo13Cs/nexo-assist`). Para garantir o funcionamento autônomo do banco de dados SQLite no ambiente serverless (cujo sistema de arquivos raiz é read-only), implementamos:
> 1. Pipeline de build que gera o schema do Prisma e popula os dados do Anexo B (`prisma db push && npm run seed`).
> 2. Mecanismo de inicialização transparente no `src/lib/prisma.ts` que copia o SQLite pré-populado para o diretório `/tmp`, garantindo escrita e persistência durante a sessão sem falhas de permissão.
> 3. Integração com o fallback autônomo baseado no Anexo A, permitindo que a aplicação responda a qualquer caso com 0 custos de API e latência imediata.

---

## 🚀 Como Rodar a Aplicação Localmente

Você pode executar o **Nexo Assist** de duas maneiras: diretamente via **Docker** (recomendado para homologação em container isolado) ou localmente via **Node.js**.

---

### Opção 1: Executar via Docker (Recomendado — 1 Comando)

O projeto conta com `Dockerfile` e `docker-compose.yml` prontos para produção com persistência automática do SQLite via volume.

#### 1. Iniciar o Container
```bash
docker compose up --build -d
```
O container executará automaticamente a compilação, o sync do schema (`npx prisma db push`), o seed dos dados (`npm run seed`) e subirá o servidor Next.js em modo de produção.

#### 2. Acessar a Aplicação
Acesse no seu navegador: **[http://localhost:3000](http://localhost:3000)**

#### Comandos Úteis do Docker:
* **Ver logs em tempo real:**
  ```bash
  docker compose logs -f app
  ```
* **Parar o container:**
  ```bash
  docker compose down
  ```
* **Executar os testes automatizados dentro do container:**
  ```bash
  docker compose exec app npm test
  ```

---

### Opção 2: Executar no Host Local (Node.js)

#### Pré-requisitos
* Node.js v18+ (homologado no Node v24)
* npm v9+

#### 1. Instalar Dependências
```bash
npm install
```

#### 2. Configurar Variáveis de Ambiente
O projeto conta com o arquivo `.env.example`. Copie para `.env`:
```bash
cp .env.example .env
```
> **Nota sobre o Provedor de LLM (Gemini):**
> Você pode rodar **100% de graça**! No [Google AI Studio](https://aistudio.google.com), a API do Gemini possui um **Free Tier sem custo (R$ 0,00)**. Caso deseje chamadas ao modelo, basta colocar sua chave em `GEMINI_API_KEY`. Se **não colocar nenhuma chave**, o Nexo Assist aciona automaticamente seu motor autônomo local, que interpreta qualquer mensagem (impressora, mouse, Office, VPN, SAP) e aplica as regras do Anexo A sem falhas e sem custo.

#### 3. Sincronizar o Banco de Dados e Rodar o Seed
O projeto utiliza **SQLite** com **Prisma ORM**, persistindo todos os dados no arquivo local `prisma/dev.db`:
```bash
# Cria as tabelas no SQLite local
npx prisma db push

# Popula o banco com os usuários, chamados e artigos do Anexo B
npm run seed
```

#### 4. Iniciar a Aplicação
```bash
npm run dev
```
Acesse no navegador: **[http://localhost:3000](http://localhost:3000)**

#### 5. Executar a Suíte de Testes Automatizados
```bash
npm test
```

---

## 👤 Personas de Demonstração Rápidas

Para facilitar a avaliação de cada cenário do PRD, a tela de login conta com atalhos de 1 clique:

| Persona | E-mail | Perfil / Cenário no PRD |
| :--- | :--- | :--- |
| **Ana Souza** | `ana.souza@nexo.com.br` | Funcionária (Financeiro): Caso VPN Erro 809 (Tela 2) e Consulta de Chamado Vencido INC-20311 (Tela 3). |
| **Rafael Lima** | `rafael.lima@nexo.com.br` | Analista Suporte N2: Acesso ao Console do Analista, fila de chamados, assumir conversa pausada e suporte direto (Telas 4 e 5). |
| **Carla Mendes** | `carla.mendes@nexo.com.br` | Funcionária (Vendas): Chamado de Urgência no SAP e teste de privacidade de dados (reabertura em até 7 dias). |
| **Bruno Tavares** | `bruno.tavares@nexo.com.br` | Funcionário (Marketing): Caso de Baixa Confiança (41%) com transbordo automático para analista. |

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
                                    │ HTTP / REST (com Polling em tempo real)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    API ROUTES & CONTROLLERS (Next.js)                  │
│  /api/auth/*  |  /api/chat/*  |  /api/tickets/*  |  /api/analyst/*     │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐ ┌──────────────▼────────────────────┐
│      AGENT DECISION ENGINE       │ │   SERVIÇO DE CHAMADOS SIMULADO    │
│  - Gemini Flash (Tool Calling)   │ │  (LegacyTicketService)            │
│  - Motor Local de Regras Anexo A │ │  - Consulta, Criação e Edição     │
│  - Anti-Duplicidade Dinâmica     │ │  - Verificação Estrita de Acesso  │
│  - Transparência & Confiança %   │ │  - Resiliência (Retry com backoff)│
└───────────────────┬──────────────┘ └──────────────┬────────────────────┘
                    │                               │
┌───────────────────▼───────────────────────────────▼────────────────────┐
│               PERSISTÊNCIA (SQLite + Prisma 5 ORM)                     │
│  - User | Ticket | KnowledgeArticle | Conversation | Message           │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Interface (Next.js 15 App Router & Tailwind CSS)**:
   - Desenvolvida com fidelidade visual ao protótipo do arquivo `nexo.pen`.
   - Utiliza os tokens oficiais (`$paper`, `$desk`, `$ink`, `$rule`, `$primary`, `$cta`, etc.).
   - Componentes ricos: cards de chamado com estado expandido real, rascunho com botões de **Confirmar**, **Editar** (com formulário inline) e **Cancelar**, opções rápidas e contador de limite de 30 mensagens por sessão.
   - **Atualização em tempo real**: polling suave a cada 3s para que mensagens do analista apareçam imediatamente no chat do colaborador e vice-versa.

2. **Agente & Motor de Decisão (`src/agent/`)**:
   - Arquitetura Híbrida: integra com o **Google Gemini Flash** via structured outputs quando a chave está configurada, ou executa o motor autônomo local baseado nas regras do Anexo A.
   - Interpreta qualquer relato técnico (VPN, impressora, mouse danificado, reinstalação do Office, lentidão, problemas no SAP).
   - Conecta os chamados criados ou consultados à conversa (`ticketId`), alimentando a coluna "Desta conversa" do console do analista.

3. **Serviço de Chamados Legado (`src/services/ticket-service.ts`)**:
   - Camada desacoplada do agente que simula o sistema legado corporativo.
   - **Tolerância a falhas (Resiliência)**: implementa retry automático com backoff exponencial (`executeWithRetry`) para contornar indisponibilidades transitórias.
   - Aplica controle de privacidade rígido (colaboradores nunca enxergam chamados de terceiros).
   - Suporta complementação de chamados abertos e reabertura de chamados resolvidos há até 7 dias.

4. **Persistência (`prisma/schema.prisma`)**:
   - SQLite em arquivo (`dev.db`), garantindo que conversas, mensagens, chamados e status de atendimento sobrevivam a reinicializações da aplicação.

---

## 🧠 Como o Agent Decide o que Fazer

O fluxo decisório segue as regras do **Anexo A** do PRD:

1. **Filtro de Limite de Escopo**:
   - Identifica tópicos fora de TI (RH, férias, folha de pagamento, benefícios, facilities).
   - Redireciona com cortesia apontando para os canais corretos.
2. **Autoatendimento sem Fila (Central de Ajuda)**:
   - Consulta a base de conhecimento. Se houver procedimento homologado compatível com o sistema operacional do usuário, entrega a resposta imediata.
   - Se o artigo estipula que a versão do usuário exige abertura de chamado (ex: Erro 809 no Windows 11), prossegue para o fluxo de chamado.
3. **Prevenção de Duplicidade (Anti-Duplicidade)**:
   - Antes de abrir um novo chamado, verifica se já existe chamado aberto sobre o mesmo componente/problema.
   - Se houver, oferece a atualização do chamado existente, evitando poluição da fila.
4. **Matriz de Prioridade & Prazos (SLA)**:
   - Avalia impacto (indivíduo vs equipe/empresa) e urgência (compromisso no mesmo dia):
     - **Crítica**: Equipe ou empresa parada $\rightarrow$ **1 hora** (plantão 24h) com transferência imediata.
     - **Alta**: Impede 1 pessoa de trabalhar ou reunião no mesmo dia $\rightarrow$ **4 horas úteis**.
     - **Média**: Atrapalha mas há alternativa $\rightarrow$ **3 dias úteis**.
     - **Baixa**: Pedidos e melhorias sem urgência $\rightarrow$ **5 dias úteis**.
5. **Rascunho Pré-Abertura (Confirmação Obrigatória)**:
   - Nenhum chamado é gravado sem confirmação do colaborador. O agente monta o card de rascunho com categoria, prioridade e SLA, permitindo ao usuário **Confirmar**, **Editar** ou **Cancelar**.
6. **Transbordo para Atendente Humano**:
   - Acionado quando:
     a) O usuário solicita ("falar com um analista").
     b) O chamado em consulta está vencido (SLA estourado em relação ao último update).
     c) O chamado é de prioridade Crítica.
     d) O grau de segurança/confiança do agente é inferior a 60% (ex: `confiança 41%` no caso do Bruno Tavares).
   - O agente **para de responder** enquanto a conversa estiver aguardando ou sob atendimento do analista.

---

## 🔍 Visibilidade das Decisões (Requisito 7 do PRD)

Acima de cada resposta, o protótipo exibe as pílulas de ação rápida (`consultou seus chamados`, `classificou a prioridade`, `montou o rascunho`).

Clicando no botão **"Ver decisão IA"**, abre-se o painel lateral de auditoria (*Decision Inspector Drawer*):
* **Intenção Reconhecida**: Ex: `CLASSIFICAR_PRIORIDADE_E_MONTAR_RASCUNHO`, `ANTI_DUPLICIDADE`.
* **Ação Executada**: Ex: `PROPOSE_DRAFT`, `OFFER_TRANSFER_OVERDUE`.
* **Grau de Segurança (Confiança %)**: Barra visual percentual (ex: `98%` verde ou `41%` vermelho quando há baixa confiança).
* **Regra de Negócio Aplicada**: Citação formal da regra do Anexo A.
* **Por que esta ação foi tomada**: Justificativa detalhada do raciocínio.
* **Entidades e Parâmetros Extraídos**: JSON estruturado dos dados detectados.

---

## 🛡️ Como Garantimos a Qualidade das Decisões

1. **Testes Automatizados de Regras de Negócio**:
   - Suíte com testes cobrindo cálculo de SLA de todas as prioridades, cálculo de horas úteis, detecção de chamado vencido por `lastUpdate`, regra de reabertura (≤ 7 dias vs > 7 dias), isolamento estrito de privacidade entre colaboradores e transbordo por baixa confiança (< 60%).
2. **Separação entre Raciocínio e Validação**:
   - Mesmo quando a LLM propõe uma prioridade ou categoria, os limites estritos (SLA, permissões e status) são validados por regras determinísticas no código.
3. **Auditoria Transparente**:
   - Cada mensagem do assistente grava no banco um payload estruturado (`decisionDetail`) auditável pelo colaborador e pelo analista.

---

## 💡 Escolha do Modelo de LLM & Custo por Conversa

* **Modelo Escolhido**: **Gemini 2.5 Flash / 1.5 Flash** (Google DeepMind).
* **Justificativa**:
  1. **Custo por conversa**: No nível gratuito (Google AI Studio Free Tier), o custo é **R$ 0,00**. Em uso pago comercial, custa apenas US$ 0,075 por milhão de tokens de entrada, resultando em menos de R$ 0,001 por conversa completa de 10 turnos.
  2. **Latência**: Resposta em ~400ms, ideal para chat em tempo real.
  3. **Suporte Nativo a JSON Schema**: Garante que o retorno estruturado de intenção, entidades e rascunho nunca quebre a tipagem da aplicação.

---

## ⚖️ Principais Trade-offs

1. **SQLite com Prisma vs PostgreSQL em Nuvem**:
   - *Decisão*: Optou-se por SQLite local para proporcionar uma experiência **zero-setup** ao avaliador. A aplicação roda instantaneamente em qualquer máquina sem precisar instalar Docker ou configurar bancos em nuvem.
2. **Motor Híbrido Autônomo com Fallback Local**:
   - *Decisão*: Garantir que o projeto funcione perfeitamente com ou sem chave de API, mantendo tempo de resposta instantâneo e eliminando o risco de falhas na avaliação.
3. **Polling Suave (3s) vs WebSocket Complexo**:
   - *Decisão*: Implementou-se polling a cada 3s para sincronização em tempo real entre analista e colaborador. É simples, robusto, não requer infraestrutura de stateful WebSocket e cumpre com excelência o requisito de sincronização visual.

---

## 🔮 O Que Faria com Mais Tempo

1. **WebSockets Bidirecionais com Socket.io ou WebRTC DataChannels**:
   - Para envio de digitação em tempo real ("digitando...") e notificações sonoras instantâneas no console do analista.
2. **Busca Vetorial RAG com Embeddings**:
   - Vetorização de artigos da base de conhecimento com pgvector para suportar bases com milhares de artigos e busca híbrida (BM25 + Dense Retrieval).
3. **Integrações de Canal Corporativo**:
   - Adaptador para conectar o bot diretamente como app do Microsoft Teams ou Slack via webhooks.

---

## 📄 Licença
Projeto desenvolvido exclusivamente para o processo seletivo da Beyond the Bytes / Nexo.
