<template>
  <q-page class="q-pa-md">
    <!-- Header com Info do Projeto e Sincronização -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h4">{{ project?.nome || 'Carregando...' }}</div>
        <div class="text-subtitle1 text-grey-7">
          {{ project?.cliente || '' }} | {{ project?.ambiente || '' }}
        </div>
      </div>

      <!-- Controles de Sincronização -->
      <div class="row items-center q-gutter-sm">
        <q-badge :color="syncBadgeColor" :label="syncBadgeLabel" class="q-pa-sm" />

        <q-btn
          icon="sync"
          color="primary"
          :loading="store.syncStatus.syncing"
          :disable="!store.hasUnsyncedChanges || !hasGitHubToken"
          @click="syncNow"
        >
          <q-tooltip v-if="!hasGitHubToken">
            Configure o token do GitHub nas configurações
          </q-tooltip>
          Sincronizar
        </q-btn>

        <q-btn icon="settings" flat round @click="showSettings = true" />
      </div>
    </div>

    <!-- Métricas Gerais -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">{{ metrics.total_controles }}</div>
            <div class="text-caption text-grey-7">Total de Controles</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="check_circle" color="positive" size="md" class="q-mr-sm" />
              <div>
                <div class="text-h6">{{ metrics.passou }}</div>
                <div class="text-caption text-grey-7">Passou</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="cancel" color="negative" size="md" class="q-mr-sm" />
              <div>
                <div class="text-h6">{{ metrics.nao_passou }}</div>
                <div class="text-caption text-grey-7">Não Passou</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="bug_report" color="warning" size="md" class="q-mr-sm" />
              <div>
                <div class="text-h6">{{ metrics.vulnerabilidades.total }}</div>
                <div class="text-caption text-grey-7">Vulnerabilidades</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Progresso por Fase -->
    <div class="q-mb-lg">
      <div class="text-h5 q-mb-md">Progresso por Fase</div>
      <div class="row q-col-gutter-md">
        <div v-for="fase in fases" :key="fase.id" class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-sm">
                {{ fase.nome }}
              </div>
              <q-linear-progress
                :value="getFaseProgress(fase.id)"
                color="primary"
                size="20px"
                class="q-mb-xs"
              >
                <div class="absolute-full flex flex-center">
                  <q-badge
                    color="white"
                    text-color="primary"
                    :label="getFaseProgressLabel(fase.id)"
                  />
                </div>
              </q-linear-progress>
              <div class="text-caption text-grey-7">
                {{ getFaseStats(fase.id) }}
              </div>
            </q-card-section>
            <q-card-actions>
              <q-btn flat color="primary" label="Ver Controles" @click="selectedFase = fase.id" />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Lista de Controles da Fase Selecionada -->
    <div v-if="selectedFase" class="q-mb-lg">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5">
          {{ getFaseNome(selectedFase) }}
        </div>
        <q-btn flat color="grey" label="Fechar" @click="selectedFase = null" />
      </div>

      <!-- Filtros -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-auto">
          <q-select
            v-model="filtroStatus"
            :options="filtroStatusOptions"
            label="Filtrar por Status"
            outlined
            dense
            style="min-width: 200px"
          />
        </div>
        <div class="col-auto">
          <q-select
            v-model="filtroResultado"
            :options="filtroResultadoOptions"
            label="Filtrar por Resultado"
            outlined
            dense
            style="min-width: 200px"
          />
        </div>
      </div>

      <!-- Grid de Controles -->
      <div class="row q-col-gutter-md">
        <div v-for="controle in controlesFiltrados" :key="controle.id" class="col-12">
          <controle-editor :controle="controle" @create-vulnerability="handleCreateVulnerability" />
        </div>
      </div>

      <div v-if="controlesFiltrados.length === 0" class="text-center q-pa-xl text-grey-6">
        Nenhum controle encontrado com os filtros aplicados
      </div>
    </div>

    <!-- Dialog de Configurações -->
    <q-dialog v-model="showSettings">
      <q-card style="min-width: 500px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Configurações</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="settingsForm.userName" label="Nome" outlined class="q-mb-md" />

          <q-input
            v-model="settingsForm.userEmail"
            label="E-mail"
            type="email"
            outlined
            class="q-mb-md"
          />

          <q-input
            v-model="settingsForm.githubToken"
            label="GitHub Personal Access Token"
            type="password"
            outlined
            hint="Token para sincronização com repositório privado"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Salvar" @click="saveSettings" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog de Nova Vulnerabilidade -->
    <q-dialog v-model="showVulnDialog">
      <q-card style="min-width: 600px">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">Nova Vulnerabilidade</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="vulnForm.titulo" label="Título" outlined class="q-mb-md" />

          <q-select
            v-model="vulnForm.severidade"
            :options="severidadeOptions"
            label="Severidade"
            outlined
            emit-value
            map-options
            class="q-mb-md"
          />

          <q-input
            v-model="vulnForm.descricao"
            label="Descrição"
            type="textarea"
            outlined
            rows="4"
            class="q-mb-md"
          />

          <q-input
            v-model="vulnForm.impacto"
            label="Impacto"
            type="textarea"
            outlined
            rows="3"
            class="q-mb-md"
          />

          <q-input
            v-model="vulnForm.recomendacao"
            label="Recomendação"
            type="textarea"
            outlined
            rows="3"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="negative" label="Registrar Vulnerabilidade" @click="saveVulnerability" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from 'stores/project'
