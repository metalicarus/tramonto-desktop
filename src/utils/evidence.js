// src/utils/evidence.js
import { encryptWithKey, decryptWithKey } from './crypto'

/**
 * Nome do arquivo da evidência: o id (evidências novas) ou o nome original (anteriores ao id)
 */
export function evidenceFileKey(ev) {
  return ev.id || ev.name
}

/**
 * Grava a evidência cifrada com a vault key em ~/.tramonto/evidence/<projeto>/<chave>.enc
 * @param {{ name: string, type: string, data: string }} evidence data em base64
 */
export async function saveEvidence(projectId, evidence, vaultKey, fileKey = evidenceFileKey(evidence)) {
  if (!vaultKey) throw new Error('App is locked')
  const encrypted = await encryptWithKey(evidence, vaultKey)
  await window.electronAPI.saveEvidence(projectId, fileKey, encrypted)
}

/**
 * Lê e decifra a evidência local. Arquivos em texto puro de versões antigas
 * são cifrados na primeira leitura e o original é apagado.
 * @returns {Promise<{ name: string, type: string, data: string }>}
 */
export async function loadEvidence(projectId, ev, vaultKey) {
  if (!vaultKey) throw new Error('App is locked')
  const fileKey = evidenceFileKey(ev)
  const { encrypted, content } = await window.electronAPI.readEvidence(projectId, fileKey)
  if (encrypted) return decryptWithKey(content, vaultKey)

  const evidence = { name: ev.name, type: ev.type, data: content }
  await saveEvidence(projectId, evidence, vaultKey, fileKey)
  await window.electronAPI.removeEvidence(projectId, fileKey)
  return evidence
}

export async function removeEvidence(projectId, ev) {
  await window.electronAPI.removeEvidence(projectId, `${evidenceFileKey(ev)}.enc`)
}
