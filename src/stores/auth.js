import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { saveSetting, loadSetting } from 'src/utils/storage'
import {
  hashPassword,
  verifyPassword,
  generateRecoveryKey,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  unwrapRawVaultKey,
  importVaultKey,
} from 'src/utils/crypto'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isUnlocked: false,
    masterPassword: null,
    vaultKey: null,
    isConfigured: false,
    failedAttempts: 0,
    lockedUntil: null,
    _sessionTimer: null,
    sessionTimeout: 15 * 60 * 1000, // 15 minutos
  }),

  actions: {
    async init() {
      const hash = await loadSetting('master_password_hash')
      this.isConfigured = !!hash
      this.failedAttempts = await loadSetting('failed_attempts') || 0
      this.lockedUntil = await loadSetting('locked_until') || null
    },

    async setupMasterPassword(password, rawVaultKey = generateVaultKey()) {
      const hash = await hashPassword(password)
      const recoveryKey = generateRecoveryKey()
      const recoveryHash = await hashPassword(recoveryKey)
      await saveSetting('master_password_hash', hash)
      await saveSetting('recovery_key_hash', recoveryHash)
      await saveSetting('vault_key_by_password', await wrapVaultKey(rawVaultKey, password))
      await saveSetting('vault_key_by_recovery', await wrapVaultKey(rawVaultKey, recoveryKey))
      this.vaultKey = markRaw(await importVaultKey(rawVaultKey))
      this.masterPassword = password
      this.isConfigured = true
      this.isUnlocked = true
      this.resetSessionTimer()
      return recoveryKey
    },

    async loadVaultKey(password) {
      const wrapped = await loadSetting('vault_key_by_password')
      if (wrapped) {
        this.vaultKey = markRaw(await unwrapVaultKey(wrapped, password))
        return
      }
      // Instalação anterior à vault key: cria agora. Sem cópia pela recovery key,
      // que não existe em claro; ela é criada na próxima troca de senha.
      const rawVaultKey = generateVaultKey()
      await saveSetting('vault_key_by_password', await wrapVaultKey(rawVaultKey, password))
      this.vaultKey = markRaw(await importVaultKey(rawVaultKey))
    },

    async unlock(password) {
      if (this.lockedUntil && new Date() < new Date(this.lockedUntil)) {
        const seconds = Math.ceil((new Date(this.lockedUntil) - new Date()) / 1000)
        throw new Error(`Too many attempts. Try again in ${seconds}s`)
      }
      const hash = await loadSetting('master_password_hash')
      const valid = await verifyPassword(password, hash)
      if (!valid) {
        this.failedAttempts++
        if (this.failedAttempts % 3 === 0) {
          const level = this.failedAttempts / 3
          const delays = [30, 300, 3600] // 30s, 5min, 1h
          const delay = delays[Math.min(level - 1, delays.length - 1)] * 1000
          this.lockedUntil = new Date(Date.now() + delay).toISOString()
          await saveSetting('locked_until', this.lockedUntil)
        }
        // Grava a cada tentativa para que reiniciar o app não zere o contador
        await saveSetting('failed_attempts', this.failedAttempts)
        throw new Error('Invalid password')
      }
      await this.loadVaultKey(password)
      this.failedAttempts = 0
      this.lockedUntil = null
      this.masterPassword = password
      this.isUnlocked = true
      await saveSetting('failed_attempts', 0)
      await saveSetting('locked_until', null)
      this.resetSessionTimer()
    },

    async unlockWithRecoveryKey(recoveryKey, newPassword) {
      const recoveryHash = await loadSetting('recovery_key_hash')
      const valid = await verifyPassword(recoveryKey, recoveryHash)
      if (!valid) throw new Error('Invalid recovery key')
      const wrapped = await loadSetting('vault_key_by_recovery')
      const rawVaultKey = wrapped ? await unwrapRawVaultKey(wrapped, recoveryKey) : undefined
      this.failedAttempts = 0
      this.lockedUntil = null
      await saveSetting('failed_attempts', 0)
      await saveSetting('locked_until', null)
      // Devolve a nova recovery key: a anterior deixa de valer
      return this.setupMasterPassword(newPassword, rawVaultKey)
    },

    lock() {
      this.masterPassword = null
      this.vaultKey = null
      this.isUnlocked = false
    },

    resetSessionTimer() {
      clearTimeout(this._sessionTimer)
      this._sessionTimer = setTimeout(() => {
        this.lock()
      }, this.sessionTimeout)
    },

    startSessionTimer() {
      this.resetSessionTimer()
    },

    stopSessionTimer() {
      clearTimeout(this._sessionTimer)
    },

  },
})
