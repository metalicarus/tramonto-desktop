// src/schemas/project.js

/**
 * Estrutura de um projeto de pentest
 */
export const ProjectSchema = {
  id: '', // UUID
  nome: '',
  cliente: '',
  data_inicio: '',
  data_fim: '',
  ambiente: 'homologacao', // 'producao' | 'homologacao' | 'staging'
  status: 'em_andamento', // 'planejamento' | 'em_andamento' | 'concluido'
  equipe: [], // Array de emails
  criado_por: '',
  criado_em: '',
  atualizado_em: '',
  repositorio_path: '', // Caminho local do clone Git
}

/**
 * Estrutura de um controle de teste
 */
export const ControleSchema = {
  id: '', // Ex: "1.1", "2.4"
  project_id: '',
  fase_id: '', // Ex: "1", "2", "3"
  fase_nome: '', // Ex: "FASE DE RECONHECIMENTO"
  controle: '', // Ex: "4.4.1"
  objetivo: '',
  como_testar: '',
  status: 'nao_testado', // 'nao_testado' | 'testado' | 'na' | 'em_progresso'
  resultado: null, // null | 'passou' | 'nao_passou'
  pontos_atencao: '',
  testador: null, // email do testador
  data_teste: null,
  data_atualizacao: null,
  synced: false, // Indica se está sincronizado com GitHub
  subtestes: [], // Array de { descricao: '', resultado: 'passou' | 'nao_passou' }
  vulnerabilidades_relacionadas: [], // Array de IDs de vulnerabilidades
}

/**
 * Estrutura de uma vulnerabilidade
 */
export const VulnerabilidadeSchema = {
  id: '', // Ex: "VULN-001"
  project_id: '',
  titulo: '',
  descricao: '',
  severidade: 'media', // 'critica' | 'alta' | 'media' | 'baixa' | 'info'
  cvss: null, // Score CVSS (0-10)
  cvss_vector: '', // String do vetor CVSS
  fase: '',
  controle_id: '', // Controle que encontrou a vulnerabilidade
  impacto: '',
  recomendacao: '',
  status: 'aberto', // 'aberto' | 'em_remediacao' | 'remediado' | 'aceito_risco'
  cwe: '', // Ex: "CWE-89"
  owasp: '', // Ex: "A03:2021"
  testador: '',
  data_descoberta: '',
  data_atualizacao: '',
  evidencias: [], // Array de { tipo: 'screenshot' | 'log' | 'video', nome: '', path: '', hash: '' }
  synced: false,
}

/**
 * Estrutura de metadados do projeto (arquivo projeto.json)
 */
export const ProjectMetadata = {
  ...ProjectSchema,
  metricas: {
    total_controles: 0,
    testados: 0,
    passou: 0,
    nao_passou: 0,
    nao_testado: 0,
    em_progresso: 0,
    vulnerabilidades: {
      criticas: 0,
      altas: 0,
      medias: 0,
      baixas: 0,
      info: 0,
      total: 0,
    },
  },
  fases: [
    {
      id: '1',
      nome: 'FASE DE RECONHECIMENTO',
      ordem: 1,
      total_controles: 0,
      testados: 0,
    },
    {
      id: '2',
      nome: 'TESTES DE AUTENTICAÇÃO',
      ordem: 2,
      total_controles: 0,
      testados: 0,
    },
    {
      id: '3',
      nome: 'TESTES DE AUTORIZAÇÃO',
      ordem: 3,
      total_controles: 0,
      testados: 0,
    },
    {
      id: '4',
      nome: 'TESTES DE GERENCIAMENTO DE SESSÃO',
      ordem: 4,
      total_controles: 0,
      testados: 0,
    },
    {
      id: '5',
      nome: 'TESTES DE VALIDAÇÃO DE INPUT',
      ordem: 5,
      total_controles: 0,
      testados: 0,
    },
  ],
}

/**
 * Template de controles baseado na planilha fornecida
 */
