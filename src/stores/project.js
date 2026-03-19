// src/stores/project.js

/**
 * @typedef {'production'|'approval'|'staging'} Environment
 * @typedef {'planning'|'in_progress'|'completed'} ProjectStatus
 * @typedef {'not_test'|'tested'|'na'|'in_progress'} ControllerStatus
 * @typedef {'passed'|'not_pass'|null} ControllerResult
 * @typedef {'critical'|'high'|'medium'|'low'|'info'} Severity
 * @typedef {'aberto'|'em_remediacao'|'remediado'|'aceito_risco'} VulnStatus
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} customer
 * @property {string} start_date
 * @property {string} end_date
 * @property {Environment} environment
 * @property {ProjectStatus} status
 * @property {string[]} team
 * @property {string} created_by
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Controller
 * @property {string} id
 * @property {string} project_id
 * @property {string} phase_id
 * @property {string} phase_name
 * @property {string} controller
 * @property {string} objective
 * @property {string} how_to_test
 * @property {ControllerStatus} status
 * @property {ControllerResult} result
 * @property {string} warning_signs
 * @property {string|null} tester
 * @property {string|null} test_date
 * @property {string|null} updated_at
 * @property {boolean} synced
 * @property {Array<{description: string, result: ControllerResult}>} sub_tests
 * @property {string[]} related_vulnerabilities
 */

/**
 * @typedef {Object} Evidence
 * @property {'screenshot'|'log'|'video'} type
 * @property {string} name
 * @property {string} path
 * @property {string} hash
 */

/**
 * @typedef {Object} Vulnerability
 * @property {string} id
 * @property {string} project_id
 * @property {string} title
 * @property {string} description
 * @property {Severity} severity
 * @property {number|null} cvss
 * @property {string} cvss_vector
 * @property {string} phase
 * @property {string} controller_id
 * @property {string} impact
 * @property {string} recommendation
 * @property {VulnStatus} status
 * @property {string} cwe
 * @property {string} owasp
 * @property {string} tester
 * @property {string} discovery_date
 * @property {string} updated_at
 * @property {Evidence[]} evidence
 * @property {boolean} synced
 */

/**
 * @typedef {Object} SyncStatus
 * @property {boolean} syncing
 * @property {Date|null} lastSync
 * @property {number} unsyncedChanges
 * @property {string|null} error
 */

/**
 * @typedef {Object} Settings
 * @property {string|null} githubToken
 * @property {string|null} userEmail
 * @property {string|null} userName
 * @property {number} autoSyncInterval
 */

/**
 * @typedef {Object} ProjectState
 * @property {Project|null} currentProject
 * @property {string} repository_url
 * @property {Record<string, Controller>} controllers
 * @property {Record<string, Vulnerability>} vulnerabilities
 * @property {Project[]} projects
 * @property {SyncStatus} syncStatus
 * @property {Settings} settings
 */

import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import {
  saveItem,
  loadItem,
  loadAll,
  loadcontrollersByProject,
  loadvulnerabilitiesByProject,
  countUnsyncedItems, deleteItem,
} from 'src/utils/storage'
import { ProjectMetadata, ControllersTemplate } from 'src/schemas/project'
import {toRaw} from "vue";
import {useAuthStore} from "stores/auth.js";

