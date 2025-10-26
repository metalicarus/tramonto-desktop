// import simpleGit from 'simple-git'
// import fs from 'fs-extra'
// import path from 'path'
// import os from 'os'

// // Função auxiliar para obter o caminho de dados do usuário
// function getUserDataPath() {
//   // No Electron, usar pasta de dados do usuário
//   const homeDir = os.homedir()
//   return path.join(homeDir, '.pentest-manager')
// }

// /**
//  * Obtém o caminho base para os repositórios
//  */
// export function getReposBasePath() {
//   return path.join(getUserDataPath(), 'repositories')
// }

// /**
//  * Obtém o caminho do repositório de um projeto
//  */
// export function getProjectRepoPath(projectId) {
//   return path.join(getReposBasePath(), projectId)
// }

// /**
//  * Clona um repositório do GitHub
//  */
// export async function cloneRepository(repoUrl, projectId, token) {
//   const dir = getProjectRepoPath(projectId)

//   await fs.ensureDir(getReposBasePath())

//   if (await fs.pathExists(dir)) {
//     console.log('Repositório já existe, fazendo pull...')
//     return await pullRepository(projectId, token)
//   }

//   try {
//     console.log(`📥 Clonando repositório: ${repoUrl}`)

//     // Adicionar token na URL se fornecido
//     const authUrl = token ? repoUrl.replace('https://', `https://${token}@`) : repoUrl

//     const git = simpleGit()

//     await git.clone(authUrl, dir, {
//       '--single-branch': null,
//       '--depth': '1',
//     })

//     console.log('✅ Repositório clonado com sucesso')
//     return { success: true, message: 'Repositório clonado' }
//   } catch (error) {
//     console.error('❌ Erro ao clonar repositório:', error)
//     throw new Error(`Falha ao clonar: ${error.message}`)
//   }
// }

// /**
//  * Faz pull do repositório remoto
//  */
// export async function pullRepository(projectId, token) {
//   const dir = getProjectRepoPath(projectId)

//   if (!(await fs.pathExists(dir))) {
//     throw new Error('Repositório não encontrado localmente')
//   }

//   try {
//     console.log('📥 Fazendo pull do repositório...')

//     const git = simpleGit(dir)

//     // Configurar credenciais se tiver token
//     if (token) {
//       await git.addConfig('credential.helper', 'store')
//     }

//     const pullResult = await git.pull('origin', 'main')

//     console.log('✅ Pull realizado com sucesso')

//     return {
//       success: true,
//       message: 'Atualizado do remoto',
//       conflicts: false,
//       files: pullResult.files || [],
//     }
//   } catch (error) {
//     if (error.message.includes('CONFLICT') || error.message.includes('conflict')) {
//       console.warn('⚠️ Conflito detectado')
//       return {
//         success: false,
//         message: 'Conflitos detectados',
//         conflicts: true,
//         error: error.message,
//       }
//     }

//     console.error('❌ Erro ao fazer pull:', error)
//     throw new Error(`Falha no pull: ${error.message}`)
//   }
// }

// /**
//  * Faz push para o repositório remoto
//  */
// export async function pushRepository(projectId, token) {
//   const dir = getProjectRepoPath(projectId)

//   if (!(await fs.pathExists(dir))) {
//     throw new Error('Repositório não encontrado localmente')
//   }

//   try {
//     console.log('📤 Fazendo push para o repositório...')

//     const git = simpleGit(dir)

//     // Configurar credenciais se tiver token
//     if (token) {
//       await git.addConfig('credential.helper', 'store')
//     }

//     await git.push('origin', 'main')

//     console.log('✅ Push realizado com sucesso')
//     return { success: true, message: 'Enviado para o remoto' }
//   } catch (error) {
//     console.error('❌ Erro ao fazer push:', error)
//     throw new Error(`Falha no push: ${error.message}`)
//   }
// }

// /**
//  * Faz commit local
//  */
// export async function commitLocal(projectId, message, author = null) {
//   const dir = getProjectRepoPath(projectId)

//   if (!(await fs.pathExists(dir))) {
//     throw new Error('Repositório não encontrado localmente')
//   }

//   try {
//     const git = simpleGit(dir)

//     // Verificar se há mudanças
//     const status = await git.status()

//     if (status.files.length === 0) {
//       console.log('Nenhuma mudança para commitar')
//       return { success: true, message: 'Nenhuma mudança', files: 0 }
//     }

//     // Adicionar todos os arquivos
//     await git.add('.')

//     // Configurar autor se fornecido
//     if (author) {
//       await git.addConfig('user.name', author.name)
//       await git.addConfig('user.email', author.email)
//     }

//     // Commit
//     const commitResult = await git.commit(message)

//     console.log(`✅ Commit realizado: ${commitResult.commit} (${status.files.length} arquivos)`)

