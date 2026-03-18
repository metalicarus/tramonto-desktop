import { isElectron } from './detect'

async function getAdapter() {
  if (isElectron()) return import('./adapters/electron')
  return null
}

export async function getBaseDir() {
  const adapter = await getAdapter()
  if (!adapter) return null
  return adapter.getBaseDir()
}

export async function writeEncryptedJSONFile(path, encryptedContent) {
  const adapter = await getAdapter()
  if (!adapter) return
  return adapter.writeEncryptedFile(path, encryptedContent)
}

export async function cloneRepo(repoUrl, token, destDir) {
  const adapter = await getAdapter()
  if (!adapter) return
  return adapter.cloneRepo(repoUrl, token, destDir)
}

export async function readDir(dirPath) {
  const adapter = await getAdapter()
  if (!adapter) return []
  return adapter.readDir(dirPath)
}