export const useProjectStore = defineStore('project', {
  /** @returns {ProjectState} */
  state: () => ({
    currentProject: null,
    controllers: {},
    vulnerabilities: {},
    projects: [],
    syncStatus: {
      syncing: false,
      lastSync: null,
      unsyncedChanges: 0,
      error: null,
    },
    globalSettings: {
      _autoCommitTimer: null,
      _autoSyncTimer: null,
      _autoSyncInterval: 300000,
    },
  }),

  getters: {
    controllersByPhase: (state) => {
      const grouped = {}
      Object.values(state.controllers).forEach((controller) => {
        const phase_id = controller.phase_id
        if (!grouped[phase_id]) {
          grouped[phase_id] = []
        }
        grouped[phase_id].push(controller)
      })
      Object.keys(grouped).forEach((phase_id) => {
        grouped[phase_id].sort((a, b) => a.id.localeCompare(b.id))
      })
      return grouped
    },

    projectMetrics: (state) => {
      const controllers = Object.values(state.controllers)
      const vulns = Object.values(state.vulnerabilities)
      return {
        total_controllers: controllers.length,
        tested: controllers.filter((c) => c.status === 'tested').length,
        passed: controllers.filter((c) => c.result === 'passed').length,
        not_pass: controllers.filter((c) => c.result === 'not_pass').length,
        not_test: controllers.filter((c) => c.status === 'not_test').length,
        in_progress: controllers.filter((c) => c.status === 'in_progress').length,
        vulnerabilities: {
          criticisms: vulns.filter((v) => v.severity === 'critical').length,
          highs: vulns.filter((v) => v.severity === 'high').length,
          mediums: vulns.filter((v) => v.severity === 'medium').length,
          lows: vulns.filter((v) => v.severity === 'low').length,
          info: vulns.filter((v) => v.severity === 'info').length,
          total: vulns.length,
        },
      }
    },

    hasUnsyncedChanges: (state) => {
      return state.syncStatus.unsyncedChanges > 0
    },
  },

  actions: {
    async init() {
      await this.loadProjects()
      await this.loadSettings()
      this.startAutoSync()
    },

    async loadProjects() {
      this.projects = await loadAll('projects')
    },

    async loadProject(projectId) {
      try {
        this.currentProject = await loadItem('projects', projectId)
        if (!this.currentProject) {
          throw new Error('Project not found')
        }
        if (!this.currentProject.settings) {
          this.currentProject.settings = {
            githubToken: null,
            userEmail: null,
            userName: null,
            repository_url: null,
          }
        }
        const controllers = await loadcontrollersByProject(projectId)
        this.controllers = {}
        controllers.forEach((c) => {
          this.controllers[c.id] = c
        })

        const vulns = await loadvulnerabilitiesByProject(projectId)
        this.vulnerabilities = {}
        vulns.forEach((v) => {
          this.vulnerabilities[v.id] = v
        })
        await this.updateUnsyncedCount()
      } catch (error) {
        console.error('Erro on load project:', error)
        throw error
      }
    },

    async createProject(projectData) {
      const projectId = uuidv4()
      const project = {
        ...ProjectMetadata,
        ...projectData,
        id: projectId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: this.currentProject.settings.userEmail,
      }

      await saveItem('projects', project)
      for (const templateController of ControllersTemplate) {
        const controller = {
          ...templateController,
          id: `${projectId}_${templateController.id}`,
          project_id: projectId,
          synced: false,
        }
        await saveItem('controllers', controller)
      }
      await this.loadProjects()
      console.log(`✅ Project created: ${project.name}`)
      return project
    },

    async importProject(repoUrl, token) {
      const authStore = useAuthStore()
      if (!authStore.masterPassword) {
        throw new Error('App is locked')
      }

      const { getBaseDir, cloneRepo, readDir } = await import('../utils/fileSystem/index.js')
      const { decrypt } = await import('../utils/crypto.js')

      const baseDir = await getBaseDir()
      const repoName = repoUrl.split('/').pop().replace('.git', '')
      const destDir = `${baseDir}/${repoName}`

      await cloneRepo(repoUrl, token, destDir)
      const files = await readDir(destDir)

      let project = null
      const controllers = []
      const vulns = []

      // 1. Processa JSONs
      for (const file of files) {
        if (!file.path.endsWith('.json')) continue
        const decrypted = await decrypt(file.content, authStore.masterPassword)
        if (file.path.endsWith('project.json')) {
          project = decrypted
        } else if (file.path.includes('/controllers/')) {
          controllers.push(decrypted)
        } else if (file.path.includes('/vulnerabilities/')) {
          vulns.push(decrypted)
        }
      }

      if (!project) throw new Error('Invalid repository — project.json not found')

      project.settings = {
        ...project.settings,
        githubToken: token,
        githubProject: repoUrl,
        repoDir: repoName,
      }

      // 2. Processa evidências
      for (const file of files) {
        if (!file.path.includes('/evidence/')) continue

        const decrypted = await decrypt(file.content, authStore.masterPassword)
        const vulnId = file.path.split('/evidence/')[1].split('/')[0]

        await window.electronAPI.saveEvidence(project.id, decrypted.name, decrypted.data)

        const evidenceDir = await window.electronAPI.getEvidenceDir(project.id)
        const vuln = vulns.find(v => v.id === vulnId)
        if (vuln) {
          const ev = vuln.evidence?.find(e => e.name === decrypted.name)
          if (ev) ev.path = `${evidenceDir}/${decrypted.name}`
        }
      }

      // 3. Persiste no IndexedDB
      await saveItem('projects', project)
      for (const controller of controllers) {
        await saveItem('controllers', { ...controller, synced: true })
      }
      for (const vuln of vulns) {
        await saveItem('vulnerabilities', { ...vuln, synced: true })
      }

      await this.loadProjects()
      return project
    },

    async saveController(controleId, updates) {
      const controller = {
        ...this.controllers[controleId],
        ...updates,
        updated_at: new Date().toISOString(),
        synced: false,
      }
      this.controllers[controleId] = controller
      await saveItem('controllers', controller)
      await this.updateUnsyncedCount()
      console.log(`💾 Controller saved: ${controleId}`)
    },

    async deleteVulnerability(vulnId) {
      delete this.vulnerabilities[vulnId]
      await deleteItem('vulnerabilities', vulnId)
      await this.updateUnsyncedCount()
    },

    async saveVulnerability(vulnId, data) {
      const vuln = {
        ...data,
        id: vulnId || `VULN-${uuidv4().slice(0, 8)}`,
        project_id: this.currentProject.id,
        updated_at: new Date().toISOString(),
        synced: false,
      }
      this.vulnerabilities[vuln.id] = vuln
      await saveItem('vulnerabilities', vuln)
      await this.updateUnsyncedCount()
      console.log(`💾 Vulnerability saved: ${vuln.id}`)
      return vuln
    },
    async syncWithGitHub() {
      if (!this.currentProject || !this.currentProject.settings.githubToken) {
        throw new Error('Project or access token not configured')
      }

      const authStore = useAuthStore()
      if (!authStore.masterPassword) {
        throw new Error('App is locked')
      }

      this.syncStatus.syncing = true
      this.syncStatus.error = null

      try {
        const { encrypt } = await import('../utils/crypto.js')
        const { getBaseDir, writeEncryptedJSONFile } = await import('../utils/fileSystem/index.js')
        const { fullSync } = await import('../utils/git/index.js')

        const password = authStore.masterPassword
        const projectSlug = this.currentProject.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')

        const baseDir = await getBaseDir()
        const repoDir = this.currentProject.settings.repoDir || `${projectSlug}-${this.currentProject.id}`
        const projectDir = `${baseDir}/${repoDir}`
        await writeEncryptedJSONFile(
          `${projectDir}/project.json`,
          await encrypt({ ...this.currentProject, metrics: this.projectMetrics }, password)
        )

        for (const [phaseId, controllers] of Object.entries(this.controllersByPhase)) {
          const phaseFolder = this.getFaseFolder(phaseId)
          for (const controller of controllers) {
            await writeEncryptedJSONFile(
              `${projectDir}/controllers/${phaseFolder}/${controller.id}.json`,
              await encrypt(toRaw(controller), password)
            )
          }
        }

        for (const vuln of Object.values(this.vulnerabilities)) {
          await writeEncryptedJSONFile(
            `${projectDir}/vulnerabilities/${vuln.id}.json`,
            await encrypt(toRaw(vuln), password)
          )
        }
        for (const vuln of Object.values(this.vulnerabilities)) {
          for (const ev of (vuln.evidence || [])) {
            if (!ev.path) continue
            const base64 = await window.electronAPI.readEvidence(ev.path)
            const encrypted = await encrypt({ name: ev.name, type: ev.type, data: base64 }, password)
            await writeEncryptedJSONFile(
              `${projectDir}/evidence/${vuln.id}/${ev.name}.enc`,
              encrypted
            )
          }
        }
        const result = await fullSync(
          projectDir,
          this.currentProject.settings.githubToken,
          this.currentProject.settings.githubProject,
          `Sync: ${this.currentProject.settings.userEmail} - ${new Date().toISOString()}`,
        )

        if (result.success) {
          await this.markAllAsSynced()
          this.syncStatus.lastSync = new Date()
          this.syncStatus.unsyncedChanges = 0
          return { success: true, message: 'Synchronized with success' }
        }

      } catch (error) {
        this.syncStatus.error = error.message
        return { success: false, message: error.message }
      } finally {
        this.syncStatus.syncing = false
      }
    },
    async markAllAsSynced() {
      for (const controller of Object.values(toRaw(this.controllers))) {
        const raw = { ...toRaw(controller), synced: true }
        await saveItem('controllers', raw)
      }

      for (const vuln of Object.values(toRaw(this.vulnerabilities))) {
        const raw = { ...toRaw(vuln), synced: true }
        await saveItem('vulnerabilities', raw)
      }
      this.currentProject.settings_synced = true
      await saveItem('projects', JSON.parse(JSON.stringify(this.currentProject)))
    },

    async updateUnsyncedCount() {
      if (!this.currentProject) return
      const controllers = await countUnsyncedItems('controllers', this.currentProject.id)
      const vulns = await countUnsyncedItems('vulnerabilities', this.currentProject.id)
      const settingsUnsynced = this.currentProject.settings_synced === false ? 1 : 0
      this.syncStatus.unsyncedChanges = controllers + vulns + settingsUnsynced
    },

    startAutoSync() {
      if (this.globalSettings._autoSyncTimer) return
      this.globalSettings._autoSyncTimer = setInterval(() => {
        if (this.hasUnsyncedChanges && this.currentProject.settings.githubToken) {
          console.log('⏰ Auto-sync agendado')
        }
      }, this.globalSettings._autoSyncInterval)
    },

    stopAutoSync() {
      if (this._autoSyncTimer) {
        clearInterval(this._autoSyncTimer)
        this._autoSyncTimer = null
      }
    },

    getFaseFolder(phaseId) {
      const folders = {
        1: '1-recognition',
        2: '2-authentication',
        3: '3-authorization',
        4: '4-session',
        5: '5-input-validation',
      }
      return folders[phaseId] || phaseId
    },

    async loadSettings() {
      // Implementar se necessário
    },

    async saveSettings(newSettings) {
      this.currentProject.settings = { ...this.currentProject.settings, ...newSettings }
      this.currentProject.settings_synced = false
      this.syncStatus.unsyncedChanges = false
      await saveItem('projects', JSON.parse(JSON.stringify(this.currentProject)))
      console.log(`💾 Setting updated`)
    },
  },
})
