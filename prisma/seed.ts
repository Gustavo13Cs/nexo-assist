import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed completo do banco Nexo Assist...");

  // Limpar tabelas existentes
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.user.deleteMany();

  // 1. Criar Usuários
  const ana = await prisma.user.create({
    data: {
      email: "ana.souza@nexo.com.br",
      name: "Ana Souza",
      role: "EMPLOYEE",
      department: "Financeiro",
      initials: "AS",
    },
  });

  const carla = await prisma.user.create({
    data: {
      email: "carla.mendes@nexo.com.br",
      name: "Carla Mendes",
      role: "EMPLOYEE",
      department: "Vendas",
      initials: "CM",
    },
  });

  const bruno = await prisma.user.create({
    data: {
      email: "bruno.tavares@nexo.com.br",
      name: "Bruno Tavares",
      role: "EMPLOYEE",
      department: "Marketing",
      initials: "BT",
    },
  });

  const diego = await prisma.user.create({
    data: {
      email: "diego.ramos@nexo.com.br",
      name: "Diego Ramos",
      role: "EMPLOYEE",
      department: "Operações",
      initials: "DR",
    },
  });

  const elisa = await prisma.user.create({
    data: {
      email: "elisa.prado@nexo.com.br",
      name: "Elisa Prado",
      role: "EMPLOYEE",
      department: "Jurídico",
      initials: "EP",
    },
  });

  const fabio = await prisma.user.create({
    data: {
      email: "fabio.nunes@nexo.com.br",
      name: "Fábio Nunes",
      role: "EMPLOYEE",
      department: "Logística",
      initials: "FN",
    },
  });

  const gabriela = await prisma.user.create({
    data: {
      email: "gabriela.rocha@nexo.com.br",
      name: "Gabriela Rocha",
      role: "EMPLOYEE",
      department: "Recursos Humanos",
      initials: "GR",
    },
  });

  const rafael = await prisma.user.create({
    data: {
      email: "rafael.lima@nexo.com.br",
      name: "Rafael Lima",
      role: "ANALYST",
      department: "Suporte N2",
      initials: "RL",
    },
  });

  const juliana = await prisma.user.create({
    data: {
      email: "juliana.costa@nexo.com.br",
      name: "Juliana Costa",
      role: "ANALYST",
      department: "Suporte N1",
      initials: "JC",
    },
  });

  console.log("Usuários criados com sucesso.");

  // 2. Artigos da Central de Ajuda
  await prisma.knowledgeArticle.createMany({
    data: [
      {
        title: "VPN com erro 809 no Windows",
        content:
          "VPN com erro 809: reinstale o cliente de VPN pelo portal de softwares da Nexo e reinicie o computador. Importante: este procedimento automático vale apenas para Windows 10; no Windows 11, deve-se abrir um chamado para a equipe de Redes configurar a rota manualmente.",
        category: "Rede e VPN",
        tags: "vpn, erro 809, rede, windows 10, windows 11, conexao",
        applicableOs: "Windows 10",
      },
      {
        title: "Horário de atendimento do Service Desk e Plantão",
        content:
          "Horário de atendimento padrão: de segunda a sexta, das 8h às 18h. Chamados com prioridade Crítica (impacto em equipe inteira ou parada total da empresa) contam com plantão 24 horas todos os dias.",
        category: "Outros",
        tags: "horario, plantao, suporte, sla, atendimento",
      },
      {
        title: "Redefinição e Desbloqueio de Senha Corporativa",
        content:
          "Para redefinir sua senha de rede ou e-mail corporativo, utilize a opção 'Esqueci minha senha' ou acesse o portal de autoatendimento. A senha deve possuir no mínimo 12 caracteres contendo letras maiúsculas, números e símbolos.",
        category: "Acesso",
        tags: "senha, reset, bloqueio, rede, email, login",
      },
      {
        title: "Solicitação de segundo monitor para Home Office",
        content:
          "Colaboradores em trabalho remoto ou híbrido têm direito a solicitar um segundo monitor Dell 24 polegadas. A requisição é do tipo REQ (prioridade Baixa, prazo de 5 dias úteis) e necessita de aprovação automática do gestor.",
        category: "Hardware",
        tags: "monitor, home office, tela, hardware, requisicao",
      },
      {
        title: "Configuração do Microsoft Outlook e Teams no Celular",
        content:
          "Instale os aplicativos Microsoft Outlook e Microsoft Authenticator pela loja oficial de seu aparelho. Conecte com seu e-mail corporativo @nexo.com.br e autentique o segundo fator (MFA).",
        category: "E-mail",
        tags: "email, celular, outlook, teams, mfa, smartphone",
      },
      {
        title: "Lentidão no notebook após atualização do Windows",
        content:
          "Caso o notebook apresente lentidão após updates do Windows, certifique-se de reiniciar a máquina completamente. Se a lentidão persistir por mais de 24h impedindo o trabalho, abra um chamado para verificação de drivers e integridade.",
        category: "Hardware",
        tags: "notebook, lentidao, windows update, desempenho",
      },
      {
        title: "Acesso ao SAP ERP e desbloqueio de usuário",
        content:
          "Tentativas incorretas de senha bloqueiam o usuário no SAP por 30 minutos para proteção. Se precisar de liberação imediata para fechamento contábil, abra um chamado com prioridade Alta.",
        category: "Acesso",
        tags: "sap, erp, senha, desbloqueio, contabilidade",
      },
      {
        title: "Instalação de programas homologados via Portal da Empresa",
        content:
          "Softwares comuns de trabalho (VS Code, Slack, Zoom, Power BI) podem ser instalados diretamente pelo 'Portal da Empresa' do Windows sem necessidade de permissões de administrador de TI.",
        category: "Software",
        tags: "software, programas, instalacao, portal da empresa, admin",
      },
    ],
  });

  console.log("Artigos da Base de Conhecimento criados.");

  // 3. Chamados (Tickets)
  const now = new Date();
  const daysAgo = (days: number, hours = 0) => {
    return new Date(now.getTime() - (days * 24 + hours) * 60 * 60 * 1000);
  };
  const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

  // Chamado INC-20311 (Ana Souza) - Aberto há 6 dias, última atualização há 5 dias (PRAZO VENCIDO!)
  const inc20311 = await prisma.ticket.create({
    data: {
      ticketNumber: "INC-20311",
      title: "Notebook lento após atualização do Windows",
      description:
        "Lentidão geral desde a atualização de 15/10. Reiniciar e rodar o diagnóstico da central não resolveu.",
      type: "INC",
      category: "Hardware",
      subcategory: "Notebook",
      priority: "MEDIA",
      status: "AGUARDANDO_ANALISTA",
      affectedScope: "INDIVIDUAL",
      userId: ana.id,
      assignedToId: rafael.id,
      slaDeadline: daysAgo(2), // SLA venceu há 2 dias
      createdAt: daysAgo(6, 4),
      lastUpdate: daysAgo(5),
    },
  });

  // Chamado INC-20298 (Ana Souza) - Em andamento
  await prisma.ticket.create({
    data: {
      ticketNumber: "INC-20298",
      title: "Acesso à pasta Financeiro no SharePoint",
      description: "Permissão de gravação na pasta /Financeiro/2026/Auditoria para conciliação contábil.",
      type: "INC",
      category: "Acesso",
      subcategory: "SharePoint",
      priority: "MEDIA",
      status: "EM_ANDAMENTO",
      affectedScope: "INDIVIDUAL",
      userId: ana.id,
      slaDeadline: hoursFromNow(24),
      createdAt: daysAgo(14),
      lastUpdate: daysAgo(2),
    },
  });

  // Chamado REQ-10442 (Ana Souza) - Aprovado
  await prisma.ticket.create({
    data: {
      ticketNumber: "REQ-10442",
      title: "Segundo monitor para home office",
      description: "Solicitação de monitor Dell 24 polegadas para setup de trabalho remoto aprovado pelo gestor.",
      type: "REQ",
      category: "Hardware",
      subcategory: "Periféricos",
      priority: "BAIXA",
      status: "APROVADO",
      affectedScope: "INDIVIDUAL",
      userId: ana.id,
      slaDeadline: hoursFromNow(48),
      createdAt: daysAgo(20),
      lastUpdate: daysAgo(7),
    },
  });

  // Chamados Históricos Resolvidos da Ana
  await prisma.ticket.create({
    data: {
      ticketNumber: "INC-19877",
      title: "Outlook não sincroniza no celular",
      description: "Erro de autenticação moderna no app Outlook para iOS.",
      type: "INC",
      category: "E-mail",
      priority: "MEDIA",
      status: "RESOLVIDO",
      affectedScope: "INDIVIDUAL",
      userId: ana.id,
      slaDeadline: daysAgo(40),
      createdAt: daysAgo(45),
      lastUpdate: daysAgo(40),
      resolvedAt: daysAgo(40),
    },
  });

  await prisma.ticket.create({
    data: {
      ticketNumber: "INC-19410",
      title: "Troca de senha da rede",
      description: "Expirou o prazo de 90 dias para alteração periódica.",
      type: "INC",
      category: "Acesso",
      priority: "BAIXA",
      status: "RESOLVIDO",
      affectedScope: "INDIVIDUAL",
      userId: ana.id,
      slaDeadline: daysAgo(90),
      createdAt: daysAgo(95),
      lastUpdate: daysAgo(90),
      resolvedAt: daysAgo(90),
    },
  });

  // Chamados de Carla Mendes
  await prisma.ticket.create({
    data: {
      ticketNumber: "INC-20150",
      title: "Senha do SAP bloqueada",
      description: "Três tentativas incorretas de senha no ambiente de produção SAP ERP.",
      type: "INC",
      category: "Acesso",
      priority: "MEDIA",
      status: "RESOLVIDO",
      affectedScope: "INDIVIDUAL",
      userId: carla.id,
      slaDeadline: daysAgo(4),
      createdAt: daysAgo(5),
      lastUpdate: daysAgo(4),
      resolvedAt: daysAgo(4), // Menos de 7 dias! Permite reabertura se necessário
    },
  });

  const carlaTicket = await prisma.ticket.create({
    data: {
      ticketNumber: "INC-20518",
      title: "Preciso de acesso ao SAP ainda hoje",
      description: "Fechamento contábil mensal às 17h, usuário sem acesso ao módulo FI.",
      type: "INC",
      category: "Acesso",
      priority: "ALTA",
      status: "AGUARDANDO_ANALISTA",
      affectedScope: "INDIVIDUAL",
      userId: carla.id,
      slaDeadline: hoursFromNow(1),
      createdAt: daysAgo(0, 1),
      lastUpdate: daysAgo(0, 1),
    },
  });

  console.log("Chamados criados.");

  // 4. Conversas e Mensagens Iniciais do Console
  // Conversa da Ana (Transferida / Aguardando atendente com INC-20311)
  const convAna = await prisma.conversation.create({
    data: {
      userId: ana.id,
      ticketId: inc20311.id,
      status: "WAITING_HUMAN",
      transferReason: "Chamado vencido e solicitação expressa do colaborador",
      transferSummary:
        "Ana questionou sobre o INC-20311 (notebook lento após update do Windows). O chamado está parado há 5 dias sem atualização, violando o prazo de 3 dias úteis. Ela solicitou atendimento com analista.",
      confidence: 0.96,
      messageCount: 7,
      createdAt: daysAgo(0, 1),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: convAna.id,
        senderRole: "USER",
        senderName: "Ana Souza",
        content: "Qual o status do meu chamado?",
        createdAt: new Date(Date.now() - 25 * 60 * 1000),
      },
      {
        conversationId: convAna.id,
        senderRole: "AGENT",
        senderName: "Nexo Assist",
        content: "Você tem 3 chamados abertos. Sobre qual deles quer saber?",
        actionBadges: JSON.stringify(["consultou seus chamados"]),
        ticketCards: JSON.stringify([
          {
            number: "INC-20311",
            title: "Notebook lento após atualização",
            status: "Aguardando analista",
            date: "16 out",
          },
          {
            number: "INC-20298",
            title: "Acesso à pasta Financeiro no SharePoint",
            status: "Em andamento",
            date: "14 out",
          },
          {
            number: "REQ-10442",
            title: "Segundo monitor para home office",
            status: "Aprovado",
            date: "09 out",
          },
        ]),
        createdAt: new Date(Date.now() - 24 * 60 * 1000),
      },
      {
        conversationId: convAna.id,
        senderRole: "USER",
        senderName: "Ana Souza",
        content: "INC-20311 · Notebook lento após atualização",
        createdAt: new Date(Date.now() - 22 * 60 * 1000),
      },
      {
        conversationId: convAna.id,
        senderRole: "AGENT",
        senderName: "Nexo Assist",
        content:
          "Está sem atualização há 5 dias, acima do prazo de 3 dias úteis para prioridade média. Quer que eu chame um analista?",
        actionBadges: JSON.stringify(["consultou o INC-20311", "calculou o prazo"]),
        quickOptions: JSON.stringify([
          { id: "call_analyst", label: "Falar com um analista" },
          { id: "add_info", label: "Adicionar informação" },
          { id: "dismiss", label: "Não, obrigado" },
        ]),
        decisionDetail: JSON.stringify({
          intent: "CONSULTAR_STATUS_CHAMADO",
          entities: { ticketNumber: "INC-20311", category: "Hardware" },
          ruleApplied:
            "Anexo A: Prazo de prioridade Média é 3 dias úteis. Chamado parado há 5 dias é considerado vencido, disparando oferta de transbordo para analista.",
          confidence: 0.98,
          action: "OFFER_TRANSFER",
          reasoning: "Chamado parado há 5 dias sem resposta do analista. Ultrapassou o SLA pactuado de 3 dias úteis.",
        }),
        createdAt: new Date(Date.now() - 20 * 60 * 1000),
      },
      {
        conversationId: convAna.id,
        senderRole: "USER",
        senderName: "Ana Souza",
        content: "Está parado há 5 dias. Quero falar com um analista.",
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        conversationId: convAna.id,
        senderRole: "AGENT",
        senderName: "Nexo Assist",
        content: "Encaminhei para o Suporte N2. Um analista vai falar com você em até 2 h úteis.",
        actionBadges: JSON.stringify(["transferiu para analista", "pausou assistente"]),
        createdAt: new Date(Date.now() - 14 * 60 * 1000),
      },
      {
        conversationId: convAna.id,
        senderRole: "SYSTEM",
        senderName: "Sistema",
        content: "Transferida para Suporte N2 · 10:05",
        createdAt: new Date(Date.now() - 14 * 60 * 1000),
      },
    ],
  });

  // Conversa com Carla Mendes (Transferida)
  const convCarla = await prisma.conversation.create({
    data: {
      userId: carla.id,
      ticketId: carlaTicket.id,
      status: "WAITING_HUMAN",
      transferReason: "Urgência alta - fechamento financeiro no mesmo dia",
      transferSummary: "Carla necessita de acesso emergencial ao SAP para fechamento contábil hoje às 17h.",
      confidence: 0.92,
      messageCount: 4,
      createdAt: daysAgo(0, 1),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: convCarla.id,
        senderRole: "USER",
        senderName: "Carla Mendes",
        content: "Preciso de acesso ao SAP ainda hoje para fechamento financeiro.",
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
      },
      {
        conversationId: convCarla.id,
        senderRole: "AGENT",
        senderName: "Nexo Assist",
        content: "Compreendo a urgência. Criei o chamado INC-20518 com prioridade Alta (resposta em até 4h). Como o fechamento é hoje, estou transferindo imediatamente para o analista de plantão.",
        actionBadges: JSON.stringify(["classificou prioridade Alta", "transferiu para analista"]),
        createdAt: new Date(Date.now() - 39 * 60 * 1000),
      },
      {
        conversationId: convCarla.id,
        senderRole: "SYSTEM",
        senderName: "Sistema",
        content: "Transferida para Suporte N2 · 09:58",
        createdAt: new Date(Date.now() - 39 * 60 * 1000),
      },
    ],
  });

  // Conversa com Bruno Tavares (Agent pediu ajuda · confiança 41%)
  const convBruno = await prisma.conversation.create({
    data: {
      userId: bruno.id,
      status: "WAITING_HUMAN",
      transferReason: "Baixa segurança na classificação técnica do problema",
      transferSummary:
        "Bruno relatou problemas com script de automação de marketing em ambiente híbrido não documentado na central de ajuda.",
      confidence: 0.41,
      messageCount: 3,
      createdAt: daysAgo(0, 1),
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: convBruno.id,
        senderRole: "USER",
        senderName: "Bruno Tavares",
        content: "Estou tendo falhas intermitentes com script de automação em ambiente híbrido não documentado na central.",
        createdAt: new Date(Date.now() - 50 * 60 * 1000),
      },
      {
        conversationId: convBruno.id,
        senderRole: "AGENT",
        senderName: "Nexo Assist",
        content: "Vou chamar um analista para isso. Identifiquei que este problema envolve particularidades técnicas avançadas fora da base de autoatendimento.",
        actionBadges: JSON.stringify(["baixa confiança (41%)", "transferiu para analista"]),
        createdAt: new Date(Date.now() - 49 * 60 * 1000),
      },
      {
        conversationId: convBruno.id,
        senderRole: "SYSTEM",
        senderName: "Sistema",
        content: "Transferida para Suporte N2 · 09:51",
        createdAt: new Date(Date.now() - 49 * 60 * 1000),
      },
    ],
  });

  // Conversa com Diego Ramos (Agent atendendo)
  await prisma.conversation.create({
    data: {
      userId: diego.id,
      status: "AGENT_ACTIVE",
      confidence: 0.88,
      messageCount: 2,
      createdAt: daysAgo(0, 1),
    },
  });

  // Conversa com Elisa Prado (Agent atendendo)
  await prisma.conversation.create({
    data: {
      userId: elisa.id,
      status: "AGENT_ACTIVE",
      confidence: 0.95,
      messageCount: 4,
      createdAt: daysAgo(0, 2),
    },
  });

  // Conversas Resolvidas
  await prisma.conversation.create({
    data: {
      userId: fabio.id,
      status: "RESOLVED",
      confidence: 0.97,
      messageCount: 6,
      createdAt: daysAgo(1),
    },
  });

  await prisma.conversation.create({
    data: {
      userId: gabriela.id,
      status: "RESOLVED",
      confidence: 0.94,
      messageCount: 4,
      createdAt: daysAgo(1),
    },
  });

  console.log("Conversas e mensagens iniciais populadas com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
