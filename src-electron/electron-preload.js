/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.js you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getBaseDir: () => ipcRenderer.invoke('fs:getBaseDir'),
  gitSync: (projectDir, token, repoUrl, message) =>
    ipcRenderer.invoke('git:fullSync', projectDir, token, repoUrl, message),
  minimize: () => ipcRenderer.invoke('win:minimize'),
  maximize: () => ipcRenderer.invoke('win:maximize'),
  close: () => ipcRenderer.invoke('win:close'),
  writeEncryptedFile: (path, content) => ipcRenderer.invoke('fs:writeEncryptedFile', path, content),
  gitClone: (repoUrl, token, destDir) => ipcRenderer.invoke('git:clone', repoUrl, token, destDir),
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
})
