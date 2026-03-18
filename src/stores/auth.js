import { defineStore } from 'pinia'
import { saveSetting, loadSetting } from 'src/utils/storage'
import { hashPassword, verifyPassword, generateRecoveryKey } from 'src/utils/crypto'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isUnlocked: false,
    masterPassword: null,
    isConfigured: false,
    failedAttempts: 0,
    lockedUntil: null
  }),

  actions: {
    async init() {
      const hash = await loadSetting('master_password_hash')
      this.isConfigured = !!hash
      this.failedAttempts = await loadSetting('failed_attempts') || 0
      this.lockedUntil = await loadSetting('locked_until') || null
    },

    async setupMasterPassword(password) {
      const hash = await hashPassword(password)
      const recoveryKey = generateRecoveryKey()
      const recoveryHash = await hashPassword(recoveryKey)
      await saveSetting('master_password_hash', hash)
      await saveSetting('recovery_key_hash', recoveryHash)
      this.masterPassword = password
      this.isConfigured = true
      this.isUnlocked = true
      return recoveryKey
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
          console.log('failedAttempts:', this.failedAttempts, 'level:', level, 'delay (ms):', delay, 'delay (s):', delay/1000)
          this.lockedUntil = new Date(Date.now() + delay).toISOString()

          await saveSetting('failed_attempts', this.failedAttempts)
          await saveSetting('locked_until', this.lockedUntil)
        }
        throw new Error('Invalid password')
      }
      this.failedAttempts = 0
      this.lockedUntil = null
      this.masterPassword = password
      this.isUnlocked = true
      await saveSetting('failed_attempts', 0)
      await saveSetting('locked_until', null)
    },

    async unlockWithRecoveryKey(recoveryKey, newPassword) {
      const recoveryHash = await loadSetting('recovery_key_hash')
      const valid = await verifyPassword(recoveryKey, recoveryHash)

      if (!valid) throw new Error('Invalid recovery key')

      // Redefine a senha
      await this.setupMasterPassword(newPassword)
    },

    lock() {
      this.masterPassword = null
      this.isUnlocked = false
    },


  },
})
