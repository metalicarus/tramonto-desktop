// src/utils/evidence.js
import { encryptWithKey, decryptWithKey } from './crypto'

/**
 * Grava a evidência cifrada com a vault key em ~/.tramonto/evidence/<projeto>/<nome>.enc
 * @param {{ name: string, type: string, data: string }} evidence data em base64
 */
export async function saveEvidence(projectId, evidence, vaultKey) {
  if (!vaultKey) throw new Error('App is locked')
  const encrypted = await encryptWithKey(evidence, vaultKey)
  await window.electronAPI.saveEvidence(projectId, evidence.name, encrypted)
}

/**
 * Lê e decifra a evidência local. Arquivos em texto puro de versões antigas
 * são cifrados na primeira leitura e o original é apagado.
 * @returns {Promise<{ name: string, type: string, data: string }>}
 */
export async function loadEvidence(projectId, ev, vaultKey) {
  if (!vaultKey) throw new Error('App is locked')
  const { encrypted, content } = await window.electronAPI.readEvidence(projectId, ev.name)
  if (encrypted) return decryptWithKey(content, vaultKey)

  const evidence = { name: ev.name, type: ev.type, data: content }
  await saveEvidence(projectId, evidence, vaultKey)
  await window.electronAPI.removeLegacyEvidence(projectId, ev.name)
  return evidence
}
