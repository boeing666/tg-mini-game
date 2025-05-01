import crypto from 'crypto'

const SECRET = process.env.JWT_SECRET || 'super_secret_bytes'
const AES_KEY = crypto.createHash('sha256').update(SECRET).digest()

export function encodeImagePath(path: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-ctr', AES_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(path, 'utf8'), cipher.final()])
  const result = Buffer.concat([iv, encrypted])
  return result.toString('base64url')
}

export function decodeImageHash(hash: string): string | null {
  try {
    const data = Buffer.from(hash, 'base64url')
    const iv = data.subarray(0, 16)
    const encrypted = data.subarray(16)
    const decipher = crypto.createDecipheriv('aes-256-ctr', AES_KEY, iv)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}
