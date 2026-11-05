// Regras de caminho do processo principal.
// Recebem a implementação de path (path.win32 ou path.posix) para que as
// regras do Windows possam ser testadas em qualquer sistema.

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
// Caracteres de controle também são proibidos em nomes no Windows
// eslint-disable-next-line no-control-regex
const WINDOWS_INVALID_CHARS = /[<>:"|?*\u0000-\u001f]/

export function createPathRules(pathImpl) {
  const isWindows = pathImpl.sep === '\\'

  // No Windows o sistema de arquivos não diferencia maiúsculas (C:\ e c:\)
  const normalize = (p) => (isWindows ? p.toLowerCase() : p)

  /**
   * Garante que o caminho vindo do renderer fique dentro de baseDir
   */
  function insideDir(baseDir, target) {
    const base = pathImpl.resolve(baseDir)
    const resolved = pathImpl.resolve(target)
    const inside = normalize(resolved) === normalize(base) || normalize(resolved).startsWith(normalize(base + pathImpl.sep))
    if (!inside) throw new Error(`Path outside ${base} is not allowed`)
    return resolved
  }

  /**
   * Aceita só um nome simples (sem barras nem ".."), válido também no Windows
   */
  function safeSegment(name) {
    const value = String(name ?? '')
    const invalid =
      !value ||
      value === '.' ||
      value === '..' ||
      value.includes('/') ||
      value.includes('\\') ||
      (isWindows && (WINDOWS_INVALID_CHARS.test(value) || WINDOWS_RESERVED_NAMES.test(value) || /[. ]$/.test(value)))
    if (invalid) throw new Error(`Invalid file name: ${name}`)
    return value
  }

  /**
   * Caminho relativo com "/" em qualquer sistema, para o renderer não depender do separador
   */
  function toPosixRelative(baseDir, fullPath) {
    return pathImpl.relative(baseDir, fullPath).split(pathImpl.sep).join('/')
  }

  return { insideDir, safeSegment, toPosixRelative }
}
