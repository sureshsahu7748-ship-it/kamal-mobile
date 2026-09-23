'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Clock3, MapPin, Phone } from 'lucide-react'
import { mapsLink, whatsappLink, type Product } from '@/lib/supabase'
import { WhatsAppIcon } from '@/components/storefront/icons'

const bg = (url: string) => ({ backgroundImage: `url("${String(url).replace(/"/g, '%22')}")` })

export function ProductDetail({ product, products, onClose, onOpen, standalone = false }: { product: Product; products: Product[]; onClose: () => void; onOpen: (id: string) => void; standalone?: boolean }) {
  const images = useMemo(() => [product.image_url, ...(product.gallery_urls || [])].filter(Boolean), [product])
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    backRef.current?.focus()
    return () => { document.body.style.overflow = previous }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setIndex(0)
    track.current?.scrollTo({ left: 0 })
    scroller.current?.scrollTo({ top: 0 })
  }, [product.id])

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(images.length - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setIndex(next)
  }
  const onScroll = () => {
    const el = track.current
    if (!el || !el.clientWidth) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const price = Number(product.price).toLocaleString('en-IN')
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/p/${encodeURIComponent(product.id)}`
  const message = `नमस्ते, मुझे यह प्रोडक्ट चाहिए:\n${product.name}${product.spec ? ` (${product.spec})` : ''}\nकीमत: ₹${price}\n${shareUrl}`
  const low = (product.stock_status || '').includes('कम')
  const off = product.mrp && Number(product.mrp) > Number(product.price) ? Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100) : 0
  const mrpText = Number(product.mrp).toLocaleString('en-IN')

  const related = useMemo(() => {
    const others = products.filter(p => p.id !== product.id)
    const same = others.filter(p => product.category && p.category === product.category)
    return [...same, ...others.filter(p => !same.includes(p))].slice(0, 8)
  }, [products, product])

  async function share() {
    const data = { title: product.name, text: `${product.name} — ₹${price}`, url: shareUrl }
    try {
      if (typeof navigator.share === 'function') { await navigator.share(data); return }
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const buttons = (
    <>
      <a className="pd-btn wa" href={whatsappLink(message)} target="_blank" rel="noreferrer"><WhatsAppIcon size={20} /> WhatsApp पर पूछें</a>
      <a className="pd-btn call" href="tel:9981176713"><Phone size={18} /> कॉल करें</a>
    </>
  )

  return (
    <div className={standalone ? 'pd-overlay pd-page' : 'pd-overlay'} role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : true} aria-label={product.name}>
      <div className="pd-bar">
        <button ref={backRef} type="button" className="pd-back" onClick={onClose} aria-label="वापस जाएं"><ChevronRight size={22} className="pd-flip" /><span>वापस</span></button>
        <span className="pd-bar-title">Kamal Mobile & Video Graphy</span>
        <button type="button" className="pd-share" onClick={share}>{copied ? 'लिंक कॉपी हुआ ✓' : 'शेयर करें'}</button>
      </div>

      <div className="pd-scroll" ref={scroller}>
        <div className="pd-grid">
          <div className="pd-gallery">
            <div className="pd-main">
              <div className="pd-track" ref={track} onScroll={onScroll}>
                {images.map((u, i) => (
                  <div className="pd-slide" key={`${u}-${i}`}>
                    <span className="photo-bg" style={bg(u)} aria-hidden="true" />
                    <img src={u} alt={`${product.name} ${i + 1}`} />
                  </div>
                ))}
              </div>
              {images.length > 1 && <>
                <button type="button" className="pd-arrow left" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="पिछली फ़ोटो"><ChevronRight size={20} className="pd-flip" /></button>
                <button type="button" className="pd-arrow right" onClick={() => goTo(index + 1)} disabled={index === images.length - 1} aria-label="अगली फ़ोटो"><ChevronRight size={20} /></button>
              </>}
            </div>
            {images.length > 1 && <div className="pd-dots">{images.map((u, i) => <span key={`${u}-${i}`} className={i === index ? 'active' : ''} />)}</div>}
            {images.length > 1 && <div className="pd-thumbs">{images.map((u, i) => (
              <button type="button" key={`${u}-${i}`} className={i === index ? 'active' : ''} onClick={() => goTo(i)} aria-label={`फ़ोटो ${i + 1}`}><img src={u} alt="" /></button>
            ))}</div>}
          </div>

          <div className="pd-info">
            <div className="pd-brand">ब्रांड: {product.brand}</div>
            <h1 className="pd-title">{product.name}</h1>
            <div className="pd-priceline">{off > 0 && <span className="pd-off">-{off}%</span>}<div className="pd-price"><small>₹</small>{price}</div></div>
            {off > 0 && <div className="pd-mrp">M.R.P.: <s>₹{mrpText}</s></div>}
            {off > 0 && <div className="pd-save">आप ₹{(Number(product.mrp) - Number(product.price)).toLocaleString('en-IN')} बचा रहे हैं</div>}
            <div className={low ? 'pd-stock low' : 'pd-stock'}>{low ? 'कम स्टॉक — जल्दी पूछें' : product.stock_status ? `✓ ${product.stock_status}` : ''}</div>
            <div className="pd-chips">
              {product.category && <span>{product.category}</span>}
              {product.network && <span>{product.network}</span>}
              {product.spec && <span>{product.spec}</span>}
            </div>
            <div className="pd-buy">{buttons}</div>

            <div className="pd-box">
              <h2>प्रोडक्ट की जानकारी</h2>
              <div className="pd-row"><span>नाम</span><b>{product.name}</b></div>
              <div className="pd-row"><span>ब्रांड</span><b>{product.brand}</b></div>
              {product.category && <div className="pd-row"><span>कैटेगरी</span><b>{product.category}</b></div>}
              {product.network && <div className="pd-row"><span>प्रकार / नेटवर्क</span><b>{product.network}</b></div>}
              {product.spec && <div className="pd-row"><span>विवरण</span><b>{product.spec}</b></div>}
              {off > 0 && <div className="pd-row"><span>MRP</span><b><s>₹{mrpText}</s> ({off}% छूट)</b></div>}
              <div className="pd-row"><span>कीमत</span><b>₹{price}</b></div>
            </div>

            <div className="pd-box">
              <h2>दुकान की जानकारी</h2>
              <div className="pd-row"><span><MapPin size={15} /> पता</span><b>मेन रोड, दुल्लापुर बाजार</b></div>
              <div className="pd-row"><span><Clock3 size={15} /> समय</span><b>सुबह 9:00 — रात 8:00</b></div>
              <div className="pd-row"><span><Phone size={15} /> फोन</span><b>99811 76713</b></div>
              <a className="pd-maps" href={mapsLink} target="_blank" rel="noreferrer">रास्ता देखें</a>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="pd-related">
            <h2>और प्रोडक्ट देखें</h2>
            <div className="pd-rel-list">
              {related.map(p => (
                <button type="button" className="pd-rel" key={p.id} onClick={() => onOpen(p.id)}>
                  <span className="pd-rel-img"><span className="photo-bg" style={bg(p.image_url)} aria-hidden="true" /><img src={p.image_url} alt={`${p.name} की फोटो`} loading="lazy" /></span>
                  <span className="pd-rel-meta"><span>{p.brand}</span>{p.network && <span>{p.network}</span>}</span>
                  <span className="pd-rel-name">{p.name}</span>
                  {p.spec && <span className="pd-rel-spec">{p.spec}</span>}
                  <b className="pd-rel-price">₹{Number(p.price).toLocaleString('en-IN')}</b>
                  <span className="pd-rel-action">देखें</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="pd-sticky">{buttons}</div>
    </div>
  )
}

export default ProductDetail
