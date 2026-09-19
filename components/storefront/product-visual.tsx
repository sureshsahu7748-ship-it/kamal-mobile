'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Product } from '@/lib/supabase'

export function ProductVisual({ product }: { product: Product }) {
  const images = [product.image_url, ...(product.gallery_urls || [])].filter(Boolean)
  const [active, setActive] = useState(0)

  return (
    <div className="product-image">
      <img src={images[active] || product.image_url} alt={`${product.name} ${active + 1}`} />
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
