// src/utils/backup.js
import { exportDatabase, importDatabase } from './storage'
import { encrypt, decrypt } from './crypto'
import { saveEvidence, loadEvidence, evidenceFileKey } from './evidence'

const BACKUP_FORMAT = 'tramonto-backup'
const BACKUP_VERSION = 1

/**
 * Gera o conteúdo do arquivo de backup: todos os projetos e evidências,
 * cifrados com a senha master.
 * @returns {Promise<{ content: string, skipped: string[] }>} skipped = evidências não encontradas
 */
export async function createBackup(password, vaultKey) {
  const database = await exportDatabase()
  const evidence = []
  const skipped = []

  if (window.electronAPI?.readEvidence) {
    for (const vuln of database.data.vulnerabilities) {
      for (const ev of vuln.evidence || []) {
        try {
          const loaded = await loadEvidence(vuln.project_id, ev, vaultKey)
          evidence.push({ project_id: vuln.project_id, file_key: evidenceFileKey(ev), ...loaded })
        } catch {
          skipped.push(`${vuln.id}/${ev.name}`)
        }
      }
    }
  }

  const payload = await encrypt({ ...database, evidence }, password)
  const content = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, payload })
  return { content, skipped }
}

/**
 * Restaura um backup gerado por createBackup
 * @returns {Promise<{ projects: number, vulnerabilities: number, evidence: number }>}
 */
export async function restoreBackup(content, password, vaultKey) {
  let wrapper
  try {
    wrapper = JSON.parse(content)
  } catch {
    throw new Error('Invalid backup file')
  }
  if (wrapper?.format !== BACKUP_FORMAT) throw new Error('Invalid backup file')
  if (wrapper.version > BACKUP_VERSION) throw new Error('Backup created by a newer version of Tramonto')

  let backup
  try {
    backup = await decrypt(wrapper.payload, password)
  } catch {
    throw new Error('Could not decrypt the backup: it was created with another master password')
  }

  await importDatabase(backup)

  let restoredEvidence = 0
  if (window.electronAPI?.saveEvidence) {
    for (const ev of backup.evidence || []) {
      const { project_id, file_key, ...evidence } = ev
      await saveEvidence(project_id, evidence, vaultKey, file_key)
      restoredEvidence++
    }
  }

  return {
    projects: backup.data.projects.length,
    vulnerabilities: backup.data.vulnerabilities.length,
    evidence: restoredEvidence,
  }
}

export function backupFileName() {
  return `tramonto-backup-${new Date().toISOString().slice(0, 10)}.tbak`
}
