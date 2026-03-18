// src/schemas/project.js

/**
 * Estrutura de um projeto de pentest
 */
export const ProjectSchema = {
  id: '', // UUID
  name: '',
  customer: '',
  start_date: '',
  end_date: '',
  environment: 'approval', // 'production' | 'approval' | 'staging'
  status: 'in_progress', // 'planning' | 'in_progress' | 'completed'
  team: [], // Array de emails
  created_by: '',
  created_at: '',
  updated_at: '',
  settings: {
    githubToken: '',
    githubProject: '',
    repository_path: '', // Caminho local do clone Git
    userEmail: null,
    userName: null,
  }
}

/**
 * Estrutura de um controller de teste
 */
export const ControllerSchema = {
  id: '', // Ex: "1.1", "2.4"
  project_id: '',
  phase_id: '', // Ex: "1", "2", "3"
  phase_name: '', // Ex: "FASE DE RECONHECIMENTO"
  controller: '', // Ex: "4.4.1"
  objective: '',
  how_to_test: '',
  status: 'not_test', // 'not_test' | 'tested' | 'na' | 'in_progress'
  result: null, // null | 'passed' | 'not_pass'
  warning_signs: '',
  tester: null, // email do testador
  test_date: null,
  updated_at: null,
  synced: false, // Indica se está sincronizado com GitHub
  sub_tests: [], // Array de { description: '', result: 'passou' | 'nao_passou' }
  related_vulnerabilities: [], // Array de IDs de vulnerabilidades
}

/**
 * Estrutura de uma vulnerabilidade
 */
export const VulnerabilitySchema = {
  id: '', // Ex: "VULN-001"
  project_id: '',
  title: '',
  description: '',
  severity: 'medium', // 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvss: null, // Score CVSS (0-10)
  cvss_vector: '', // String do vetor CVSS
  phase: '',
  controller_id: '', // controller que encontrou a vulnerabilidade
  impact: '',
  recommendation: '',
  status: 'open', // 'open' | 'under_remediation' | 'remedied' | 'acceptable-risk'
  cwe: '', // Ex: "CWE-89"
  owasp: '', // Ex: "A03:2021"
  tester: '',
  discovery_date: '',
  updated_at: '',
  evidence: [], // Array de { tipo: 'screenshot' | 'log' | 'video', name: '', path: '', hash: '' }
  synced: false,
}

/**
 * Estrutura de metadados do projeto (arquivo projeto.json)
 */
export const ProjectMetadata = {
  ...ProjectSchema,
  metrics: {
    total_controllers: 0,
    tested: 0,
    passed: 0,
    not_pass: 0,
    not_test: 0,
    in_progress: 0,
    vulnerabilities: {
      criticisms: 0,
      highs: 0,
      mediums: 0,
      lows: 0,
      info: 0,
      total: 0,
    },
  },
  phases: [
    {
      id: '1',
      name: 'FASE DE RECONHECIMENTO',
      order: 1,
      total_controllers: 0,
      tested: 0,
    },
    {
      id: '2',
      name: 'TESTES DE AUTENTICAÇÃO',
      order: 2,
      total_controllers: 0,
      tested: 0,
    },
    {
      id: '3',
      name: 'TESTES DE AUTORIZAÇÃO',
      order: 3,
      total_controllers: 0,
      tested: 0,
    },
    {
      id: '4',
      name: 'TESTES DE GERENCIAMENTO DE SESSÃO',
      order: 4,
      total_controllers: 0,
      tested: 0,
    },
    {
      id: '5',
      name: 'TESTES DE VALIDAÇÃO DE INPUT',
      order: 5,
      total_controllers: 0,
      tested: 0,
    },
  ],
}

/**
 * Template de controllers baseado na planilha fornecida
 */
