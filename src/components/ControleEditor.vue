<template>
  <q-card class="controle-editor">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Controle {{ controle.id }} - {{ controle.controle }}</div>
      <div class="text-subtitle2">{{ controle.fase_nome }}</div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Objetivo -->
      <div class="q-mb-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Objetivo</div>
        <div class="text-body2 text-grey-8">{{ controle.objetivo }}</div>
      </div>

      <!-- Como Testar -->
      <div class="q-mb-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Como Testar</div>
        <div class="text-body2 text-grey-8" style="white-space: pre-wrap">
          {{ controle.como_testar }}
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Status -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-select
            v-model="localData.status"
            :options="statusOptions"
            label="Status do Teste"
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
            v-model="localData.resultado"
            :options="resultadoOptions"
            label="Resultado"
            outlined
            emit-value
            map-options
            :disable="localData.status !== 'testado'"
            @update:model-value="handleResultadoChange"
          >
            <template v-slot:prepend>
              <q-icon :name="getResultadoIcon(localData.resultado)" />
            </template>
          </q-select>
        </div>
      </div>

      <!-- Subtestes (se existirem) -->
      <div v-if="controle.subtestes && controle.subtestes.length > 0" class="q-mb-md">
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Subtestes</div>
        <q-list bordered separator>
          <q-item v-for="(subteste, index) in localData.subtestes" :key="index">
            <q-item-section>
              <q-item-label>{{ subteste.descricao }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-select
                v-model="subteste.resultado"
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
          v-model="localData.pontos_atencao"
          label="Pontos de Atenção"
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
            v-model="localData.testador"
            label="Testador"
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
          <q-input v-model="dataTesteFormatted" label="Data do Teste" outlined readonly>
            <template v-slot:prepend>
              <q-icon name="event" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Botão de Criar Vulnerabilidade -->
      <div v-if="localData.resultado === 'nao_passou'" class="q-mt-md">
        <q-btn
          color="negative"
          icon="bug_report"
          label="Registrar Vulnerabilidade"
          @click="$emit('create-vulnerability', controle)"
        />
      </div>
    </q-card-section>

    <q-separator />

    <!-- Rodapé com status de sincronização -->
    <q-card-section class="row items-center justify-between bg-grey-1">
      <div class="row items-center">
        <q-icon
          :name="controle.synced ? 'cloud_done' : 'cloud_off'"
          :color="controle.synced ? 'positive' : 'orange'"
          size="sm"
          class="q-mr-xs"
        />
        <span class="text-caption">
          {{ controle.synced ? 'Sincronizado' : 'Não sincronizado' }}
        </span>
      </div>
      <div class="text-caption text-grey-6">Atualizado: {{ dataAtualizacaoFormatted }}</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProjectStore } from 'src/stores/project'
import { format } from 'date-fns'

const props = defineProps({
  controle: {
    type: Object,
    required: true,
  },
})

const store = useProjectStore()

const localData = ref({ ...props.controle })

const statusOptions = [
  { label: 'Não Testado', value: 'nao_testado', icon: 'radio_button_unchecked' },
  { label: 'Em Progresso', value: 'em_progresso', icon: 'pending' },
  { label: 'Testado', value: 'testado', icon: 'check_circle' },
  { label: 'N/A', value: 'na', icon: 'block' },
]

const resultadoOptions = [
  { label: 'Passou', value: 'passou', icon: 'check_circle', color: 'positive' },
  { label: 'Não Passou', value: 'nao_passou', icon: 'cancel', color: 'negative' },
  { label: 'N/A', value: null, icon: 'remove', color: 'grey' },
]

const resultadoSubtesteOptions = [
  { label: 'Passou', value: 'passou' },
  { label: 'Não Passou', value: 'nao_passou' },
  { label: 'Não Testado', value: null },
]

const userEmail = computed(() => store.settings.userEmail || 'desconhecido@email.com')

const dataTesteFormatted = computed(() => {
  if (!localData.value.data_teste) return 'Não testado'
  return format(new Date(localData.value.data_teste), 'dd/MM/yyyy HH:mm')
})

const dataAtualizacaoFormatted = computed(() => {
  if (!localData.value.data_atualizacao) return 'Nunca'
  return format(new Date(localData.value.data_atualizacao), 'dd/MM/yyyy HH:mm')
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
  if (newStatus === 'testado' && !localData.value.data_teste) {
    localData.value.data_teste = new Date().toISOString()
    localData.value.testador = userEmail.value
  }

  if (newStatus === 'na') {
    localData.value.resultado = null
  }

  saveData()
}

function handleResultadoChange() {
  saveData()
}

async function saveData() {
  try {
    await store.saveControle(props.controle.id, localData.value)
    console.log('✅ Controle salvo automaticamente')
  } catch (error) {
    console.error('Erro ao salvar controle:', error)
  }
}

watch(
  () => props.controle,
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
