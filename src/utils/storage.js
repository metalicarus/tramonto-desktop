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
        projectStore.createIndex('created_at', 'created_at')
      }

      // Store para controllers
      if (!db.objectStoreNames.contains('controllers')) {
        const controllerstore = db.createObjectStore('controllers', { keyPath: 'id' })
        controllerstore.createIndex('project_id', 'project_id')
        controllerstore.createIndex('phase_id', 'phase_id')
        controllerstore.createIndex('status', 'status')
        controllerstore.createIndex('tester', 'tester')
        controllerstore.createIndex('synced', 'synced')
        // Índice composto para buscar por projeto + fase
        controllerstore.createIndex('project_phase', ['project_id', 'phase_id'])
      }

      // Store para vulnerabilities
      if (!db.objectStoreNames.contains('vulnerabilities')) {
        const vulnStore = db.createObjectStore('vulnerabilities', { keyPath: 'id' })
        vulnStore.createIndex('project_id', 'project_id')
        vulnStore.createIndex('severity', 'severity')
        vulnStore.createIndex('status', 'status')
        vulnStore.createIndex('tester', 'tester')
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
  console.log(`✅ Saving in IndexedDB [${storeName}]:`, data.id)
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
 * Carrega todos os controllers de um projeto
 */
export async function loadcontrollersByProject(projectId) {
  return await loadByIndex('controllers', 'project_id', projectId)
}

/**
 * Carrega todos os controllers de uma fase específica
 */
export async function loadControllersByPhase(projectId, faseId) {
  const db = await initDB()
  const index = db.transaction('controllers').store.index('project_phase')
  return await index.getAll([projectId, faseId])
}

/**
 * Carrega vulnerabilities de um projeto
 */
export async function loadvulnerabilitiesByProject(projectId) {
  return await loadByIndex('vulnerabilities', 'project_id', projectId)
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

  // Deletar controllers do projeto
  const controllers = await loadByIndex('controllers', 'project_id', projectId)
  for (const controle of controllers) {
    await db.delete('controllers', controle.id)
  }

  // Deletar vulnerabilities do projeto
  const vulns = await loadByIndex('vulnerabilities', 'project_id', projectId)
  for (const vuln of vulns) {
    await db.delete('vulnerabilities', vuln.id)
  }

  // Deletar projeto
  await db.delete('projects', projectId)

  console.log(`🗑️ Project ${projectId} was deleted`)
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
      controllers: await db.getAll('controllers'),
      vulnerabilities: await db.getAll('vulnerabilities'),
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
  const tx = db.transaction(['projects', 'controllers', 'vulnerabilities', 'settings'], 'readwrite')

  // Importar projetos
  for (const project of backup.data.projects) {
    await tx.objectStore('projects').put(project)
  }

  // Importar controllers
  for (const controle of backup.data.controllers) {
    await tx.objectStore('controllers').put(controle)
  }

  // Importar vulnerabilities
  for (const vuln of backup.data.vulnerabilities) {
    await tx.objectStore('vulnerabilities').put(vuln)
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
  const tx = db.transaction(['projects', 'controllers', 'vulnerabilities', 'settings'], 'readwrite')

  await tx.objectStore('projects').clear()
  await tx.objectStore('controllers').clear()
  await tx.objectStore('vulnerabilities').clear()
  await tx.objectStore('settings').clear()

  await tx.done
  console.log('🗑️ Database was cleared')
}
