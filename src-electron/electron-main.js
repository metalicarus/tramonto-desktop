import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { promises as fs } from 'node:fs'
import simpleGit from 'simple-git'

const platform = process.platform || os.platform()
const currentDir = fileURLToPath(new URL('.', import.meta.url))
let mainWindow

const TRAMONTO_DIR = path.join(os.homedir(), '.tramonto')
const REPOS_DIR = path.join(TRAMONTO_DIR, 'repositories')
const EVIDENCE_DIR = path.join(TRAMONTO_DIR, 'evidence')
const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/

/**
 * Garante que o caminho vindo do renderer fique dentro de baseDir
 */
function insideDir(baseDir, target) {
  const resolved = path.resolve(target)
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    throw new Error(`Path outside ${baseDir} is not allowed`)
  }
  return resolved
}

/**
 * Aceita só um nome simples (sem barras nem "..")
 */
function safeSegment(name) {
  const value = String(name ?? '')
  if (!value || value === '.' || value === '..' || value !== path.basename(value) || value.includes('\\')) {
    throw new Error(`Invalid file name: ${name}`)
  }
  return value
}

function evidencePath(projectId, filename) {
  return path.join(EVIDENCE_DIR, safeSegment(projectId), safeSegment(filename))
}

function assertGithubUrl(repoUrl) {
  if (!GITHUB_URL_PATTERN.test(repoUrl || '')) {
    throw new Error('Only https://github.com/<owner>/<repo> URLs are supported')
  }
  return repoUrl
}

/**
 * O token vai num header por comando (só para github.com) e nunca é gravado no .git/config
 */
function gitWithToken(baseDir, token) {
  if (!token) throw new Error('GitHub token not configured')
  const basic = Buffer.from(`x-access-token:${token}`).toString('base64')
  return simpleGit({
    baseDir,
    config: [`http.https://github.com/.extraHeader=Authorization: Basic ${basic}`],
  })
}

// Window controls
ipcMain.handle('win:minimize', () => mainWindow.minimize())
ipcMain.handle('win:maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.handle('win:close', () => mainWindow.close())

// Filesystem
ipcMain.handle('fs:getBaseDir', () => REPOS_DIR)

ipcMain.handle('fs:writeEncryptedFile', async (_, filePath, encryptedContent) => {
  const target = insideDir(REPOS_DIR, filePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, encryptedContent, 'utf-8')
})

ipcMain.handle('fs:readEncryptedFile', async (_, filePath) => {
  return fs.readFile(insideDir(REPOS_DIR, filePath), 'utf-8')
})

// Git
ipcMain.handle('git:fullSync', async (_, projectDir, token, repoUrl, message) => {
  const dir = insideDir(REPOS_DIR, projectDir)
  assertGithubUrl(repoUrl)
  const git = gitWithToken(dir, token)
  const isNew = await isNewRepository(git, repoUrl)
  if (isNew) {
    await initAndPush(git, repoUrl, message)
  } else {
    await pullAndPush(git, repoUrl, message)
  }
  return { success: true }
})

ipcMain.handle('git:clone', async (_, repoUrl, token, destDir) => {
  const dest = insideDir(REPOS_DIR, destDir)
  assertGithubUrl(repoUrl)
  try {
    const stat = await fs.stat(dest)
    if (stat.isDirectory()) {
      const git = gitWithToken(dest, token)
      const isRepo = await git.checkIsRepo()
      if (isRepo) {
        // Remove tokens que versões antigas gravavam na URL do origin
        await git.remote(['set-url', 'origin', repoUrl])
        await git.pull('origin', 'main')
        return { success: true }
      }
    }
  } catch {
    // NO ALTERNATIVE
  }
  await fs.mkdir(dest, { recursive: true })
  const git = gitWithToken(REPOS_DIR, token)
  await git.clone(repoUrl, dest)
  return { success: true }
})

// Evidências: o renderer já entrega o conteúdo cifrado; aqui só se grava "<nome>.enc"
ipcMain.handle('fs:saveEvidence', async (_, projectId, filename, encryptedContent) => {
  const target = evidencePath(projectId, `${safeSegment(filename)}.enc`)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, encryptedContent, 'utf-8')
})

