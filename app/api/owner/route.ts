import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const tables = new Set(['products', 'services', 'offers', 'reviews'])
const settingsTable = 'owner_settings'

export async function POST(request: Request) {
  const body = await request.json()
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return NextResponse.json({ error: 'Supabase server configuration missing' }, { status: 500 })
  const admin = createClient(url, key)
  const fallbackPasscode = process.env.OWNER_PASSCODE || '9981'
  const { data: setting } = await admin.from(settingsTable).select('passcode').eq('id', 'main').maybeSingle()
  const expectedPasscode = setting?.passcode || fallbackPasscode
  if (body.action === 'login') return NextResponse.json({ ok: body.passcode === expectedPasscode })
  if (body.action === 'change_passcode') {
    if (body.currentPasscode !== expectedPasscode) return NextResponse.json({ error: 'Current passcode is incorrect' }, { status: 401 })
    if (typeof body.newPasscode !== 'string' || body.newPasscode.length < 4 || body.newPasscode.length > 32) return NextResponse.json({ error: 'Passcode must be 4-32 characters' }, { status: 400 })
    const { error } = await admin.from(settingsTable).upsert({ id: 'main', passcode: body.newPasscode }, { onConflict: 'id' })
    return NextResponse.json({ ok: !error, error: error?.message }, { status: error ? 400 : 200 })
  }
  if (request.headers.get('x-owner-passcode') !== expectedPasscode) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!tables.has(body.table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  if (body.action === 'insert') {
    const { data, error } = await admin.from(body.table).insert(body.payload).select().single()
    return NextResponse.json({ data, error: error?.message }, { status: error ? 400 : 200 })
  }
  if (body.action === 'update') {
    const { data, error } = await admin.from(body.table).update(body.payload).eq('id', body.id).select().single()
    return NextResponse.json({ data, error: error?.message }, { status: error ? 400 : 200 })
  }
  if (body.action === 'delete') {
    const { error } = await admin.from(body.table).delete().eq('id', body.id)
    return NextResponse.json({ ok: !error, error: error?.message }, { status: error ? 400 : 200 })
  }
  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
}