export const ControllersTemplate = [
  // FASE 1: RECONHECIMENTO
  {
    id: '1.1',
    phase_id: '1',
    phase_name: 'FASE DE RECONHECIMENTO',
    controller: '',
    objective: 'Obter possíveis falhas de configuração de serviços, exposição de dados, CVEs',
    how_to_test: 'Buscar pelo ativo no Whois / RDAP',
    status: 'not_tested',
    result: null,
  },
  {
    id: '1.2',
    phase_id: '1',
    phase_name: 'FASE DE RECONHECIMENTO',
    controller: '',
    objective: 'Enumerar subdomínios passivamente',
    how_to_test: 'Usar subfinder, sublist3r, assetfinder',
    status: 'not_tested',
    result: null,
  },

  // FASE 2: AUTENTICAÇÃO
  {
    id: '2.1',
    phase_id: '2',
    phase_name: 'TESTES DE AUTENTICAÇÃO',
    controller: '4.4.1',
    objective: 'Testing for Credentials Transported over an Encrypted Channel',
    how_to_test:
      'Capturando a request no burp, enviando pro repeater e modificando o target pra HTTP. Se for 200, não passou, se for 301 (redirect) passou.',
    status: 'not_tested',
    result: null,
  },
  {
    id: '2.2',
    phase_id: '2',
    phase_name: 'TESTES DE AUTENTICAÇÃO',
    controller: '4.4.2',
    objective: 'Testing for Default Credentials',
    how_to_test:
      'Buscar na documentação da aplicação (Apache, GLPi, ...) por credenciais padrões e testar na página de login',
    status: 'not_tested',
    result: null,
  },
  {
    id: '2.3',
    phase_id: '2',
    phase_name: 'TESTES DE AUTENTICAÇÃO',
    controller: '4.4.3',
    objective: 'Testing for Weak Lock Out Mechanism',
    how_to_test: 'Verificar se existe captcha no login, rate limit, MFA, bloqueio de conta',
    status: 'not_tested',
    result: null,
  },
  {
    id: '2.4',
    phase_id: '2',
    phase_name: 'TESTES DE AUTENTICAÇÃO',
    controller: '4.4.4',
    objective: 'Testing for Bypassing Authentication Schema',
    how_to_test: 'Testar se a autenticação está sendo validada em todas as páginas sensíveis',
    status: 'not_tested',
    result: null,
    subtestes: [
      { description: 'Acessar /admin sem autenticação', result: null },
      { description: 'Verificar resposta antes do redirect', result: null },
      { description: 'Alterar Referer e Origin', result: null },
      { description: 'Testar tokens aleatórios', result: null },
    ],
  },

  // FASE 3: AUTORIZAÇÃO
  {
    id: '3.1',
    phase_id: '3',
    phase_name: 'TESTES DE AUTORIZAÇÃO',
    controller: '4.5.1',
    objective: 'Testing Directory Traversal File Include',
    how_to_test:
      'Buscar por falhas no tratamento de querys para upload de arquivos que levem a exposição de dados',
    status: 'not_tested',
    result: null,
  },
  {
    id: '3.2',
    phase_id: '3',
    phase_name: 'TESTES DE AUTORIZAÇÃO',
    controller: '4.5.2',
    objective: 'Testing for Bypassing Authorization Schema',
    how_to_test: 'Buscar por vazamentos de dados sem credencial adequada',
    status: 'not_tested',
    result: null,
  },

  // FASE 4: SESSÃO
  {
    id: '4.1',
    phase_id: '4',
    phase_name: 'TESTES DE GERENCIAMENTO DE SESSÃO',
    controller: '4.6.1',
    objective: 'Testing for Session Management Schema',
    how_to_test: 'Verificar data de expiração do cookie, aceitar cookies inválidos',
    status: 'not_tested',
    result: null,
  },
  {
    id: '4.2',
    phase_id: '4',
    phase_name: 'TESTES DE GERENCIAMENTO DE SESSÃO',
    controller: '4.6.2',
    objective: 'Testing for Cookies Attributes',
    how_to_test: 'Verificar tags HttpOnly, Expires, SameSite, Secure no cookie',
    status: 'not_tested',
    result: null,
  },

  // FASE 5: INPUT VALIDATION
  {
    id: '5.1',
    phase_id: '5',
    phase_name: 'TESTES DE VALIDAÇÃO DE INPUT',
    controller: '4.7.1',
    objective: 'Reflected XSS',
    how_to_test: 'Testar se código pode ser injetado via input e acessado por URL',
    status: 'not_tested',
    result: null,
  },
  {
    id: '5.2',
    phase_id: '5',
    phase_name: 'TESTES DE VALIDAÇÃO DE INPUT',
    controller: '4.7.2',
    objective: 'Stored XSS',
    how_to_test: 'Testar injeção em formulários, cadastros, upload de arquivos',
    status: 'not_tested',
    result: null,
  },
  {
    id: '5.3',
    phase_id: '5',
    phase_name: 'TESTES DE VALIDAÇÃO DE INPUT',
    controller: '4.7.5',
    objective: 'SQL Injection',
    how_to_test:
      'Extrair dados com queries para bancos de dados ou bypass sistemas de autenticação',
    status: 'not_tested',
    result: null,
  },
]
