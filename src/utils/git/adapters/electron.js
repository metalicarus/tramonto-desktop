export async function commitLocal(projectId, message, author) {
  return window.electronAPI.gitCommit(projectId, message, author)
}

export async function fullSync(projectDir, token, repoUrl, message) {
  return window.electronAPI.gitSync(projectDir, token, repoUrl, message)
}

export async function cloneRepository(repoUrl, projectId, token) {
  return window.electronAPI.gitClone(repoUrl, projectId, token)
}
