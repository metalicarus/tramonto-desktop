// src/utils/storage.js
import { openDB } from 'idb'

const DB_NAME = 'pentest-manager-db'
const DB_VERSION = 1

let dbInstance = null

/**
 * Inicializa o banco IndexedDB
 */
export async function initDB() {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store para projetos
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('status', 'status')
        projectStore.createIndex('criado_em', 'criado_em')
      }

      // Store para controles
      if (!db.objectStoreNames.contains('controles')) {
        const controleStore = db.createObjectStore('controles', { keyPath: 'id' })
        controleStore.createIndex('project_id', 'project_id')
        controleStore.createIndex('fase_id', 'fase_id')
        controleStore.createIndex('status', 'status')
        controleStore.createIndex('testador', 'testador')
        controleStore.createIndex('synced', 'synced')
        // Índice composto para buscar por projeto + fase
        controleStore.createIndex('project_fase', ['project_id', 'fase_id'])
      }

      // Store para vulnerabilidades
      if (!db.objectStoreNames.contains('vulnerabilidades')) {
        const vulnStore = db.createObjectStore('vulnerabilidades', { keyPath: 'id' })
        vulnStore.createIndex('project_id', 'project_id')
        vulnStore.createIndex('severidade', 'severidade')
        vulnStore.createIndex('status', 'status')
        vulnStore.createIndex('testador', 'testador')
        vulnStore.createIndex('synced', 'synced')
      }

      // Store para configurações globais
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

/**
 * Salva um item no IndexedDB
 */
export async function saveItem(storeName, data) {
  const db = await initDB()
  await db.put(storeName, data)
  console.log(`✅ Salvo no IndexedDB [${storeName}]:`, data.id)
  return data
}

/**
 * Carrega um item específico
 */
export async function loadItem(storeName, id) {
  const db = await initDB()
  const item = await db.get(storeName, id)
  return item || null
}

/**
 * Carrega todos os itens de uma store
 */
export async function loadAll(storeName) {
  const db = await initDB()
  return await db.getAll(storeName)
}

/**
 * Carrega itens por índice
 */
export async function loadByIndex(storeName, indexName, value) {
  const db = await initDB()
  const index = db.transaction(storeName).store.index(indexName)
  return await index.getAll(value)
}

/**
 * Carrega todos os controles de um projeto
 */
export async function loadControlesByProject(projectId) {
  return await loadByIndex('controles', 'project_id', projectId)
}

/**
 * Carrega todos os controles de uma fase específica
 */
export async function loadControlesByFase(projectId, faseId) {
  const db = await initDB()
  const index = db.transaction('controles').store.index('project_fase')
  return await index.getAll([projectId, faseId])
}

/**
 * Carrega vulnerabilidades de um projeto
 */
export async function loadVulnerabilidadesByProject(projectId) {
  return await loadByIndex('vulnerabilidades', 'project_id', projectId)
}

/**
 * Deleta um item
 */
export async function deleteItem(storeName, id) {
  const db = await initDB()
  await db.delete(storeName, id)
  console.log(`🗑️ Deletado do IndexedDB [${storeName}]:`, id)
}

/**
 * Deleta todos os itens de um projeto (limpeza)
 */
export async function deleteProject(projectId) {
  const db = await initDB()

  // Deletar controles do projeto
  const controles = await loadByIndex('controles', 'project_id', projectId)
  for (const controle of controles) {
    await db.delete('controles', controle.id)
  }

  // Deletar vulnerabilidades do projeto
  const vulns = await loadByIndex('vulnerabilidades', 'project_id', projectId)
  for (const vuln of vulns) {
    await db.delete('vulnerabilidades', vuln.id)
  }

  // Deletar projeto
  await db.delete('projects', projectId)

  console.log(`🗑️ Projeto ${projectId} deletado completamente`)
}

/**
 * Conta itens não sincronizados
 */
export async function countUnsyncedItems(storeName, projectId = null) {
  const db = await initDB()
  const tx = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)

  let items
  if (projectId) {
    const index = store.index('project_id')
    items = await index.getAll(projectId)
  } else {
    items = await store.getAll()
  }

  return items.filter((item) => !item.synced).length
}

/**
 * Salva configuração global
 */
export async function saveSetting(key, value) {
  const db = await initDB()
  await db.put('settings', { key, value, updated_at: new Date().toISOString() })
}

/**
 * Carrega configuração global
 */
export async function loadSetting(key, defaultValue = null) {
  const db = await initDB()
  const setting = await db.get('settings', key)
  return setting ? setting.value : defaultValue
}

/**
 * Exporta todo o banco para backup (JSON)
 */
export async function exportDatabase() {
  const db = await initDB()

  const backup = {
    version: DB_VERSION,
    exported_at: new Date().toISOString(),
    data: {
      projects: await db.getAll('projects'),
      controles: await db.getAll('controles'),
      vulnerabilidades: await db.getAll('vulnerabilidades'),
      settings: await db.getAll('settings'),
    },
  }

  return backup
}

/**
 * Importa backup do banco
 */
export async function importDatabase(backup) {
  const db = await initDB()
  const tx = db.transaction(['projects', 'controles', 'vulnerabilidades', 'settings'], 'readwrite')

  // Importar projetos
  for (const project of backup.data.projects) {
    await tx.objectStore('projects').put(project)
  }

  // Importar controles
  for (const controle of backup.data.controles) {
    await tx.objectStore('controles').put(controle)
  }

  // Importar vulnerabilidades
  for (const vuln of backup.data.vulnerabilidades) {
    await tx.objectStore('vulnerabilidades').put(vuln)
  }

  // Importar configurações
  for (const setting of backup.data.settings) {
    await tx.objectStore('settings').put(setting)
  }

  await tx.done
  console.log('✅ Backup importado com sucesso')
}

/**
 * Limpa todo o banco (CUIDADO!)
 */
export async function clearDatabase() {
  const db = await initDB()
  const tx = db.transaction(['projects', 'controles', 'vulnerabilidades', 'settings'], 'readwrite')

  await tx.objectStore('projects').clear()
  await tx.objectStore('controles').clear()
  await tx.objectStore('vulnerabilidades').clear()
  await tx.objectStore('settings').clear()

  await tx.done
  console.log('🗑️ Banco de dados limpo')
}
