// src/utils/git/adapters/web.js
import { Octokit } from '@octokit/rest'

function getOctokit(token) {
  if (!token) throw new Error('GitHub token not configured')
  return new Octokit({ auth: token })
}

function parseRepoUrl(repoUrl) {
  const match = repoUrl?.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/)
  if (!match) throw new Error('URL do repositório inválida')
  return { owner: match[1], repo: match[2] }
}

async function getFileSha(octokit, owner, repo, filePath) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath })
    return data.sha
  } catch {
    return null // arquivo não existe ainda
  }
}

export async function commitLocal(projectId, message) {
  console.log('📝 Mudanças marcadas para sync:', projectId)
  return { success: true, message: message, files: 0 }
}

export async function pushFile(token, repoUrl, relativePath, data) {
  const octokit = getOctokit(token)
  const { owner, repo } = parseRepoUrl(repoUrl)

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
  const sha = await getFileSha(octokit, owner, repo, relativePath)

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: relativePath,
    message: `[tramonto] update ${relativePath}`,
    content,
    ...(sha && { sha }),
  })
}

export async function fullSync(projectDir, token, repoUrl) {
  try {
    const octokit = getOctokit(token)
    const { owner, repo } = parseRepoUrl(repoUrl)
    await octokit.repos.get({ owner, repo })

    // O modo web ainda não grava os arquivos cifrados no repositório:
    // retornar sucesso aqui marcaria tudo como sincronizado sem ter enviado nada.
    return { success: false, message: 'GitHub sync is only available in the desktop app for now' }
  } catch (error) {
    console.error('❌ Erro no sync:', error)
    return { success: false, message: error.message }
  }
}

export async function cloneRepository(repoUrl, projectId, token) {
  try {
    const octokit = getOctokit(token)
    const { owner, repo } = parseRepoUrl(repoUrl)

    const { data } = await octokit.repos.getContent({ owner, repo, path: '' })

    return { success: true, files: data }
  } catch (error) {
    console.error('❌ Erro ao clonar:', error)
    return { success: false, message: error.message }
  }
}
