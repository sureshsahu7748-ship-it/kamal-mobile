'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductDetail } from '@/components/storefront/product-detail'
import type { Product } from '@/lib/supabase'

export function ProductPage({ product, products }: { product: Product; products: Product[] }) {
  const router = useRouter()
  const [dark, setDark] = useState(false)
  useEffect(() => { try { setDark(localStorage.getItem('km-theme') === 'dark') } catch {} }, [])
  return (
    <main className={dark ? 'site dark-mode' : 'site'}>
      <ProductDetail standalone product={product} products={products} onClose={() => router.push('/#phones')} onOpen={id => router.push(`/p/${encodeURIComponent(id)}`)} />
    </main>
  )
}

export default ProductPage