ipcMain.handle('fs:readEvidence', async (_, projectId, filename) => {
  try {
    const content = await fs.readFile(evidencePath(projectId, `${safeSegment(filename)}.enc`), 'utf-8')
    return { encrypted: true, content }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  // Evidência gravada em texto puro por versões antigas
  const buffer = await fs.readFile(evidencePath(projectId, filename))
  return { encrypted: false, content: buffer.toString('base64') }
})

ipcMain.handle('fs:removeEvidence', async (_, projectId, filename) => {
  await fs.rm(evidencePath(projectId, filename), { force: true })
})

ipcMain.handle('fs:readDir', async (_, dirPath) => {
  async function readRecursive(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      if (entry.name === '.git') continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...await readRecursive(fullPath))
      } else if (entry.name.endsWith('.json') || entry.name.endsWith('.enc')) {
        const content = await fs.readFile(fullPath, 'utf-8')
        files.push({ path: fullPath, content })
      }
    }
    return files
  }
  return readRecursive(insideDir(REPOS_DIR, dirPath))
})

async function isNewRepository(git, repoUrl) {
  try {
    const remoteInfo = await git.listRemote(['--heads', repoUrl])
    return remoteInfo.trim() === ''
  } catch {
    return true
  }
}

async function setOrigin(git, repoUrl) {
  const remotes = await git.getRemotes()
  if (remotes.some((r) => r.name === 'origin')) {
    await git.remote(['set-url', 'origin', repoUrl])
  } else {
    await git.addRemote('origin', repoUrl)
  }
}

async function initAndPush(git, repoUrl, message) {
  const isRepo = await git.checkIsRepo()
  if (!isRepo) await git.init(['--initial-branch=main'])

  await git.addConfig('user.name', 'Tramonto')
  await git.addConfig('user.email', 'tramonto@app.com')
  await setOrigin(git, repoUrl)

  await git.add('.')
  const status = await git.status()
  if (status.files.length > 0) {
    await git.commit(message || `Auto-sync: ${new Date().toISOString()}`)
  }
  await git.push('origin', 'main', ['--set-upstream'])
}

async function pullAndPush(git, repoUrl, message) {
  await setOrigin(git, repoUrl)
  await git.pull('origin', 'main', ['--no-rebase', '--allow-unrelated-histories'])
  await git.add('.')
  const status = await git.status()
  if (status.files.length > 0) {
    await git.commit(message || `Auto-sync: ${new Date().toISOString()}`)
  }
  await git.push('origin', 'main')
}

// Backup: o caminho vem do diálogo nativo, escolhido pelo usuário
ipcMain.handle('backup:save', async (_, defaultName, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(os.homedir(), defaultName),
    filters: [{ name: 'Tramonto backup', extensions: ['tbak'] }],
  })
  if (canceled || !filePath) return null
  await fs.writeFile(filePath, content, 'utf-8')
  return filePath
})

ipcMain.handle('backup:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Tramonto backup', extensions: ['tbak'] }],
  })
  if (canceled || !filePaths.length) return null
  return fs.readFile(filePaths[0], 'utf-8')
})

function isAppUrl(url) {
  if (process.env.DEV) return url.startsWith(process.env.APP_URL)
  return url.startsWith('file://')
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    minWidth: 1024,
    minHeight: 768,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  })

  // Bloqueia janelas novas e navegação para fora do app
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (process.env.DEBUGGING) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  if (process.env.DEV) {
    try {
      const { default: installExtension, VUEJS_DEVTOOLS } = await import('electron-devtools-installer')
      await installExtension(VUEJS_DEVTOOLS)
      console.log('Vue DevTools instalado!')
    } catch (err) {
      console.log('Erro ao instalar Vue DevTools:', err)
    }
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
