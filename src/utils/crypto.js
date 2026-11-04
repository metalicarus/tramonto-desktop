const PBKDF2_ITERATIONS = 310000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const BASE64_CHUNK = 0x8000

/**
 * Converte em blocos: espalhar um Uint8Array grande em fromCharCode estoura a pilha
 */
function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK))
  }
  return btoa(binary)
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

/**
 * Comparação em tempo constante
 */
function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

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

  return bytesToBase64(result)
}

/**
 * Descriptografa um objeto JSON
 */
export async function decrypt(encryptedBase64, password) {
  const bytes = base64ToBytes(encryptedBase64)

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
  return safeEqual(storedHash, `${saltHex}:${hashHex}`)
}

/**
 * Gera recovery key: 24 bytes aleatórios em hexadecimal
 */
export function generateRecoveryKey() {
  const words = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(words).map(b => b.toString(16).padStart(2, '0')).join('-')
}

/**
 * Chave local aleatória (vault key) que cifra os dados em disco.
 * Fica guardada embrulhada pela senha master e pela recovery key,
 * então trocar a senha pela recovery key não perde o que já foi cifrado.
 */
export function generateVaultKey() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
}

export function wrapVaultKey(rawVaultKey, secret) {
  return encrypt({ key: rawVaultKey }, secret)
}

export async function unwrapVaultKey(wrapped, secret) {
  const { key } = await decrypt(wrapped, secret)
  return importVaultKey(key)
}

export async function unwrapRawVaultKey(wrapped, secret) {
  const { key } = await decrypt(wrapped, secret)
  return key
}

export function importVaultKey(rawVaultKey) {
  return crypto.subtle.importKey('raw', base64ToBytes(rawVaultKey), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptWithKey(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  )
  const result = new Uint8Array(IV_LENGTH + encrypted.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(encrypted), IV_LENGTH)
  return bytesToBase64(result)
}

export async function decryptWithKey(encryptedBase64, key) {
  const bytes = base64ToBytes(encryptedBase64)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, IV_LENGTH) },
    key,
    bytes.slice(IV_LENGTH)
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}

export async function encryptFile(data, password) {
  return encrypt(data, password)
}

export async function decryptFile(encryptedData, password) {
  return decrypt(encryptedData, password)
}
