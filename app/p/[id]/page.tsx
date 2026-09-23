import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase, type Product } from '@/lib/supabase'
import { ProductPage } from '@/components/storefront/product-page'

export const revalidate = 60
const SITE = 'https://kamal-mobile.vercel.app'

async function getProduct(id: string): Promise<Product | null> {
  try { const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle(); return (data as Product) || null } catch { return null }
}
async function getAll(): Promise<Product[]> {
  try { const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(40); return (data as Product[]) || [] } catch { return [] }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const p = await getProduct(id)
  if (!p) return { title: 'प्रोडक्ट नहीं मिला | Kamal Mobile & Video Graphy', robots: { index: false, follow: true } }
  const price = Number(p.price).toLocaleString('en-IN')
  const title = `${p.name} — ₹${price} | Kamal Mobile & Video Graphy`
  const description = [p.brand && p.brand !== 'अन्य' ? p.brand : '', p.spec, 'मेन रोड, दुल्लापुर बाजार। WhatsApp या कॉल: 99811 76713'].filter(Boolean).join(' · ')
  return { title, description, alternates: { canonical: `/p/${encodeURIComponent(id)}` }, openGraph: { type: 'website', locale: 'hi_IN', siteName: 'Kamal Mobile & Video Graphy', title, description, url: `/p/${encodeURIComponent(id)}`, images: p.image_url ? [{ url: p.image_url, alt: p.name }] : undefined }, twitter: { card: 'summary_large_image', title, description, images: p.image_url ? [p.image_url] : undefined } }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [product, all] = await Promise.all([getProduct(id), getAll()])
  if (!product) notFound()
  const low = (product.stock_status || '').includes('कम')
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, image: [product.image_url, ...(product.gallery_urls || [])].filter(Boolean), description: [product.brand, product.spec, product.category].filter(Boolean).join(' · '), brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined, offers: { '@type': 'Offer', priceCurrency: 'INR', price: Number(product.price), availability: low ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock', url: `${SITE}/p/${encodeURIComponent(id)}` } }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} /><ProductPage product={product} products={all} /></>
}
