<template>
  <q-card style="min-width: 500px">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Project Settings</div>
    </q-card-section>

    <q-card-section>
      <q-input v-model="settingsForm.userName" label="Name" outlined class="q-mb-md" />

      <q-input v-model="settingsForm.userEmail" label="E-mail" type="email" outlined class="q-mb-md" />

      <q-input v-model="settingsForm.githubProject" label="Github Project" outlined class="q-mb-md" />

      <q-input v-model="settingsForm.githubToken" label="GitHub Personal Access Token" type="password" outlined
               hint="Token for synchronization with private repository" />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Cancel" v-close-popup />
      <q-btn color="primary" label="Save" @click="saveSettings" v-close-popup />
    </q-card-actions>
  </q-card>
</template>
<script setup>
import {onMounted, ref, toRaw} from "vue";
import {useProjectStore} from "stores/project.js";
import {useQuasar} from "quasar";

const $q = useQuasar()
const store = useProjectStore()
const settingsForm = ref({
  userName: '',
  userEmail: '',
  githubProject: '',
  githubToken: '',
})
const emit = defineEmits(['saved-project-settings'])

function saveSettings() {
  store.saveSettings(settingsForm.value)
  $q.notify({
    type: 'positive',
    message: 'Project settings saved',
    icon: 'check',
  })
  emit('saved-project-settings', true);
}
onMounted(() => {
  settingsForm.value = { ...toRaw(store.currentProject.settings) }
})
</script>
