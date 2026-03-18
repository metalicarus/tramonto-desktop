// src/utils/git/index.js
import { isElectron } from '../fileSystem/detect'

async function getAdapter() {
  if (isElectron()) return import('./adapters/electron.js')
  return import('./adapters/web.js')
}

export async function commitLocal(projectId, message, author) {
  const adapter = await getAdapter()
  return adapter.commitLocal(projectId, message, author)
}

export async function fullSync(projectDir, token, repoUrl, commitMessage) {
  const adapter = await getAdapter()
  return adapter.fullSync(projectDir, token, repoUrl, commitMessage)
}

export async function cloneRepository(repoUrl, projectId, token) {
  const adapter = await getAdapter()
  return adapter.cloneRepository(repoUrl, projectId, token)
}