import { useQuasar } from 'quasar'
import ControleEditor from 'components/ControleEditor.vue'

const $q = useQuasar()
const store = useProjectStore()

const selectedFase = ref(null)
const showSettings = ref(false)
const showVulnDialog = ref(false)
const filtroStatus = ref('todos')
const filtroResultado = ref('todos')

const settingsForm = ref({
  userName: '',
  userEmail: '',
  githubToken: '',
})

const vulnForm = ref({
  titulo: '',
  severidade: 'media',
  descricao: '',
  impacto: '',
  recomendacao: '',
  controle_id: null,
})

const project = computed(() => store.currentProject)
const metrics = computed(() => store.projectMetrics)
const hasGitHubToken = computed(() => !!store.settings.githubToken)

const syncBadgeColor = computed(() => {
  if (store.syncStatus.syncing) return 'blue'
  if (store.syncStatus.error) return 'negative'
  if (store.hasUnsyncedChanges) return 'orange'
  return 'positive'
})

const syncBadgeLabel = computed(() => {
  if (store.syncStatus.syncing) return 'Sincronizando...'
  if (store.syncStatus.error) return 'Erro na sincronização'
  if (store.hasUnsyncedChanges) {
    return `${store.syncStatus.unsyncedChanges} mudanças não sincronizadas`
  }
  return 'Sincronizado'
})

const fases = computed(() => {
  return [
    { id: '1', nome: 'Reconhecimento' },
    { id: '2', nome: 'Autenticação' },
    { id: '3', nome: 'Autorização' },
    { id: '4', nome: 'Sessão' },
    { id: '5', nome: 'Validação de Input' },
  ]
})

const controlesDaFase = computed(() => {
  if (!selectedFase.value) return []
  const controlesByFase = store.controlesByFase
  return controlesByFase[selectedFase.value] || []
})

const controlesFiltrados = computed(() => {
  let controles = controlesDaFase.value

  if (filtroStatus.value !== 'todos') {
    controles = controles.filter((c) => c.status === filtroStatus.value)
  }

  if (filtroResultado.value !== 'todos') {
    controles = controles.filter((c) => c.resultado === filtroResultado.value)
  }

  return controles
})

const filtroStatusOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Não Testado', value: 'nao_testado' },
  { label: 'Em Progresso', value: 'em_progresso' },
  { label: 'Testado', value: 'testado' },
  { label: 'N/A', value: 'na' },
]

const filtroResultadoOptions = [
  { label: 'Todos', value: 'todos' },
  { label: 'Passou', value: 'passou' },
  { label: 'Não Passou', value: 'nao_passou' },
]

const severidadeOptions = [
  { label: 'Crítica', value: 'critica' },
  { label: 'Alta', value: 'alta' },
  { label: 'Média', value: 'media' },
  { label: 'Baixa', value: 'baixa' },
  { label: 'Informativa', value: 'info' },
]

function getFaseProgress(faseId) {
  const controles = store.controlesByFase[faseId] || []
  if (controles.length === 0) return 0

  const testados = controles.filter((c) => c.status === 'testado').length
  return testados / controles.length
}

function getFaseProgressLabel(faseId) {
  const progress = getFaseProgress(faseId)
  return `${Math.round(progress * 100)}%`
}

function getFaseStats(faseId) {
  const controles = store.controlesByFase[faseId] || []
  const testados = controles.filter((c) => c.status === 'testado').length
  return `${testados} de ${controles.length} controles testados`
}

function getFaseNome(faseId) {
  const fase = fases.value.find((f) => f.id === faseId)
  return fase?.nome || ''
}

async function syncNow() {
  try {
    const result = await store.syncWithGitHub()

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Sincronizado com sucesso!',
        icon: 'cloud_done',
      })
    } else if (result.conflicts) {
      $q.notify({
        type: 'warning',
        message: 'Conflitos detectados. Resolva manualmente no repositório.',
        icon: 'warning',
        timeout: 5000,
      })
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Erro: ${error.message}`,
      icon: 'error',
    })
  }
}

function saveSettings() {
  store.saveSettings(settingsForm.value)
  $q.notify({
    type: 'positive',
    message: 'Configurações salvas',
    icon: 'check',
  })
}

function handleCreateVulnerability(controle) {
  vulnForm.value.controle_id = controle.id
  vulnForm.value.titulo = `Vulnerabilidade em ${controle.controle}`
  showVulnDialog.value = true
}

async function saveVulnerability() {
  try {
    await store.saveVulnerabilidade(null, {
      ...vulnForm.value,
      testador: store.settings.userEmail,
      data_descoberta: new Date().toISOString(),
      status: 'aberto',
      fase: store.controles[vulnForm.value.controle_id]?.fase_nome || '',
      evidencias: [],
    })

    $q.notify({
      type: 'positive',
      message: 'Vulnerabilidade registrada',
      icon: 'bug_report',
    })

    vulnForm.value = {
      titulo: '',
      severidade: 'media',
      descricao: '',
      impacto: '',
      recomendacao: '',
      controle_id: null,
    }

    showVulnDialog.value = false
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Erro: ${error.message}`,
      icon: 'error',
    })
  }
}

onMounted(async () => {
  settingsForm.value = { ...store.settings }

  if (!store.currentProject && store.projects.length > 0) {
    await store.loadProject(store.projects[0].id)
  }
})
</script>

<style scoped>
.q-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
