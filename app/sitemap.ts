import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export const revalidate = 3600
const base = 'https://kamal-mobile.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let items: MetadataRoute.Sitemap = []
  try { const { data } = await supabase.from('products').select('id, created_at'); items = (data || []).map(p => ({ url: `${base}/p/${encodeURIComponent(String(p.id))}`, lastModified: p.created_at ? new Date(p.created_at) : new Date(), changeFrequency: 'weekly' as const, priority: 0.7 })) } catch {}
  return [{ url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }, ...items]
}
