export function getBaseDir() {
  return window.electronAPI.getBaseDir()
}

export async function writeEncryptedFile(absolutePath, encryptedContent) {
  return window.electronAPI.writeEncryptedFile(absolutePath, encryptedContent)
}
export async function cloneRepo(repoUrl, token, destDir) {
  return window.electronAPI.gitClone(repoUrl, token, destDir)
}

export async function readDir(dirPath) {
  return window.electronAPI.readDir(dirPath)
}
