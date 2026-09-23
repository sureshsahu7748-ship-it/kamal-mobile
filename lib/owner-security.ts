import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const MIN_PASSCODE = 6
export const MAX_PASSCODE = 32

const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000
const attempts = new Map<string, { fails: number; until: number }>()

/** कौन सा visitor है (IP के आधार पर) — गलत पासकोड गिनने के लिए */
export function clientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return (forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown'
}

/** अगर यह visitor रुका हुआ है तो बचे हुए milliseconds, वरना 0 */
export function lockedFor(id: string): number {
  const entry = attempts.get(id)
  if (!entry || !entry.until) return 0
  const left = entry.until - Date.now()
  if (left <= 0) { attempts.delete(id); return 0 }
  return left
}

export function recordFail(id: string) {
  if (attempts.size > 500) attempts.clear()
  const entry = attempts.get(id) || { fails: 0, until: 0 }
  entry.fails += 1
  if (entry.fails >= MAX_FAILS) { entry.until = Date.now() + LOCK_MS; entry.fails = 0 }
  attempts.set(id, entry)
}

export function clearFails(id: string) { attempts.delete(id) }

export function isHashed(stored: string): boolean { return stored.startsWith('scrypt$') }

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(passcode, salt, 32).toString('hex')
  return `scrypt$${salt}$${hash}`
}

/** hashed और पुराना (plain) दोनों तरह के saved पासकोड से मिलान करता है */
export function verifyPasscode(input: unknown, stored: string): boolean {
  if (typeof input !== 'string' || !input || !stored) return false
  try {
    if (isHashed(stored)) {
      const [, salt, hash] = stored.split('$')
      const expected = Buffer.from(hash, 'hex')
      const actual = scryptSync(input, salt, expected.length)
      return expected.length === actual.length && timingSafeEqual(expected, actual)
    }
    const a = Buffer.from(input)
    const b = Buffer.from(stored)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** सिर्फ़ तय किए हुए fields ही database तक जाने देता है। गलत हो तो null */
export function cleanPayload(table: string, raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (table === 'products') {
    const price = Number(p.price)
    if (!text(p.name, 120) || !Number.isFinite(price) || price < 0) return null
    const mrpNumber = p.mrp === '' || p.mrp === null || p.mrp === undefined ? NaN : Number(p.mrp)
    const mrp = Number.isFinite(mrpNumber) && mrpNumber > price ? mrpNumber : null
    const gallery = Array.isArray(p.gallery_urls) ? p.gallery_urls.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 5) : []
    return {
      name: text(p.name, 120),
      category: text(p.category, 60) || 'अन्य',
      brand: text(p.brand, 60) || 'अन्य',
      network: text(p.network, 40) || 'सामान्य',
      spec: text(p.spec, 120),
      price,
      ...('mrp' in p ? { mrp } : {}),
      stock_status: text(p.stock_status, 40) || 'स्टॉक में',
      image_url: text(p.image_url, 1000),
      gallery_urls: gallery,
    }
  }
  if (table === 'services') {
    if (!text(p.title, 120) || !text(p.description, 400)) return null
    const order = Number(p.sort_order)
    return { title: text(p.title, 120), description: text(p.description, 400), icon: text(p.icon, 40) || 'Wrench', sort_order: Number.isFinite(order) ? order : 99 }
  }
  if (table === 'offers') {
    if (!text(p.title, 120) || !text(p.description, 400)) return null
    return { title: text(p.title, 120), description: text(p.description, 400), badge: text(p.badge, 30) || null, active: typeof p.active === 'boolean' ? p.active : true }
  }
  if (table === 'reviews') {
    const rating = Math.round(Number(p.rating))
    if (!text(p.customer_name, 80) || !text(p.comment, 500) || !(rating >= 1 && rating <= 5)) return null
    return { customer_name: text(p.customer_name, 80), location: text(p.location, 80) || null, rating, comment: text(p.comment, 500), approved: typeof p.approved === 'boolean' ? p.approved : true }
  }
  return null
}
