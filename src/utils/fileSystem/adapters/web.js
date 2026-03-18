let _rootHandle = null

export function getBaseDir() {
  return '' // web usa caminhos relativos à pasta escolhida
}

export async function requestRootHandle() {
  return getRootHandle() // chama o showDirectoryPicker
}

async function getRootHandle() {
  if (_rootHandle) return _rootHandle
  _rootHandle = await window.showDirectoryPicker({
    id: 'tramonto',
    mode: 'readwrite',
    startIn: 'documents',
  })
  return _rootHandle
}

export async function writeFile(relativePath, data) {
  console.log('📁 writeFile chamado:', relativePath)
  const root = await getRootHandle()
  console.log('📁 rootHandle:', root)
  const parts = relativePath.split('/')
  const filename = parts.pop()

  let dir = root
  for (const part of parts.filter(Boolean)) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }

  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}
