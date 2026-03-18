<template>
  <q-card style="min-width: 600px">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">New Project</div>
    </q-card-section>

    <q-card-section>
      <q-checkbox v-model="isImport" label="Import a remote project" class="q-mb-md" />

      <template v-if="isImport">
        <q-input v-model="importForm.repository_url" label="GitHub Repository URL *" outlined class="q-mb-md"
                 hint="Ex: https://github.com/usuario/repo-pentest.git" />
        <q-input v-model="importForm.token" label="GitHub Token *" outlined type="password" class="q-mb-md" />
      </template>

      <template v-else>
        <q-input v-model="newProjectForm.name" label="Project Name *" outlined class="q-mb-md"
                 :rules="[(val) => !!val || 'required']" />

        <q-input v-model="newProjectForm.customer" label="Customer *" outlined class="q-mb-md"
                 :rules="[(val) => !!val || 'required']">
          <template v-slot:append>
            <q-btn flat round icon="autorenew" size="sm" @click="generateCustomerName()" />
          </template>
        </q-input>

        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-6">
            <q-input v-model="newProjectForm.start_date" label="Start Date" type="date" outlined />
          </div>
          <div class="col-6">
            <q-input v-model="newProjectForm.end_date" label="End Date" type="date" outlined />
          </div>
        </div>

        <q-select v-model="newProjectForm.environment" :options="environmentOptions" label="Environment" outlined
                  class="q-mb-md" />

        <q-input v-model="newProjectForm.repository_url" label="GitHub Repository URL (optional)" outlined
                 hint="Ex: https://github.com/usuario/repo-pentest.git" />
      </template>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Cancel" v-close-popup />
      <q-btn color="primary" :label="isImport ? 'Import Project' : 'Create Project'"
             @click="isImport ? importProject() : createNewProject()"
             :disable="isImport ? !isImportFormValid : !isFormValid" />
    </q-card-actions>
  </q-card>
</template>
<script setup>

import {computed, ref} from "vue";
import {generateCustomerCode} from "src/utils/customerCode.js";
import {useQuasar} from "quasar";
import {useProjectStore} from "stores/project.js";

const $q = useQuasar()
const store = useProjectStore()
const emit = defineEmits(['created-project', 'starting-project-creation'])
const environmentOptions = ['approval', 'production', 'staging', 'development']
const newProjectForm = ref({
  name: '',
  customer: '',
  start_date: '',
  end_date: '',
  environment: 'approval',
  repository_url: '',
})
const isFormValid = computed(() => {
  return newProjectForm.value.name && newProjectForm.value.customer
})
const isImportFormValid = computed(() => {
  return importForm.value.repository_url && importForm.value.token
})
const isImport = ref(false)
const importForm = ref({
  repository_url: '',
  token: '',
})


function generateCustomerName() {
  newProjectForm.value.customer = generateCustomerCode();
}

async function importProject() {
  emit('starting-project-creation', true)
  try {
    const project = await store.importProject(importForm.value.repository_url, importForm.value.token)
    $q.notify({ type: 'positive', message: 'Project imported!', icon: 'check_circle' })
    importForm.value = { repository_url: '', token: '' }
    emit('created-project', project)
  } catch (error) {
    $q.notify({ type: 'negative', message: `Error: ${error.message}`, icon: 'error' })
  } finally {
    emit('starting-project-creation', false)
  }
}

async function createNewProject() {
  emit('starting-project-creation', true);
  try {
    const project = await store.createProject(newProjectForm.value)

    $q.notify({
      type: 'positive',
      message: 'Project created!',
      icon: 'check_circle',
    })

    newProjectForm.value = {
      name: '',
      customer: '',
      start_date: '',
      end_date: '',
      environment: 'approval',
      repository_url: '',
    }
    emit('created-project', project);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Erro ao criar projeto: ${error.message}`,
      icon: 'error',
    })
  } finally {
    emit('starting-project-creation', false);
  }
}

</script>
