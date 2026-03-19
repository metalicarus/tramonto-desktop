import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { promises as fs } from 'node:fs'
import pathToFiles from 'node:path'
import simpleGit from 'simple-git'

const platform = process.platform || os.platform()
const currentDir = fileURLToPath(new URL('.', import.meta.url))
let mainWindow

// Window controls
ipcMain.handle('win:minimize', () => mainWindow.minimize())
ipcMain.handle('win:maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.handle('win:close', () => mainWindow.close())

// Filesystem
ipcMain.handle('fs:getBaseDir', () => {
  return pathToFiles.join(os.homedir(), '.tramonto', 'repositories')
})

ipcMain.handle('fs:writeEncryptedFile', async (_, filePath, encryptedContent) => {
  await fs.mkdir(pathToFiles.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, encryptedContent, 'utf-8')
})

// Git
ipcMain.handle('git:fullSync', async (_, projectDir, token, repoUrl, message) => {
  const authUrl = repoUrl.replace('https://', `https://${token}@`)
  const git = simpleGit(projectDir)
  const isNew = await isNewRepository(git, authUrl)
  if (isNew) {
    await initAndPush(git, authUrl, message)
  } else {
    await pullAndPush(git, authUrl, message)
  }
  return { success: true }
})

ipcMain.handle('git:clone', async (_, repoUrl, token, destDir) => {
  const authUrl = repoUrl.replace('https://', `https://${token}@`)
  try {
    const stat = await fs.stat(destDir)
    if (stat.isDirectory()) {
      const git = simpleGit(destDir)
      const isRepo = await git.checkIsRepo()
      if (isRepo) {
        await git.pull(authUrl, 'main')
        return { success: true }
      }
    }
  } catch {
    // NO ALTERNATIVE
  }
  await fs.mkdir(destDir, { recursive: true })
  const git = simpleGit()
  await git.clone(authUrl, destDir)
  return { success: true }
})
ipcMain.handle('fs:readEvidence', async (_, filePath) => {
  const buffer = await fs.readFile(filePath)
  return buffer.toString('base64')
})
ipcMain.handle('fs:saveEvidence', async (_, projectId, filename, base64Data) => {
  const evidenceDir = pathToFiles.join(os.homedir(), '.tramonto', 'evidence', projectId)
  await fs.mkdir(evidenceDir, { recursive: true })
  const buffer = Buffer.from(base64Data, 'base64')
  const filePath = pathToFiles.join(evidenceDir, filename)
  await fs.writeFile(filePath, buffer)
  return filePath
})

ipcMain.handle('fs:readDir', async (_, dirPath) => {
  async function readRecursive(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      const fullPath = pathToFiles.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...await readRecursive(fullPath))
      } else if (entry.name.endsWith('.json')) {
        const content = await fs.readFile(fullPath, 'utf-8')
        files.push({ path: fullPath, content })
      }
    }
    return files
  }
  return readRecursive(dirPath)
})

async function isNewRepository(git, authUrl) {
  try {
    const remoteInfo = await git.listRemote(['--heads', authUrl])
    return remoteInfo.trim() === ''
  } catch {
    return true
  }
}

async function initAndPush(git, authUrl, message) {
  const isRepo = await git.checkIsRepo()
  if (!isRepo) await git.init()

  await git.addConfig('user.name', 'Tramonto')
  await git.addConfig('user.email', 'tramonto@app.com')

  const remotes = await git.getRemotes()
  if (remotes.length === 0) {
    await git.addRemote('origin', authUrl)
  } else {
    await git.remote(['set-url', 'origin', authUrl])
  }

  await git.add('.')
  const status = await git.status()
  if (status.files.length > 0) {
    await git.commit(message || `Auto-sync: ${new Date().toISOString()}`)
  }
  await git.push('origin', 'main', ['--set-upstream'])
}

async function pullAndPush(git, authUrl, message) {
  await git.pull(authUrl, 'main', ['--no-rebase', '--allow-unrelated-histories'])
  await git.add('.')
  const status = await git.status()
  if (status.files.length > 0) {
    await git.commit(message || `Auto-sync: ${new Date().toISOString()}`)
  }
  await git.push('origin', 'main')
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
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
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
  try {
    await installExtension(VUEJS_DEVTOOLS)
    console.log('Vue DevTools instalado!')
  } catch (err) {
    console.log('Erro ao instalar Vue DevTools:', err)
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
