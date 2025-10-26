// src/stores/project.js
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import {
  saveItem,
  loadItem,
  loadAll,
  loadControlesByProject,
  loadVulnerabilidadesByProject,
  countUnsyncedItems,
} from 'src/utils/storage'
// import { writeJSONFile, initProjectStructure } from 'src/utils/git'
import { ProjectMetadata, ControlesTemplate } from 'src/schemas/project'

export const useProjectStore = defineStore('project', {
  state: () => ({
    // Projeto atual
    currentProject: null,

    // Controles do projeto atual
    controles: {},

    // Vulnerabilidades do projeto atual
    vulnerabilidades: {},

    // Lista de todos os projetos
    projects: [],

    // Estado de sincronização
    syncStatus: {
      syncing: false,
      lastSync: null,
      unsyncedChanges: 0,
      error: null,
    },

    // Configurações
    settings: {
      githubToken: null,
      userEmail: null,
      userName: null,
      autoSyncInterval: 300000, // 5 minutos
    },

    // Timer para auto-commit
    _autoCommitTimer: null,
    _autoSyncTimer: null,
  }),

  getters: {
    // Controles agrupados por fase
    controlesByFase: (state) => {
      const grouped = {}
      Object.values(state.controles).forEach((controle) => {
        const faseId = controle.fase_id
        if (!grouped[faseId]) {
          grouped[faseId] = []
        }
        grouped[faseId].push(controle)
      })

      // Ordenar controles por ID dentro de cada fase
      Object.keys(grouped).forEach((faseId) => {
        grouped[faseId].sort((a, b) => a.id.localeCompare(b.id))
      })

      return grouped
    },

    // Métricas do projeto
    projectMetrics: (state) => {
      const controles = Object.values(state.controles)
      const vulns = Object.values(state.vulnerabilidades)

      return {
        total_controles: controles.length,
        testados: controles.filter((c) => c.status === 'testado').length,
        passou: controles.filter((c) => c.resultado === 'passou').length,
        nao_passou: controles.filter((c) => c.resultado === 'nao_passou').length,
        nao_testado: controles.filter((c) => c.status === 'nao_testado').length,
        em_progresso: controles.filter((c) => c.status === 'em_progresso').length,
        vulnerabilidades: {
          criticas: vulns.filter((v) => v.severidade === 'critica').length,
          altas: vulns.filter((v) => v.severidade === 'alta').length,
          medias: vulns.filter((v) => v.severidade === 'media').length,
          baixas: vulns.filter((v) => v.severidade === 'baixa').length,
          info: vulns.filter((v) => v.severidade === 'info').length,
          total: vulns.length,
        },
      }
    },

    // Verifica se há mudanças não sincronizadas
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
          throw new Error('Projeto não encontrado')
        }

        const controles = await loadControlesByProject(projectId)
        this.controles = {}
        controles.forEach((c) => {
          this.controles[c.id] = c
        })

        const vulns = await loadVulnerabilidadesByProject(projectId)
        this.vulnerabilidades = {}
        vulns.forEach((v) => {
          this.vulnerabilidades[v.id] = v
        })

        await this.updateUnsyncedCount()

        console.log(`✅ Projeto carregado: ${this.currentProject.nome}`)
      } catch (error) {
        console.error('Erro ao carregar projeto:', error)
        throw error
      }
    },

    async createProject(projectData) {
      const projectId = uuidv4()

      const project = {
        ...ProjectMetadata,
        ...projectData,
        id: projectId,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        criado_por: this.settings.userEmail,
      }

      await saveItem('projects', project)

      for (const templateControle of ControlesTemplate) {
        const controle = {
          ...templateControle,
          id: `${projectId}_${templateControle.id}`,
          project_id: projectId,
          synced: false,
        }
        await saveItem('controles', controle)
      }

      // if (this.settings.githubToken && projectData.repositorio_url) {
      //   await initProjectStructure(projectId)
      // }

      await this.loadProjects()

      console.log(`✅ Projeto criado: ${project.nome}`)
      return project
    },

    async saveControle(controleId, updates) {
      const controle = {
        ...this.controles[controleId],
        ...updates,
        data_atualizacao: new Date().toISOString(),
        synced: false,
      }

      this.controles[controleId] = controle
      await saveItem('controles', controle)
      await this.updateUnsyncedCount()
      this.scheduleAutoCommit()

      console.log(`💾 Controle salvo: ${controleId}`)
    },

    async saveVulnerabilidade(vulnId, data) {
      const vuln = {
        ...data,
        id: vulnId || `VULN-${uuidv4().slice(0, 8)}`,
        project_id: this.currentProject.id,
        data_atualizacao: new Date().toISOString(),
        synced: false,
      }

      this.vulnerabilidades[vuln.id] = vuln
      await saveItem('vulnerabilidades', vuln)
      await this.updateUnsyncedCount()
      this.scheduleAutoCommit()

      console.log(`💾 Vulnerabilidade salva: ${vuln.id}`)
      return vuln
    },

    async writeProjectFiles() {
      // const projectId = this.currentProject.id

      try {
        // await writeJSONFile(projectId, 'projeto.json', {
        //   ...this.currentProject,
        //   metricas: this.projectMetrics,
        //   atualizado_em: new Date().toISOString(),
        // })

        // const controlesByFase = this.controlesByFase
        // for (const [faseId, controles] of Object.entries(controlesByFase)) {
        //   for (const controle of controles) {
        //     const faseNome = this.getFaseFolder(faseId)
        //     const filename = `${controle.id}.json`
        //     await writeJSONFile(projectId, `controles/${faseNome}/${filename}`, controle)
        //   }
        // }

        // for (const vuln of Object.values(this.vulnerabilidades)) {
        //   await writeJSONFile(projectId, `vulnerabilidades/${vuln.id}.json`, vuln)
        // }

        console.log('✅ Arquivos JSON escritos no filesystem')
      } catch (error) {
        console.error('Erro ao escrever arquivos:', error)
        throw error
      }
    },

    async autoCommit() {
      if (!this.currentProject) return

      try {
        await this.writeProjectFiles()

        // const result = await commitLocal(
        //   this.currentProject.id,
        //   `[Auto-save] ${new Date().toISOString()}`,
        //   {
        //     name: this.settings.userName || 'Pentest Manager',
        //     email: this.settings.userEmail || 'pentest@manager.app',
        //   },
        // )

        // if (result.success && result.files > 0) {
        //   console.log(`✅ Auto-commit: ${result.files} arquivos`)
        // }
      } catch (error) {
        console.error('Erro no auto-commit:', error)
      }
    },

    async syncWithGitHub() {
      if (!this.currentProject || !this.settings.githubToken) {
        throw new Error('Projeto ou token GitHub não configurado')
      }

      this.syncStatus.syncing = true
      this.syncStatus.error = null

      try {
        await this.writeProjectFiles()

        // const result = await fullSync(
        //   this.currentProject.id,
        //   this.settings.githubToken,
        //   `Sync: ${this.settings.userEmail} - ${new Date().toISOString()}`,
        // )

        // if (result.success) {
        //   await this.markAllAsSynced()

        //   this.syncStatus.lastSync = new Date()
        //   this.syncStatus.unsyncedChanges = 0

        //   console.log('✅ Sincronização com GitHub completa')
        //   return { success: true, message: 'Sincronizado com sucesso' }
        // } else if (result.conflicts) {
        //   this.syncStatus.error = 'Conflitos detectados'
        //   return { success: false, conflicts: true, message: result.message }
        // } else {
        //   throw new Error(result.message)
        // }
      } catch (error) {
        console.error('Erro na sincronização:', error)
        this.syncStatus.error = error.message
        return { success: false, message: error.message }
      } finally {
        this.syncStatus.syncing = false
      }
    },

    async markAllAsSynced() {
      for (const controle of Object.values(this.controles)) {
        controle.synced = true
        await saveItem('controles', controle)
      }

      for (const vuln of Object.values(this.vulnerabilidades)) {
        vuln.synced = true
        await saveItem('vulnerabilidades', vuln)
      }
    },

    async updateUnsyncedCount() {
      if (!this.currentProject) return

      const controles = await countUnsyncedItems('controles', this.currentProject.id)
      const vulns = await countUnsyncedItems('vulnerabilidades', this.currentProject.id)

      this.syncStatus.unsyncedChanges = controles + vulns
    },

    scheduleAutoCommit() {
      clearTimeout(this._autoCommitTimer)
      this._autoCommitTimer = setTimeout(() => {
        this.autoCommit()
      }, 30000)
    },

    startAutoSync() {
      if (this._autoSyncTimer) return

      this._autoSyncTimer = setInterval(() => {
        if (this.hasUnsyncedChanges && this.settings.githubToken) {
          console.log('⏰ Auto-sync agendado')
        }
      }, this.settings.autoSyncInterval)
    },

    stopAutoSync() {
      if (this._autoSyncTimer) {
        clearInterval(this._autoSyncTimer)
        this._autoSyncTimer = null
      }
    },

    getFaseFolder(faseId) {
      const folders = {
        1: '1-reconhecimento',
        2: '2-autenticacao',
        3: '3-autorizacao',
        4: '4-sessao',
        5: '5-input-validation',
      }
      return folders[faseId] || faseId
    },

    async loadSettings() {
      // Implementar se necessário
    },

    async saveSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
    },
  },
})
