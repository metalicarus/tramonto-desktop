<template>
  <q-card style="min-width: 400px">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Unlock Tramonto</div>
      <div class="text-caption">Enter your master password to continue</div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <q-input
        v-model="password"
        label="Master Password"
        :type="showPassword ? 'text' : 'password'"
        outlined
        :disable="isLocked"
        autofocus
        @keyup.enter="unlock"
      >
        <template v-slot:append>
          <q-icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            @click="showPassword = !showPassword"
          />
        </template>
      </q-input>
      <div v-if="lockMessage" class="text-negative text-caption">{{ lockMessage }}</div>
      <div v-if="lockCountdown" class="text-warning text-caption">{{ lockCountdown }}</div>
    </q-card-section>

    <q-card-actions align="between">
      <q-btn flat label="Use Recovery Key" color="grey" @click="showRecovery = true" />
      <q-btn color="primary" label="Unlock" :disable="isLocked" :loading="loading" @click="unlock" />
    </q-card-actions>

    <!-- Recovery Key Dialog -->
    <q-dialog v-model="showRecovery">
      <q-card style="min-width: 400px">
        <q-card-section class="bg-warning text-white">
          <div class="text-h6">🔑 Recovery Key</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="recoveryKey" label="Recovery Key" outlined />
          <q-input
            v-model="newPassword"
            label="New Master Password"
            type="password"
            outlined
            :rules="[val => val.length >= 8 || 'Minimum 8 characters']"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="warning" label="Recover" :loading="loading" @click="recover" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import {ref, onMounted, onUnmounted, watch, computed} from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { useQuasar } from 'quasar'

const emit = defineEmits(['unlocked'])
const authStore = useAuthStore()
const $q = useQuasar()

const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const lockMessage = ref('')
const lockCountdown = ref('')
const showRecovery = ref(false)
const recoveryKey = ref('')
const newPassword = ref('')
const now = ref(new Date())
let nowTimer = null

const isLocked = computed(() => {
  // if (!authStore.lockedUntil) return false
  // return now.value < new Date(authStore.lockedUntil)
  return false
})
let lockTimer = null

function updateLockMessage() {
  if (!authStore.lockedUntil) {
    lockCountdown.value = ''
    return
  }
  const remaining = Math.ceil((new Date(authStore.lockedUntil) - new Date()) / 1000)
  if (remaining > 0) {
    lockCountdown.value = `Too many attempts. Try again in ${remaining}s`
    lockTimer = setTimeout(updateLockMessage, 1000)
  } else {
    lockCountdown.value = ''
  }
}
async function unlock() {
  if (!password.value) return
  loading.value = true
  try {
    await authStore.unlock(password.value)
    emit('unlocked')
  } catch (error) {
    lockMessage.value = error.message
    password.value = ''
  } finally {
    loading.value = false
  }
}

async function recover() {
  if (!recoveryKey.value || newPassword.value.length < 8) return
  loading.value = true
  try {
    await authStore.unlockWithRecoveryKey(recoveryKey.value, newPassword.value)
    showRecovery.value = false
    emit('unlocked')
    $q.notify({ type: 'positive', message: 'Password reset successfully' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  updateLockMessage()
  nowTimer = setInterval(() => {
    now.value = new Date()
  }, 1000)
})
onUnmounted(() => {
  clearTimeout(lockTimer)
  clearInterval(nowTimer)
})
watch(() => authStore.lockedUntil, (val) => {
  if (val) {
    console.log(val)
    updateLockMessage()
  }
})
</script>
