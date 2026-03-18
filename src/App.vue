<template>
  <title-bar style="position: fixed; top: 0; left: 0; right: 0; z-index: 9999;" />
  <div class="layout-wrapper">

    <q-layout view="hHh lpR fFf">

      <q-page-container>
        <dashboard v-if="store.currentProject" />
        <div v-else class="flex flex-center" style="height: 80vh">
          <div class="text-center">
            <q-icon name="folder_open" size="100px" color="grey-5" />
            <div class="text-h5 text-grey-7 q-mt-md">Project not selected</div>
            <q-btn color="primary" label="Criar Novo Projeto" class="q-mt-md" @click="showNewProjectDialog = true" />
          </div>
        </div>
      </q-page-container>

      <q-footer style="height: 45px">
        <q-toolbar>
          <q-space />

          <q-btn flat round dense size="md" icon="report" @click="showReportDialog = true">
            <q-tooltip>Generate Report</q-tooltip>
          </q-btn>

          <q-btn flat round dense size="md" icon="download" @click="exportBackup">
            <q-tooltip>Export Backup</q-tooltip>
          </q-btn>

          <q-btn flat round dense icon="add" size="md" @click="showNewProjectDialog = true">
            <q-tooltip>New Project</q-tooltip>
          </q-btn>

          <q-select v-model="currentProjectId"
                    :options="projectOptions"
                    label="Project"
                    outlined
                    dense
                    style="width: 300px"
                    dark
                    color="white"
                    @update:model-value="changeProject"
          >
            <template v-slot:prepend>
              <q-icon name="folder"  />
            </template>
          </q-select>
          <div class="row items-center q-gutter-sm q-mr-md">
            <q-icon :name="syncIcon" :color="syncIconColor" size="sm">
              <q-tooltip>{{ syncTooltip }}</q-tooltip>
            </q-icon>
            <span class="text-caption">
            {{ lastSyncText }}
          </span>
          </div>

        </q-toolbar>
      </q-footer>

      <!-- Dialog: Novo Projeto -->
      <q-dialog v-model="showNewProjectDialog">
        <project-editor @starting-project-creation="setLoading" @created-project="setNewProject" />
      </q-dialog>

      <q-dialog v-model="showMasterPasswordDialog" persistent>
        <master-password-setup  @configured="showMasterPasswordDialog = false" />
      </q-dialog>

      <q-dialog v-model="showUnlockDialog" persistent>
        <unlock-dialog @unlocked="onUnlocked" />
      </q-dialog>

      <q-dialog v-model="showReportDialog" persistent>
        <report-generator />
      </q-dialog>

      <!-- Loading Overlay -->
      <q-inner-loading :showing="loading">
        <q-spinner-gears size="50px" color="primary" />
      </q-inner-loading>
    </q-layout>
  </div>


</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import { useProjectStore } from 'stores/project'
import { useQuasar } from 'quasar'
import Dashboard from 'pages/DashboardInitialPage.vue'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ProjectEditor from "components/ProjectEditor.vue";
import TitleBar from "components/TitleBar.vue";
import {useAuthStore} from "stores/auth.js";
import MasterPasswordSetup from "components/MasterPasswordSetup.vue";
import UnlockDialog from "components/UnlockDialog.vue";
import ReportGenerator from "components/ReportGenerator.vue";

const $q = useQuasar()
const store = useProjectStore()

const authStore = useAuthStore()
const showUnlockDialog = ref(false)
const showMasterPasswordDialog = ref(false)
const loading = ref(false)
const showNewProjectDialog = ref(false);
const showReportDialog = ref(false);

const currentProjectId = ref(null)


const projectOptions = computed(() => {
  return store.projects.map((p) => ({
    label: `${p.name} - ${p.customer}`,
    value: p.id,
  }))
})

const syncIcon = computed(() => {
  if (store.syncStatus.syncing) return 'sync'
  if (store.syncStatus.error) return 'sync_problem'
  if (store.hasUnsyncedChanges) return 'cloud_off'
  return 'cloud_done'
})

const syncIconColor = computed(() => {
  if (store.syncStatus.syncing) return 'blue'
  if (store.syncStatus.error) return 'negative'
  if (store.hasUnsyncedChanges) return 'orange'
  return 'positive'
})

const syncTooltip = computed(() => {
  if (store.syncStatus.syncing) return 'Syncronization...'
  if (store.syncStatus.error) return `Error: ${store.syncStatus.error}`
  if (store.hasUnsyncedChanges) {
    return `${store.syncStatus.unsyncedChanges} not syncronized changes`
  }
  return 'All syncronized'
})

const lastSyncText = computed(() => {
  if (!store.syncStatus.lastSync) return 'Never syncronized'

  try {
    return formatDistanceToNow(store.syncStatus.lastSync, {
      addSuffix: true,
      locale: ptBR,
    })
  } catch {
    return 'Há algum tempo'
  }
})

function setNewProject(project) {
  showNewProjectDialog.value = !showNewProjectDialog.value;
  currentProjectId.value = project.id
  changeProject(currentProjectId);
}
async function changeProject(projectId) {
  if (!projectId) return
  loading.value = true
  try {
    await store.loadProject(projectId.value)
    $q.notify({
      message: `Project "${store.currentProject.name}" loaded`,
      icon: 'check_circle',
      iconColor: 'green'
    })
  } catch (error) {
    $q.notify({
      message: `Error on load project: ${error.message}`,
      icon: 'error',
      iconColor: 'red'
    })
  } finally {
    loading.value = false
  }
}
function setLoading(newLoadingValue){
  loading.value = newLoadingValue;
}


async function exportBackup() {
  try {
    // Por enquanto, apenas notificar
    $q.notify({
      type: 'info',
      message: 'Função de backup em desenvolvimento',
      icon: 'info',
    })
  } catch (error) {
    console.error(error)
  }
}
async function onUnlocked() {
  showUnlockDialog.value = false
  await store.init()
}
onMounted(async () => {
  loading.value = true
  try {
    await authStore.init()

    if (!authStore.isConfigured) {
      showMasterPasswordDialog.value = true
    } else {
      showUnlockDialog.value = true
      return
    }

    await store.init()
  } catch (error) {
    console.error('Erro na inicialização:', error)
    $q.notify({
      type: 'warning',
      message: 'Erro ao inicializar aplicação',
      icon: 'warning',
    })
  } finally {
    loading.value = false
  }
})
</script>
