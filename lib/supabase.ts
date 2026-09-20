import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
)

export type Product = {
  id: string
  name: string
  category?: string
  brand: string
  network: string
  spec: string
  price: number
  stock_status: string
  image_url: string
  gallery_urls?: string[]
}
export type Service = { id: string; title: string; description: string; icon: string; sort_order: number }
export type Offer = { id: string; title: string; description: string; badge: string | null; active: boolean }
export type Review = { id: string; customer_name: string; location: string | null; rating: number; comment: string; approved: boolean }
export type StoreTable = 'products' | 'services' | 'offers' | 'reviews'

export async function adminRequest(action: 'login' | 'change_passcode' | 'insert' | 'update' | 'delete', table?: StoreTable, payload?: unknown, id?: string, passcode?: string, extra?: { currentPasscode?: string; newPasscode?: string }) {
  const response = await fetch('/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', ...(passcode ? { 'x-owner-passcode': encodeURIComponent(passcode) } : {}) }, body: JSON.stringify({ action, table, payload, id, passcode, ...extra }) })
  return response.json()
}

export function whatsappLink(message: string) {
  return `https://wa.me/919981176713?text=${encodeURIComponent(message)}`
}

export const mapsLink = 'https://maps.app.goo.gl/9aAmNUfEGnKDcEr87'
export const defaultProducts: Product[] = []
export const defaultServices: Service[] = []
