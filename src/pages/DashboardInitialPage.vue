<template>
  <q-page class="q-pa-md">
    <!-- Header com Info do Projeto e Sincronização -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h4">{{ project?.name || 'Loading...' }}</div>
        <div class="text-subtitle1 text-grey-7">
          {{ project?.customer || '' }} | {{ project?.environment || '' }}
        </div>
      </div>

      <!-- Controles de Sincronização -->
      <div class="row items-center q-gutter-sm">
        <q-badge :color="syncBadgeColor" :label="syncBadgeLabel" class="q-pa-sm" />

        <!--        :disable="!store.hasUnsyncedChanges || !hasGitHubToken"  !-->
        <q-btn icon="sync" color="primary" :loading="store.syncStatus.syncing"


               @click="syncNow">
          <q-tooltip v-if="!hasGitHubToken">
            Configure GitHub token in settings
          </q-tooltip>
          Synchronize
        </q-btn>

        <q-btn icon="settings" flat round @click="showSettings = true" />
      </div>
    </div>

    <!-- Métricas Gerais -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">{{ metrics.total_controllers }}</div>
            <div class="text-caption text-grey-7">Count of controllers</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card>
          <q-card-section>
            <div class="row items-center">
              <q-icon name="check_circle" color="positive" size="md" class="q-mr-sm" />
              <div>
                <div class="text-h6">{{ metrics.passed }}</div>
                <div class="text-caption text-grey-7">Passed</div>
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
                <div class="text-h6">{{ metrics.not_pass }}</div>
                <div class="text-caption text-grey-7">Not pass</div>
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
                <div class="text-h6">{{ metrics.vulnerabilities.total }}</div>
                <div class="text-caption text-grey-7">Vulnerabilities</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Progresso por Fase -->
    <div class="q-mb-lg">
      <div class="text-h5 q-mb-md">Progress per phase</div>
      <div class="row q-col-gutter-md">
        <div v-for="phase in phases" :key="phase.id" class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-bold q-mb-sm">
                {{ phase.name }}
              </div>
              <q-linear-progress :value="getFaseProgress(phase.id)" color="primary" size="20px" class="q-mb-xs">
                <div class="absolute-full flex flex-center">
                  <q-badge color="white" text-color="primary" :label="getFaseProgressLabel(phase.id)" />
                </div>
              </q-linear-progress>
              <div class="text-caption text-grey-7">
                {{ getFaseStats(phase.id) }}
              </div>
            </q-card-section>
            <q-card-actions>
              <q-btn flat color="primary" label="Show Controllers" @click="selectedFase = phase.id" />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Lista de Controles da Fase Selecionada -->
    <div v-if="selectedFase" class="q-mb-lg">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5">
          {{ getPhaseName(selectedFase) }}
        </div>
        <q-btn flat color="grey" label="Close" @click="selectedFase = null" />
      </div>

      <!-- Filtros -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-auto">
          <q-select v-model="filtroStatus" :options="filtroStatusOptions" label="Filter by Status" outlined dense
            style="min-width: 200px" />
        </div>
        <div class="col-auto">
          <q-select v-model="filtroResultado" :options="filtroResultadoOptions" label="Filter by Result" outlined
            dense style="min-width: 200px" />
        </div>
      </div>

      <!-- Grid de Controles -->
      <div class="row q-col-gutter-md">
        <div v-for="controller in controlesFiltrados" :key="controller.id" class="col-12">
          <controle-editor :controller="controller" @create-vulnerability="handleCreateVulnerability" />
        </div>
      </div>

      <div v-if="controlesFiltrados.length === 0" class="text-center q-pa-xl text-grey-6">
        No controls found with filters applied
      </div>
    </div>

    <!-- Dialog de Configurações -->
    <q-dialog v-model="showSettings">
      <project-configuration @saved-project-settings="showSettings = !showSettings" />
    </q-dialog>

    <!-- Dialog de Nova Vulnerabilidade -->
    <q-dialog v-model="showVulnDialog" persistent>
      <vulnerability-editor :controller-id="selectedControllerId"
                            :controller-name="selectedControllerName"
                            @created-vulnerability="showVulnDialog = !showVulnDialog"
      />
    </q-dialog>
  </q-page>
</template>

<script setup>
import {ref, computed} from 'vue'
import { useProjectStore } from 'stores/project'
import ControleEditor from 'components/ControleEditor.vue'
import VulnerabilityEditor from "components/VulnerabilityEditor.vue";
import ProjectConfiguration from "components/ProjectConfiguration.vue";
import {useQuasar} from "quasar";

const $q = useQuasar()
const store = useProjectStore()

const selectedFase = ref(null)
const showSettings = ref(false)
const showVulnDialog = ref(false)
const filtroStatus = ref('todos')
const filtroResultado = ref('todos')
const selectedControllerId = ref(null)
const selectedControllerName = ref(null)
const project = computed(() => store.currentProject)
const metrics = computed(() => store.projectMetrics)
const hasGitHubToken = computed(() =>
  !!store.currentProject &&
  !!store.currentProject.settings.githubToken &&
  !!store.currentProject.settings.githubProject
)

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

const phases = computed(() => {
  return [
    { id: '1', name: 'Recognition' },
    { id: '2', name: 'Authentication' },
    { id: '3', name: 'Authorization' },
    { id: '4', name: 'Session' },
    { id: '5', name: 'Input Validation' },
  ]
})

const controlesDaFase = computed(() => {
  if (!selectedFase.value) return []
  const controllersByPhase = store.controllersByPhase
  return controllersByPhase[selectedFase.value] || []
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
  { label: 'Todos', value: 'all' },
  { label: 'Não Testado', value: 'not_tested' },
  { label: 'Em Progresso', value: 'in_progress' },
  { label: 'Testado', value: 'tested' },
  { label: 'N/A', value: 'na' },
]

const filtroResultadoOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Passou', value: 'passed' },
  { label: 'Não Passou', value: 'not_pass' },
]


function getFaseProgress(faseId) {
  const controles = store.controllersByPhase[faseId] || []
  if (controles.length === 0) return 0

  const testados = controles.filter((c) => c.status === 'tested').length
  return testados / controles.length
}

function getFaseProgressLabel(faseId) {
  const progress = getFaseProgress(faseId)
  return `${Math.round(progress * 100)}%`
}

function getFaseStats(faseId) {
  const controles = store.controllersByPhase[faseId] || []
  const testados = controles.filter((c) => c.status === 'tested').length
  return `${testados} of ${controles.length} tested controllers`
}

function getPhaseName(phaseId) {
  const phase = phases.value.find((f) => f.id === phaseId)
  return phase?.name || ''
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


function handleCreateVulnerability(controller) {
  selectedControllerId.value = controller.id
  selectedControllerName.value = controller.controller
  showVulnDialog.value = true
}
</script>

<style scoped>
.q-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
