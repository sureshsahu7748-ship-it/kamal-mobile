import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cleanPayload, clearFails, clientId, hashPasscode, isHashed, lockedFor, MAX_PASSCODE, MIN_PASSCODE, recordFail, verifyPasscode } from '@/lib/owner-security'

const tables = new Set(['products', 'services', 'offers', 'reviews'])
const settingsTable = 'owner_settings'
const json = (data: Record<string, unknown>, status = 200) => NextResponse.json(data, { status })

async function uploadToCloudinary(file: { type: string; data: string; name: string }) {
  const cloudinaryUrl = process.env.CLOUDINARY_URL || ''
  const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)$/)
  if (!match) throw new Error('Cloudinary server configuration missing')
  const [, apiKey, apiSecret, cloudName] = match
  const timestamp = Math.floor(Date.now() / 1000)
  const signatureSource = `folder=kamal-mobile/products&timestamp=${timestamp}${apiSecret}`
  const signature = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(signatureSource)).then(buffer => Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join(''))
  const form = new FormData()
  form.append('file', new Blob([Buffer.from(file.data.split(',')[1] || '', 'base64')], { type: file.type }), file.name)
  form.append('api_key', apiKey)
  form.append('timestamp', String(timestamp))
  form.append('folder', 'kamal-mobile/products')
  form.append('signature', signature)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form })
  const result = await response.json() as { secure_url?: string; error?: { message?: string } }
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary upload failed')
  return result.secure_url
}

// पासकोड header में encode होकर आता है (हिंदी/खास अक्षर के लिए)
function headerPasscode(request: Request): string {
  const raw = request.headers.get('x-owner-passcode') || ''
  try { return decodeURIComponent(raw) } catch { return raw }
}

export async function POST(request: Request) {
  let body: any
  try { body = await request.json() } catch { return json({ error: 'गलत अनुरोध' }, 400) }
  if (!body || typeof body !== 'object') return json({ error: 'गलत अनुरोध' }, 400)

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return json({ error: 'Supabase server configuration missing' }, 500)

  // बार-बार गलत पासकोड डालने वाले को कुछ देर के लिए रोकना
  const id = clientId(request)
  const wait = lockedFor(id)
  if (wait) return json({ ok: false, locked: true, error: `बहुत ज़्यादा गलत कोशिशें हुईं। ${Math.ceil(wait / 60000)} मिनट बाद फिर कोशिश करें।` }, 429)

  const admin = createClient(url, key)
  const envPasscode = process.env.OWNER_PASSCODE
  const { data: setting } = await admin.from(settingsTable).select('passcode').eq('id', 'main').maybeSingle()
  // पुराना व्यवहार वैसा ही: database > OWNER_PASSCODE > डिफ़ॉल्ट (ताकि आप लॉगिन से बाहर न हों)
  const stored: string = setting?.passcode || envPasscode || '9981'
  const usingDefault = !setting?.passcode && !envPasscode

  if (body.action === 'login') {
    if (!verifyPasscode(body.passcode, stored)) { recordFail(id); return json({ ok: false, error: 'पासकोड गलत है।' }, 401) }
    clearFails(id)
    // पुराना सादा पासकोड सही निकला तो उसे चुपचाप सुरक्षित (hashed) रूप में बदल देना
    if (setting?.passcode && !isHashed(setting.passcode)) {
      await admin.from(settingsTable).upsert({ id: 'main', passcode: hashPasscode(body.passcode) }, { onConflict: 'id' })
    }
    return json({ ok: true, usingDefault })
  }

  if (body.action === 'change_passcode') {
    if (!verifyPasscode(body.currentPasscode, stored)) { recordFail(id); return json({ error: 'Current passcode is incorrect' }, 401) }
    const next = body.newPasscode
    if (typeof next !== 'string' || next.length < MIN_PASSCODE || next.length > MAX_PASSCODE) return json({ error: `पासकोड ${MIN_PASSCODE} से ${MAX_PASSCODE} अक्षरों का होना चाहिए।` }, 400)
    const { error } = await admin.from(settingsTable).upsert({ id: 'main', passcode: hashPasscode(next) }, { onConflict: 'id' })
    if (error) return json({ ok: false, error: error.message }, 400)
    clearFails(id)
    return json({ ok: true })
  }

  if (!verifyPasscode(headerPasscode(request), stored)) { recordFail(id); return json({ error: 'Unauthorized' }, 401) }
  clearFails(id)

  if (body.action === 'upload_images') {
    const files = body.files as { name: string; type: string; data: string }[]
    if (!Array.isArray(files) || files.length < 1 || files.length > 3) return json({ error: '1 से 3 फ़ोटो चुनें' }, 400)
    const urls: string[] = []
    try {
      for (const [index, file] of files.entries()) {
        if (!file || typeof file.name !== 'string' || typeof file.type !== 'string' || typeof file.data !== 'string' || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.data.length > 8_000_000) {
          return json({ error: 'सिर्फ़ JPG, PNG या WebP फ़ोटो (8MB तक) चलेगी' }, 400)
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-') || 'photo.jpg'
        urls.push(await uploadToCloudinary({ name: safeName, type: file.type, data: file.data }))
      }
    } catch {
      return json({ error: 'फ़ोटो सेव नहीं हो पाई। Cloudinary की सेटिंग जाँचें।' }, 500)
    }
    return json({ urls })
  }

  if (typeof body.table !== 'string' || !tables.has(body.table)) return json({ error: 'Invalid table' }, 400)

  if (body.action === 'insert') {
    const payload = cleanPayload(body.table, body.payload)
    if (!payload) return json({ error: 'जानकारी अधूरी या गलत है।' }, 400)
    const { data, error } = await admin.from(body.table).insert(payload).select().single()
    return json({ data, error: error?.message }, error ? 400 : 200)
  }
  if (body.action === 'update') {
    const payload = cleanPayload(body.table, body.payload)
    if (!payload || typeof body.id !== 'string' || !body.id) return json({ error: 'जानकारी अधूरी या गलत है।' }, 400)
    const { data, error } = await admin.from(body.table).update(payload).eq('id', body.id).select().single()
    return json({ data, error: error?.message }, error ? 400 : 200)
  }
  if (body.action === 'delete') {
    if (typeof body.id !== 'string' || !body.id) return json({ error: 'गलत अनुरोध' }, 400)
    const { error } = await admin.from(body.table).delete().eq('id', body.id)
    return json({ ok: !error, error: error?.message }, error ? 400 : 200)
  }
  return json({ error: 'Unsupported action' }, 400)
}

export const runtime = 'nodejs'
