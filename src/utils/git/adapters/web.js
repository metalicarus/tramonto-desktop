// src/utils/git/adapters/web.js
import { Octokit } from '@octokit/rest'
import { GITHUB_CONFIG } from '../../../configs/github'

function getOctokit() {
  return new Octokit({ auth: GITHUB_CONFIG.token })
}

function parseRepoUrl(repoUrl) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) throw new Error('URL do repositório inválida')
  return { owner: match[1], repo: match[2].replace('.git', '') }
}

async function getFileSha(octokit, owner, repo, filePath) {
  try {
    console.log(owner, repo, filePath)
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

export async function pushFile(relativePath, data) {
  const octokit = getOctokit()
  const { owner, repo } = parseRepoUrl(GITHUB_CONFIG.repoUrl)

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

export async function fullSync(token) {
  try {
    const octokit = new Octokit({ auth: token || GITHUB_CONFIG.token })
    const { owner, repo } = parseRepoUrl(GITHUB_CONFIG.repoUrl)
    await octokit.repos.get({ owner, repo })

    console.log('✅ Repositório acessível, sync pronto para uso')
    return { success: true, message: 'Sync configurado' }
  } catch (error) {
    console.error('❌ Erro no sync:', error)
    return { success: false, message: error.message }
  }
}

export async function cloneRepository(repoUrl, projectId, token) {
  try {
    const octokit = new Octokit({ auth: token || GITHUB_CONFIG.token })
    const { owner, repo } = parseRepoUrl(repoUrl)

    const { data } = await octokit.repos.getContent({ owner, repo, path: '' })

    console.log(
      '✅ Repositório lido:',
      data.map((f) => f.name),
    )
    return { success: true, files: data }
  } catch (error) {
    console.error('❌ Erro ao clonar:', error)
    return { success: false, message: error.message }
  }
}
