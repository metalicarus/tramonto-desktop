const PBKDF2_ITERATIONS = 310000
const SALT_LENGTH = 16
const IV_LENGTH = 12

/**
 * Deriva uma chave AES-GCM a partir da senha master
 */
async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Criptografa um objeto JSON
 */
export async function encrypt(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)

  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data))
  )

  // Empacota salt + iv + dados criptografados em base64
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  result.set(salt, 0)
  result.set(iv, SALT_LENGTH)
  result.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH)

  return btoa(String.fromCharCode(...result))
}

/**
 * Descriptografa um objeto JSON
 */
export async function decrypt(encryptedBase64, password) {
  const bytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))

  const salt = bytes.slice(0, SALT_LENGTH)
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const data = bytes.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(password, salt)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return JSON.parse(new TextDecoder().decode(decrypted))
}

/**
 * Gera um hash da senha para verificação (não usado para criptografia)
 */
export async function hashPassword(password) {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))

  // Exporta a chave derivada como verificador
  const exported = await crypto.subtle.exportKey('raw', await crypto.subtle.importKey(
    'raw',
    enc.encode(password + 'verify'),
    'PBKDF2',
    false,
    ['deriveKey']
  ).then(km => crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )))

  const hashArray = Array.from(new Uint8Array(exported))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return `${saltHex}:${hashHex}`
}

/**
 * Verifica se a senha está correta comparando com o hash armazenado
 */
export async function verifyPassword(password, storedHash) {
  // eslint-disable-next-line
  const [saltHex, _] = storedHash.split(':')

  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)))

  const enc = new TextEncoder()
  const exported = await crypto.subtle.exportKey('raw', await crypto.subtle.importKey(
    'raw',
    enc.encode(password + 'verify'),
    'PBKDF2',
    false,
    ['deriveKey']
  ).then(km => crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )))

  const hashHex = Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('')
  return storedHash === `${saltHex}:${hashHex}`
}

/**
 * Gera recovery key de 24 palavras
 */
export function generateRecoveryKey() {
  const words = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(words).map(b => b.toString(16).padStart(2, '0')).join('-')
}

export async function encryptFile(data, password) {
  return encrypt(data, password)
}

export async function decryptFile(encryptedData, password) {
  return decrypt(encryptedData, password)
}
