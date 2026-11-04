<template>
  <title-bar style="position: fixed; top: 0; left: 0; right: 0; z-index: 9999;" />
  <div class="layout-wrapper">

    <q-layout view="hHh lpR fFf">

      <!-- Nada do projeto fica na tela enquanto o app está bloqueado -->
      <q-page-container v-if="authStore.isUnlocked">
        <dashboard v-if="store.currentProject" />
        <div v-else class="flex flex-center" style="height: 80vh">
          <div class="text-center">
            <q-icon name="folder_open" size="100px" color="grey-5" />
            <div class="text-h5 text-grey-7 q-mt-md">Project not selected</div>
            <q-btn color="primary" label="Criar Novo Projeto" class="q-mt-md" @click="showNewProjectDialog = true" />
          </div>
        </div>
      </q-page-container>

      <q-footer v-if="authStore.isUnlocked" style="height: 45px">
        <q-toolbar>
          <q-space />

          <q-btn flat round dense size="md" icon="analytics" @click="showReportDialog = true">
            <q-tooltip>Generate Report</q-tooltip>
          </q-btn>

          <q-btn flat round dense size="md" icon="download" @click="exportBackup">
            <q-tooltip>Export Backup</q-tooltip>
          </q-btn>

          <q-btn flat round dense size="md" icon="upload" @click="importBackup">
            <q-tooltip>Import Backup</q-tooltip>
          </q-btn>
          <input ref="backupInput" type="file" accept=".tbak" style="display: none" @change="onBackupFileSelected" />

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
                    emit-value
                    map-options
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
import {ref, computed, onMounted, onUnmounted, watch} from 'vue'
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
import { createBackup, restoreBackup, backupFileName } from 'src/utils/backup.js'

const $q = useQuasar()
const store = useProjectStore()

const authStore = useAuthStore()
const showUnlockDialog = ref(false)
const showMasterPasswordDialog = ref(false)
const loading = ref(false)
const showNewProjectDialog = ref(false);
const showReportDialog = ref(false);
const currentProjectId = ref(null)
const backupInput = ref(null)

const projectOptions = computed(() => {
  return store.projects.map((p) => ({
    label: `${p.name} - ${p.customer}`,
    value: p.id,
  }))
})

const syncIcon = computed(() => {
  if (!store.currentProject) return 'cloud_queue'
  if (store.syncStatus.syncing) return 'sync'
  if (store.syncStatus.error) return 'sync_problem'
  if (store.hasUnsyncedChanges) return 'cloud_off'
  return 'cloud_done'
})

const syncIconColor = computed(() => {
  if (!store.currentProject) return 'grey'
  if (store.syncStatus.syncing) return 'blue'
  if (store.syncStatus.error) return 'negative'
  if (store.hasUnsyncedChanges) return 'orange'
  return 'positive'
})

const syncTooltip = computed(() => {
  if (!store.currentProject) return 'No project selected'
  if (store.syncStatus.syncing) return 'Synchronizing...'
  if (store.syncStatus.error) return `Error: ${store.syncStatus.error}`
  if (store.hasUnsyncedChanges) {
    return `${store.syncStatus.unsyncedChanges} unsynchronized changes`
  }
  return 'All synchronized'
})

const lastSyncText = computed(() => {
  if (!store.currentProject) return ''
  if (!store.syncStatus.lastSync) return 'Never synchronized'
  try {
    return formatDistanceToNow(store.syncStatus.lastSync, {
      addSuffix: true,
      locale: ptBR,
    })
  } catch {
    return 'Há algum tempo'
  }
})

function onUserActivity() {
  if (authStore.isUnlocked) authStore.resetSessionTimer()
}
function setLoading(newLoadingValue){
  loading.value = newLoadingValue;
}
function setNewProject(project) {
  showNewProjectDialog.value = !showNewProjectDialog.value;
  currentProjectId.value = project.id
  changeProject(project.id);
}
async function changeProject(projectId) {
  if (!projectId) return
  loading.value = true
  try {
    await store.loadProject(projectId)
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
async function exportBackup() {
  loading.value = true
  try {
    const { content, skipped } = await createBackup(authStore.masterPassword, authStore.vaultKey)
    const fileName = backupFileName()
    if (window.electronAPI?.saveBackup) {
      const savedPath = await window.electronAPI.saveBackup(fileName, content)
      if (!savedPath) return
      $q.notify({ type: 'positive', message: `Backup saved to ${savedPath}`, icon: 'cloud_done' })
    } else {
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
    if (skipped.length) {
      $q.notify({ type: 'warning', message: `${skipped.length} evidence file(s) not found and left out of the backup` })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: `Backup failed: ${error.message}`, icon: 'error' })
  } finally {
    loading.value = false
  }
}

async function importBackup() {
  if (!window.electronAPI?.openBackup) {
    backupInput.value.click()
    return
  }
  const content = await window.electronAPI.openBackup()
  if (content) confirmRestore(content)
}

async function onBackupFileSelected(event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (file) confirmRestore(await file.text())
}

function confirmRestore(content) {
  $q.dialog({
    title: 'Import Backup',
    message: 'Projects, controllers and vulnerabilities with the same ID will be replaced by the backup version. Continue?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    loading.value = true
    try {
      const result = await restoreBackup(content, authStore.masterPassword, authStore.vaultKey)
      await store.loadProjects()
      if (store.currentProject) await store.loadProject(store.currentProject.id)
      $q.notify({
        type: 'positive',
        message: `Backup restored: ${result.projects} project(s), ${result.vulnerabilities} vulnerability(ies), ${result.evidence} evidence file(s)`,
        icon: 'cloud_done',
      })
    } catch (error) {
      $q.notify({ type: 'negative', message: error.message, icon: 'error' })
    } finally {
      loading.value = false
    }
  })
}
async function onUnlocked() {
  showUnlockDialog.value = false
  await store.init()
}
watch(() => authStore.isUnlocked, (val) => {
  if (!val) showUnlockDialog.value = true
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onUserActivity)
  window.removeEventListener('keydown', onUserActivity)
  window.removeEventListener('click', onUserActivity)
})
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
    window.addEventListener('mousemove', onUserActivity)
    window.addEventListener('keydown', onUserActivity)
    window.addEventListener('click', onUserActivity)
  }
})
</script>