export const ControlesTemplate = [
  // FASE 1: RECONHECIMENTO
  {
    id: '1.1',
    fase_id: '1',
    fase_nome: 'FASE DE RECONHECIMENTO',
    controle: '',
    objetivo: 'Obter possíveis falhas de configuração de serviços, exposição de dados, CVEs',
    como_testar: 'Buscar pelo ativo no Whois / RDAP',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '1.2',
    fase_id: '1',
    fase_nome: 'FASE DE RECONHECIMENTO',
    controle: '',
    objetivo: 'Enumerar subdomínios passivamente',
    como_testar: 'Usar subfinder, sublist3r, assetfinder',
    status: 'nao_testado',
    resultado: null,
  },

  // FASE 2: AUTENTICAÇÃO
  {
    id: '2.1',
    fase_id: '2',
    fase_nome: 'TESTES DE AUTENTICAÇÃO',
    controle: '4.4.1',
    objetivo: 'Testing for Credentials Transported over an Encrypted Channel',
    como_testar:
      'Capturando a request no burp, enviando pro repeater e modificando o target pra HTTP. Se for 200, não passou, se for 301 (redirect) passou.',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '2.2',
    fase_id: '2',
    fase_nome: 'TESTES DE AUTENTICAÇÃO',
    controle: '4.4.2',
    objetivo: 'Testing for Default Credentials',
    como_testar:
      'Buscar na documentação da aplicação (Apache, GLPi, ...) por credenciais padrões e testar na página de login',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '2.3',
    fase_id: '2',
    fase_nome: 'TESTES DE AUTENTICAÇÃO',
    controle: '4.4.3',
    objetivo: 'Testing for Weak Lock Out Mechanism',
    como_testar: 'Verificar se existe captcha no login, rate limit, MFA, bloqueio de conta',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '2.4',
    fase_id: '2',
    fase_nome: 'TESTES DE AUTENTICAÇÃO',
    controle: '4.4.4',
    objetivo: 'Testing for Bypassing Authentication Schema',
    como_testar: 'Testar se a autenticação está sendo validada em todas as páginas sensíveis',
    status: 'nao_testado',
    resultado: null,
    subtestes: [
      { descricao: 'Acessar /admin sem autenticação', resultado: null },
      { descricao: 'Verificar resposta antes do redirect', resultado: null },
      { descricao: 'Alterar Referer e Origin', resultado: null },
      { descricao: 'Testar tokens aleatórios', resultado: null },
    ],
  },

  // FASE 3: AUTORIZAÇÃO
  {
    id: '3.1',
    fase_id: '3',
    fase_nome: 'TESTES DE AUTORIZAÇÃO',
    controle: '4.5.1',
    objetivo: 'Testing Directory Traversal File Include',
    como_testar:
      'Buscar por falhas no tratamento de querys para upload de arquivos que levem a exposição de dados',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '3.2',
    fase_id: '3',
    fase_nome: 'TESTES DE AUTORIZAÇÃO',
    controle: '4.5.2',
    objetivo: 'Testing for Bypassing Authorization Schema',
    como_testar: 'Buscar por vazamentos de dados sem credencial adequada',
    status: 'nao_testado',
    resultado: null,
  },

  // FASE 4: SESSÃO
  {
    id: '4.1',
    fase_id: '4',
    fase_nome: 'TESTES DE GERENCIAMENTO DE SESSÃO',
    controle: '4.6.1',
    objetivo: 'Testing for Session Management Schema',
    como_testar: 'Verificar data de expiração do cookie, aceitar cookies inválidos',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '4.2',
    fase_id: '4',
    fase_nome: 'TESTES DE GERENCIAMENTO DE SESSÃO',
    controle: '4.6.2',
    objetivo: 'Testing for Cookies Attributes',
    como_testar: 'Verificar tags HttpOnly, Expires, SameSite, Secure no cookie',
    status: 'nao_testado',
    resultado: null,
  },

  // FASE 5: INPUT VALIDATION
  {
    id: '5.1',
    fase_id: '5',
    fase_nome: 'TESTES DE VALIDAÇÃO DE INPUT',
    controle: '4.7.1',
    objetivo: 'Reflected XSS',
    como_testar: 'Testar se código pode ser injetado via input e acessado por URL',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '5.2',
    fase_id: '5',
    fase_nome: 'TESTES DE VALIDAÇÃO DE INPUT',
    controle: '4.7.2',
    objetivo: 'Stored XSS',
    como_testar: 'Testar injeção em formulários, cadastros, upload de arquivos',
    status: 'nao_testado',
    resultado: null,
  },
  {
    id: '5.3',
    fase_id: '5',
    fase_nome: 'TESTES DE VALIDAÇÃO DE INPUT',
    controle: '4.7.5',
    objetivo: 'SQL Injection',
    como_testar:
      'Extrair dados com queries para bancos de dados ou bypass sistemas de autenticação',
    status: 'nao_testado',
    resultado: null,
  },
]
