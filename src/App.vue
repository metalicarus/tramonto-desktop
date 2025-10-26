<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          <q-icon name="security" size="sm" class="q-mr-sm" />
          Pentest Manager
        </q-toolbar-title>

        <!-- Seletor de Projeto -->
        <q-select
          v-model="currentProjectId"
          :options="projectOptions"
          label="Projeto"
          dark
          outlined
          dense
          style="min-width: 300px"
          @update:model-value="changeProject"
        >
          <template v-slot:prepend>
            <q-icon name="folder" />
          </template>
        </q-select>

        <q-space />

        <!-- Indicador de Status -->
        <div class="row items-center q-gutter-sm q-mr-md">
          <q-icon :name="syncIcon" :color="syncIconColor" size="sm">
            <q-tooltip>{{ syncTooltip }}</q-tooltip>
          </q-icon>
          <span class="text-caption">
            {{ lastSyncText }}
          </span>
        </div>

        <!-- Botões de Ação -->
        <q-btn flat round dense icon="add" @click="showNewProjectDialog = true">
          <q-tooltip>Novo Projeto</q-tooltip>
        </q-btn>

        <q-btn flat round dense icon="download" @click="exportBackup">
          <q-tooltip>Exportar Backup</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Conteúdo Principal -->
    <q-page-container>
      <dashboard v-if="store.currentProject" />

      <div v-else class="flex flex-center" style="height: 80vh">
        <div class="text-center">
          <q-icon name="folder_open" size="100px" color="grey-5" />
          <div class="text-h5 text-grey-7 q-mt-md">Nenhum projeto selecionado</div>
          <q-btn
            color="primary"
            label="Criar Novo Projeto"
            class="q-mt-md"
            @click="showNewProjectDialog = true"
          />
        </div>
      </div>
    </q-page-container>

    <!-- Dialog: Novo Projeto -->
    <q-dialog v-model="showNewProjectDialog">
      <q-card style="min-width: 600px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Novo Projeto de Pentest</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="newProjectForm.nome"
            label="Nome do Projeto *"
            outlined
            class="q-mb-md"
            :rules="[(val) => !!val || 'Campo obrigatório']"
          />

          <q-input
            v-model="newProjectForm.cliente"
            label="Cliente *"
            outlined
            class="q-mb-md"
            :rules="[(val) => !!val || 'Campo obrigatório']"
          />

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6">
              <q-input
                v-model="newProjectForm.data_inicio"
                label="Data de Início"
                type="date"
                outlined
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="newProjectForm.data_fim"
                label="Data de Término"
                type="date"
                outlined
              />
            </div>
          </div>

          <q-select
            v-model="newProjectForm.ambiente"
            :options="ambienteOptions"
            label="Ambiente"
            outlined
            class="q-mb-md"
          />

          <q-input
            v-model="newProjectForm.repositorio_url"
            label="URL do Repositório GitHub (opcional)"
            outlined
            hint="Ex: https://github.com/usuario/repo-pentest.git"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            color="primary"
            label="Criar Projeto"
            @click="createNewProject"
            :disable="!isFormValid"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from 'stores/project'
import { useQuasar } from 'quasar'
import Dashboard from 'pages/DashboardInitialPage.vue'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
// import { exportDatabase } from 'src/utils/storage'

const $q = useQuasar()
const store = useProjectStore()

const loading = ref(false)
const showNewProjectDialog = ref(false)
const currentProjectId = ref(null)

const newProjectForm = ref({
  nome: '',
  cliente: '',
  data_inicio: '',
  data_fim: '',
  ambiente: 'homologacao',
  repositorio_url: '',
})

const ambienteOptions = ['homologacao', 'producao', 'staging', 'desenvolvimento']

const projectOptions = computed(() => {
  return store.projects.map((p) => ({
    label: `${p.nome} - ${p.cliente}`,
    value: p.id,
  }))
})

const isFormValid = computed(() => {
  return newProjectForm.value.nome && newProjectForm.value.cliente
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
  if (store.syncStatus.syncing) return 'Sincronizando...'
  if (store.syncStatus.error) return `Erro: ${store.syncStatus.error}`
  if (store.hasUnsyncedChanges) {
    return `${store.syncStatus.unsyncedChanges} mudanças não sincronizadas`
  }
  return 'Tudo sincronizado'
})

const lastSyncText = computed(() => {
  if (!store.syncStatus.lastSync) return 'Nunca sincronizado'

  try {
    return formatDistanceToNow(store.syncStatus.lastSync, {
      addSuffix: true,
      locale: ptBR,
    })
  } catch {
    return 'Há algum tempo'
  }
})

async function changeProject(projectId) {
  if (!projectId) return

  loading.value = true
  try {
    await store.loadProject(projectId)
    $q.notify({
      type: 'positive',
      message: `Projeto "${store.currentProject.nome}" carregado`,
      icon: 'folder_open',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Erro ao carregar projeto: ${error.message}`,
      icon: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function createNewProject() {
  loading.value = true

  try {
    const project = await store.createProject(newProjectForm.value)

    $q.notify({
      type: 'positive',
      message: 'Projeto criado com sucesso!',
      icon: 'check_circle',
    })

    newProjectForm.value = {
      nome: '',
      cliente: '',
      data_inicio: '',
      data_fim: '',
      ambiente: 'homologacao',
      repositorio_url: '',
    }

    showNewProjectDialog.value = false

    currentProjectId.value = project.id
    await store.loadProject(project.id)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Erro ao criar projeto: ${error.message}`,
      icon: 'error',
    })
  } finally {
    loading.value = false
  }
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

onMounted(async () => {
  loading.value = true

  try {
    await store.init()

    if (store.projects.length > 0) {
      currentProjectId.value = store.projects[0].id
      await store.loadProject(currentProjectId.value)
    }
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