//     return {
//       success: true,
//       message: 'Commit realizado',
//       sha: commitResult.commit,
//       files: status.files.length,
//     }
//   } catch (error) {
//     console.error('❌ Erro ao fazer commit:', error)
//     throw new Error(`Falha no commit: ${error.message}`)
//   }
// }

// /**
//  * Verifica o status do repositório
//  */
// export async function getRepositoryStatus(projectId) {
//   const dir = getProjectRepoPath(projectId)

//   if (!(await fs.pathExists(dir))) {
//     return { exists: false, modified: 0, untracked: 0 }
//   }

//   try {
//     const git = simpleGit(dir)
//     const status = await git.status()

//     return {
//       exists: true,
//       modified: status.modified.length,
//       untracked: status.not_added.length,
//       hasChanges: !status.isClean(),
//     }
//   } catch (error) {
//     console.error('Erro ao obter status:', error)
//     return { exists: true, error: error.message }
//   }
// }

// /**
//  * Lista commits recentes
//  */
// export async function getRecentCommits(projectId, limit = 10) {
//   const dir = getProjectRepoPath(projectId)

//   if (!(await fs.pathExists(dir))) {
//     return []
//   }

//   try {
//     const git = simpleGit(dir)
//     const log = await git.log({ maxCount: limit })

//     return log.all.map((commit) => ({
//       sha: commit.hash,
//       message: commit.message,
//       author: commit.author_name,
//       email: commit.author_email,
//       date: commit.date,
//     }))
//   } catch (error) {
//     console.error('Erro ao obter commits:', error)
//     return []
//   }
// }

// /**
//  * Escreve arquivo JSON no repositório
//  */
// export async function writeJSONFile(projectId, relativePath, data) {
//   const dir = getProjectRepoPath(projectId)
//   const fullPath = path.join(dir, relativePath)

//   try {
//     await fs.ensureDir(path.dirname(fullPath))
//     await fs.writeJSON(fullPath, data, { spaces: 2 })

//     console.log(`📝 Arquivo escrito: ${relativePath}`)
//     return { success: true, path: fullPath }
//   } catch (error) {
//     console.error('Erro ao escrever arquivo:', error)
//     throw new Error(`Falha ao escrever ${relativePath}: ${error.message}`)
//   }
// }

// /**
//  * Lê arquivo JSON do repositório
//  */
// export async function readJSONFile(projectId, relativePath) {
//   const dir = getProjectRepoPath(projectId)
//   const fullPath = path.join(dir, relativePath)

//   try {
//     if (!(await fs.pathExists(fullPath))) {
//       return null
//     }

//     const data = await fs.readJSON(fullPath)
//     console.log(`📖 Arquivo lido: ${relativePath}`)
//     return data
//   } catch (error) {
//     console.error('Erro ao ler arquivo:', error)
//     throw new Error(`Falha ao ler ${relativePath}: ${error.message}`)
//   }
// }

// /**
//  * Sincronização completa: commit local + pull + push
//  */
// export async function fullSync(projectId, token, commitMessage = null) {
//   const message = commitMessage || `Auto-sync: ${new Date().toISOString()}`

//   try {
//     console.log('📝 1/3 - Commitando mudanças locais...')
//     const commitResult = await commitLocal(projectId, message)

//     console.log('📥 2/3 - Baixando mudanças remotas...')
//     const pullResult = await pullRepository(projectId, token)

//     if (pullResult.conflicts) {
//       return {
//         success: false,
//         step: 'pull',
//         message: 'Conflitos detectados',
//         conflicts: true,
//       }
//     }

//     console.log('📤 3/3 - Enviando para o remoto...')
//     const pushResult = await pushRepository(projectId, token)

//     return {
//       success: true,
//       message: 'Sincronização completa',
//       commit: commitResult,
//       pull: pullResult,
//       push: pushResult,
//     }
//   } catch (error) {
//     console.error('❌ Erro na sincronização completa:', error)
//     return {
//       success: false,
//       message: `Erro: ${error.message}`,
//       error: error,
//     }
//   }
// }

// /**
//  * Inicializa estrutura de diretórios do projeto
//  */
// export async function initProjectStructure(projectId) {
//   const dir = getProjectRepoPath(projectId)

//   const folders = [
//     'controles/1-reconhecimento',
//     'controles/2-autenticacao',
//     'controles/3-autorizacao',
//     'controles/4-sessao',
//     'controles/5-input-validation',
//     'vulnerabilidades',
//     'evidencias',
//   ]

//   for (const folder of folders) {
//     await fs.ensureDir(path.join(dir, folder))
//   }

//   await fs.writeFile(path.join(dir, 'evidencias/.gitkeep'), '')

//   console.log('✅ Estrutura de diretórios criada')
// }

export function getReposBasePath() {
  return ''
}

export function getProjectRepoPath(projectId) {
  console.log(projectId)

  return ''
}

export async function cloneRepository() {
  return { success: false }
}
