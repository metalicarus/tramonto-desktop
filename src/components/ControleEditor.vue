<template>
  <q-card class="controle-editor">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">{{ controller.controller }}</div>
      <div class="text-subtitle2">Controller ID: {{ controller.id }}</div>
      <div class="text-subtitle2">{{ controller.phase_name }}</div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Objetivo -->
      <div class="q-mb-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Objective</div>
        <div class="text-body2 text-grey-8">{{ controller.objective }}</div>
      </div>

      <!-- Como Testar -->
      <div class="q-mb-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">How to test</div>
        <div class="text-body2 text-grey-8" style="white-space: pre-wrap">
          {{ controller.how_to_test }}
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Status -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-select
            v-model="localData.status"
            :options="statusOptions"
            label="Status"
            outlined
            emit-value
            map-options
            @update:model-value="handleStatusChange"
          >
            <template v-slot:prepend>
              <q-icon :name="getStatusIcon(localData.status)" />
            </template>
          </q-select>
        </div>

        <div class="col-12 col-md-6">
          <q-select
            v-model="localData.result"
            :options="resultadoOptions"
            label="Result"
            outlined
            emit-value
            map-options
            :disable="localData.status !== 'tested'"
            @update:model-value="handleResultadoChange"
          >
            <template v-slot:prepend>
              <q-icon :name="getResultadoIcon(localData.result)" />
            </template>
          </q-select>
        </div>
      </div>

      <!-- Subtestes (se existirem) -->
      <div v-if="controller.sub_tests && controller.sub_tests.length > 0" class="q-mb-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Subtests</div>
        <q-list bordered separator>
          <q-item v-for="(sub_test, index) in localData.sub_tests" :key="index">
            <q-item-section>
              <q-item-label>{{ sub_test.description }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-select
                v-model="sub_test.result"
                :options="resultadoSubtesteOptions"
                dense
                outlined
                style="min-width: 150px"
                emit-value
                map-options
                @update:model-value="saveData"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- Pontos de Atenção -->
      <div class="q-mb-md">
        <q-input
          v-model="localData.warnings"
          label="Warnings"
          type="textarea"
          outlined
          rows="3"
          @blur="saveData"
        />
      </div>

      <!-- Testador e Data -->
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input
            v-model="localData.tester"
            label="Tester"
            outlined
            readonly
            :value="userEmail"
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="dataTesteFormatted" label="Date of test" outlined readonly>
            <template v-slot:prepend>
              <q-icon name="event" />
            </template>
          </q-input>
        </div>
      </div>
      <div v-if="localData.result === 'not_pass'" class="q-mt-md">
        <q-btn
          color="negative"
          icon="bug_report"
          label="Add Vulnerability"
          @click="$emit('create-vulnerability', controller)"
        />
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="id"
          flat
        >
          <template v-slot:body-cell-actions="props">
            <q-td key="actions" :props="props">
              <q-btn icon="delete"
                     color="red"
                     size="sm"
                     outline
                     round
                     @click="deleteVulnerability(props.row.id)"
              />
            </q-td>
          </template>
        </q-table>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section class="row items-center justify-between bg-grey-1">
      <div class="row items-center">
        <q-icon
          :name="controller.synced ? 'cloud_done' : 'cloud_off'"
          :color="controller.synced ? 'positive' : 'orange'"
          size="sm"
          class="q-mr-xs"
        />
        <span class="text-caption">
          {{ controller.synced ? 'Synchronized' : 'Not Synchronized' }}
        </span>
      </div>
      <div class="text-caption text-grey-6">Updated: {{ dataAtualizacaoFormatted }}</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
import { useProjectStore } from 'src/stores/project'
import { format } from 'date-fns'
import {date, useQuasar} from "quasar";

const props = defineProps({
  controller: {
    type: Object,
    required: true,
  },
})

const store = useProjectStore()
const $q = useQuasar();
const localData = ref({ ...props.controller })
const rows = computed(() => Object.values(store.vulnerabilities).filter(row => row.controller_id === props.controller.id))

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'title', label: 'Title', field: 'title', align: 'left', sortable: true },
  { name: 'controller', label: 'Controller', field: 'controller_id'},
  { name: 'severity', label: 'Severity', field: 'severity', align: 'left', sortable: true },
  { name: 'phase', label: 'Phase', field: 'phase', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'tester', label: 'Tester', field: 'tester', align: 'left' },
  { name: 'dt_discover', label: 'Discovered', field: 'dt_discover', align: 'left', sortable: true, format: (val) => {
      return date.formatDate(val, 'DD/MM/YYYY HH:mm:ss');
    }, },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'left' }
]
const statusOptions = [
  { label: 'Not Tested', value: 'not_tested', icon: 'radio_button_unchecked' },
  { label: 'In Progress', value: 'in_progress', icon: 'pending' },
  { label: 'Tested', value: 'tested', icon: 'check_circle' },
  { label: 'N/A', value: 'na', icon: 'block' },
]

const resultadoOptions = [
  { label: 'Passed', value: 'passed', icon: 'check_circle', color: 'positive' },
  { label: 'Not Passed', value: 'not_pass', icon: 'cancel', color: 'negative' },
  { label: 'N/A', value: null, icon: 'remove', color: 'grey' },
]

const resultadoSubtesteOptions = [
  { label: 'Passed', value: 'passed' },
  { label: 'Not Passed', value: 'not_pass' },
  { label: 'Not Tested', value: null },
]

const userEmail = computed(() => store.currentProject.settings.userEmail || 'desconhecido@email.com')

const dataTesteFormatted = computed(() => {
  if (!localData.value.dt_test) return 'Not Tested'
  return format(new Date(localData.value.dt_test), 'dd/MM/yyyy HH:mm')
})

const dataAtualizacaoFormatted = computed(() => {
  if (!localData.value.dt_updated) return 'Never'
  return format(new Date(localData.value.dt_updated), 'dd/MM/yyyy HH:mm')
})

function getStatusIcon(status) {
  const option = statusOptions.find((o) => o.value === status)
  return option?.icon || 'radio_button_unchecked'
}

function getResultadoIcon(resultado) {
  const option = resultadoOptions.find((o) => o.value === resultado)
  return option?.icon || 'remove'
}

function handleStatusChange(newStatus) {
  if (newStatus === 'tested' && !localData.value.dt_test) {
    localData.value.dt_test = new Date().toISOString()
    localData.value.tester = userEmail.value
  }
  if (newStatus === 'na') {
    localData.value.result = null
  }
  saveData()
}

function handleResultadoChange() {
  saveData()
}

async function saveData() {
  try {
    await store.saveController(props.controller.id, localData.value)
    console.log('✅ Controle salvo automaticamente')
  } catch (error) {
    console.error('Erro ao salvar controle:', error)
  }
}
async function deleteVulnerability(vulnerabilityId) {
  $q.dialog({
    title: 'Are you sure?',
    message: 'Do you really want to delete?',
    cancel: true,
    persistent: true,
  })
    .onOk(() => {
      try {
        store.deleteVulnerability(vulnerabilityId);
        $q.notify({
          message: `Vulnerability deleted successfully!`,
          icon: 'check_circle',
          iconColor: 'green'
        })
      } catch (exception) {
        $q.notify({
          message: `Error on delete vulnerability: ${exception.message}`,
          icon: 'error',
          iconColor: 'red'
        })
      }
    })
}

watch(
  () => props.controller,
  (newVal) => {
    localData.value = { ...newVal }
  },
  { deep: true },
)
</script>

<style scoped>
.controle-editor {
  max-width: 100%;
}
</style>
