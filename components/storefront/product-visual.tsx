'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Product } from '@/lib/supabase'

export function ProductVisual({ product }: { product: Product }) {
  const images = [product.image_url, ...(product.gallery_urls || [])].filter(Boolean)
  const [active, setActive] = useState(0)
  const src = images[active] || product.image_url

  return (
    <div className="product-image">
      <span className="photo-bg" style={{ backgroundImage: `url("${String(src).replace(/"/g, '%22')}")` }} aria-hidden="true" />
      <img src={src} alt={`${product.name} ${active + 1}`} loading="lazy" onError={event => { event.currentTarget.style.display = 'none' }} />
      <span className={product.stock_status.includes('कम') ? 'stock low' : 'stock'}>
        <Check size={13} /> {product.stock_status}
      </span>
      <div className="product-thumbnails">
        {images.slice(0, 3).map((url, index) => (
          <button type="button" key={`${url}-${index}`} className={active === index ? 'product-thumb active' : 'product-thumb'} onClick={() => setActive(index)} aria-label={`${product.name} फोटो ${index + 1}`}>
            <img src={url} alt="" />
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProductVisual
