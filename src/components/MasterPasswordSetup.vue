<template>
  <q-card style="min-width: 400px">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Setup Master Password</div>
      <div class="text-caption">This password will be used to encrypt your data</div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <q-input
        v-model="password"
        label="Master Password"
        :type="showPassword ? 'text' : 'password'"
        outlined
        :rules="[val => val.length >= 8 || 'Minimum 8 characters']"
      >
        <template v-slot:append>
          <q-icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="showPassword = !showPassword"
          />
        </template>
      </q-input>

      <q-input
        v-model="passwordConfirm"
        label="Confirm Password"
        :type="showPassword ? 'text' : 'password'"
        outlined
        :rules="[val => val === password || 'Passwords do not match']"
      />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        color="primary"
        label="Configure"
        :loading="loading"
        @click="configure"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { useQuasar } from 'quasar'

const emit = defineEmits(['configured'])
const authStore = useAuthStore()
const $q = useQuasar()

const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const loading = ref(false)

async function configure() {
  if (password.value.length < 8) return
  if (password.value !== passwordConfirm.value) return

  loading.value = true
  try {
    const recoveryKey = await authStore.setupMasterPassword(password.value)

    $q.dialog({
      title: '🔑 Recovery Key',
      message: `Save this key in a safe place. It will not be shown again:<br><br><strong>${recoveryKey}</strong>`,
      html: true,
      persistent: true,
      ok: { label: 'I saved it', color: 'primary' },
    }).onOk(() => {
      emit('configured')
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}
</script>
