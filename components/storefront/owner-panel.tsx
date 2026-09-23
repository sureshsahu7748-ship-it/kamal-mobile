'use client'

import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { adminRequest, Offer, Product, Review, Service } from '@/lib/supabase'

type Tab = 'products' | 'services' | 'offers' | 'reviews'
type Form = Record<string, string>
type Data = { products: Product[]; services: Service[]; offers: Offer[]; reviews: Review[] }

const tabNames: Record<Tab, string> = { products: 'प्रोडक्ट', services: 'सेवाएं', offers: 'ऑफर', reviews: 'रिव्यू' }
const iconNames = ['Wrench', 'Cpu', 'ShieldCheck', 'Smartphone', 'Bluetooth', 'CreditCard', 'IndianRupee', 'PackageCheck', 'TabletSmartphone', 'Zap', 'Clock3', 'Sparkles']

const MAX_PHOTOS = 5

const photoList = (f: Form) => [f.image_url, ...(f.gallery_urls || '').split(/[,\n]/)].map(u => (u || '').trim()).filter(Boolean)
const withPhotos = (f: Form, list: string[]): Form => ({ ...f, image_url: list[0] || '', gallery_urls: list.slice(1).join(',') })

// कैमरे की बड़ी फ़ोटो (4-8MB) को अपलोड से पहले छोटा कर देना (~300KB), ताकि Vercel की सीमा में रहे
async function compressImage(file: File, maxSide = 1400, quality = 0.82): Promise<{ name: string; type: string; data: string }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('image'))
      image.src = objectUrl
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale))
    canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { name: (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data: canvas.toDataURL('image/jpeg', quality) }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function OwnerPanel({ onClose, data, refresh }: { onClose: () => void; data: Data; refresh: () => Promise<void> }) {
  const [authed, setAuthed] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [weak, setWeak] = useState(false)
  const [tab, setTab] = useState<Tab>('products')
  const [form, setForm] = useState<Form>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [newPasscode, setNewPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))
  const scrollTop = () => document.querySelector('.admin-panel')?.scrollTo({ top: 0, behavior: 'smooth' })

  function resetForm() { setForm({}); setEditingId(null) }

  async function login(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await adminRequest('login', undefined, undefined, undefined, passcode)
      if (r.ok) { setAuthed(true); setWeak(Boolean(r.usingDefault)); setNotice('') }
      else setNotice(r.error || 'पासकोड गलत है।')
    } catch {
      setNotice('सर्वर से जुड़ नहीं पाए। इंटरनेट जाँचें और फिर कोशिश करें।')
    }
    setBusy(false)
  }

  function payload(): unknown {
    if (tab === 'products') {
      return {
        name: form.name, brand: form.brand, spec: form.spec, price: Number(form.price), mrp: form.mrp ? Number(form.mrp) : null,
        category: form.category, network: form.network, stock_status: form.stock_status,
        image_url: form.image_url,
        gallery_urls: (form.gallery_urls || '').split(/[,\n]/).map(u => u.trim()).filter(Boolean),
      }
    }
    if (tab === 'services') return { title: form.title, description: form.description, icon: form.icon, sort_order: Number(form.sort_order || 99) }
    if (tab === 'offers') return { title: form.title, description: form.description, badge: form.badge, active: true }
    return { customer_name: form.customer_name, location: form.location, rating: Number(form.rating || 5), comment: form.comment, approved: true }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (tab === 'products' && !form.image_url) { setNotice('पहले प्रोडक्ट की फ़ोटो चुनें।'); return }
    if (tab === 'products' && form.mrp && Number(form.mrp) <= Number(form.price)) { setNotice('MRP (पुरानी कीमत) असली कीमत से ज़्यादा होनी चाहिए, या उसे खाली छोड़ें।'); return }
    setBusy(true)
    try {
      const r = editingId
        ? await adminRequest('update', tab, payload(), editingId, passcode)
        : await adminRequest('insert', tab, payload(), undefined, passcode)
      if (r.error) setNotice(r.error)
      else { setNotice(r.warning || (editingId ? 'बदलाव सहेज दिया गया।' : 'सहेज दिया गया।')); resetForm(); await refresh() }
    } catch {
      setNotice('सहेज नहीं पाए, फिर कोशिश करें।')
    }
    setBusy(false)
  }

  function startEdit(row: any) {
    setEditingId(row.id)
    setNotice('')
    if (tab === 'products') {
      setForm({ name: row.name || '', brand: row.brand || '', spec: row.spec || '', price: String(row.price ?? ''), mrp: row.mrp ? String(row.mrp) : '', category: row.category || '', network: row.network || '', stock_status: row.stock_status || 'स्टॉक में', image_url: row.image_url || '', gallery_urls: (row.gallery_urls || []).join(',') })
    } else if (tab === 'services') {
      setForm({ title: row.title || '', description: row.description || '', icon: row.icon || 'Wrench', sort_order: String(row.sort_order ?? 99) })
    } else if (tab === 'offers') {
      setForm({ title: row.title || '', description: row.description || '', badge: row.badge || '' })
    } else {
      setForm({ customer_name: row.customer_name || '', location: row.location || '', rating: String(row.rating ?? 5), comment: row.comment || '' })
    }
    scrollTop()
  }

  async function remove(row: any) {
    const label = row.name || row.title || row.customer_name
    if (!window.confirm(`"${label}" को हटाना है?`)) return
    const r = await adminRequest('delete', tab, undefined, row.id, passcode)
    setNotice(r.error || 'हटा दिया गया।')
    if (editingId === row.id) resetForm()
    await refresh()
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const room = MAX_PHOTOS - photoList(form).length
    if (room <= 0) { setNotice(`ज़्यादा से ज़्यादा ${MAX_PHOTOS} फ़ोटो जोड़ सकते हैं। पहले कोई फ़ोटो हटाएँ।`); return }
    const chosen = files.slice(0, room)
    setBusy(true)
    let added = 0
    let failed = ''
    for (const [i, file] of chosen.entries()) {
      setNotice(`फ़ोटो ${i + 1}/${chosen.length} अपलोड हो रही है...`)
      try {
        const encoded = await compressImage(file)
        const response = await fetch('/api/owner', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-owner-passcode': encodeURIComponent(passcode) }, body: JSON.stringify({ action: 'upload_images', files: [encoded] }) })
        const result = await response.json().catch(() => ({} as { urls?: string[]; error?: string }))
        if (result.urls?.length) {
          setForm(f => withPhotos(f, [...photoList(f), ...result.urls].slice(0, MAX_PHOTOS)))
          added += 1
        } else {
          failed = result.error || 'फ़ोटो अपलोड नहीं हो पाई। इंटरनेट जाँचकर फिर कोशिश करें।'
          break
        }
      } catch {
        failed = 'यह फ़ोटो पढ़ नहीं पाए। कोई और फ़ोटो (JPG या PNG) चुनें।'
        break
      }
    }
    if (failed) setNotice(added ? `${added} फ़ोटो जुड़ गई, पर आगे की नहीं जुड़ पाई: ${failed}` : failed)
    else setNotice(files.length > chosen.length ? `${added} फ़ोटो जुड़ गई। (${MAX_PHOTOS} से ज़्यादा की जगह नहीं है)` : `${added} फ़ोटो जुड़ गई।`)
    setBusy(false)
  }

  async function copyLink(id: string) {
    const link = `${window.location.origin}/p/${encodeURIComponent(id)}`
    try { await navigator.clipboard.writeText(link); setNotice('प्रोडक्ट का लिंक कॉपी हो गया। WhatsApp में चिपका सकते हैं।') } catch { setNotice(link) }
  }

  const removePhoto = (index: number) => setForm(f => withPhotos(f, photoList(f).filter((_, i) => i !== index)))
  const makeMain = (index: number) => setForm(f => { const list = photoList(f); return withPhotos(f, [list[index], ...list.filter((_, i) => i !== index)]) })

  async function changePasscode(e: FormEvent) {
    e.preventDefault()
    if (newPasscode.length < 6) { setNotice('नया पासकोड कम से कम 6 अक्षरों का रखें।'); return }
    if (newPasscode !== confirmPasscode) { setNotice('दोनों पासकोड एक जैसे नहीं हैं।'); return }
    const r = await adminRequest('change_passcode', undefined, undefined, undefined, undefined, { currentPasscode: passcode, newPasscode })
    if (r.ok) {
      setPasscode(newPasscode); setNewPasscode(''); setConfirmPasscode(''); setWeak(false); setShowPass(false)
      setNotice('पासकोड बदल दिया गया। अगली बार नया पासकोड इस्तेमाल करें।')
    } else {
      setNotice(r.error === 'Current passcode is incorrect' ? 'पुराना पासकोड गलत है।' : r.error || 'पासकोड बदलने में समस्या हुई।')
    }
  }

  if (!authed) {
    return (
      <div className="admin-overlay"><form className="admin-panel" onSubmit={login}>
        <button type="button" className="admin-close" onClick={onClose} aria-label="बंद करें"><X /></button>
        <div className="eyebrow teal"><span /> मालिक के लिए</div>
        <h2>Owner Login</h2>
        <p>स्टोर की जानकारी बदलने के लिए पासकोड डालें।</p>
        <input className="admin-input" type="password" autoComplete="current-password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="पासकोड" />
        <button className="button primary admin-submit" type="submit" disabled={busy || !passcode}>{busy ? 'जाँच रहे हैं...' : 'लॉगिन करें'}</button>
        {notice && <small className="admin-hint">{notice}</small>}
      </form></div>
    )
  }

  const rows = data[tab] as any[]
  const photos = photoList(form)

  return (
    <div className="admin-overlay"><div className="admin-panel admin-wide">
      <div className="admin-head">
        <div><div className="eyebrow teal"><span /> कंट्रोल पैनल</div><h2>स्टोर मैनेज करें</h2></div>
        <div className="admin-head-actions">
          <button type="button" className="button admin-pass-btn" onClick={() => setShowPass(!showPass)}>{showPass ? 'बंद करें' : 'पासकोड बदलें'}</button>
          <button className="admin-close" onClick={onClose} aria-label="बंद करें"><X /></button>
        </div>
      </div>

      {weak && <div className="admin-notice admin-warn">सावधान: अभी डिफ़ॉल्ट पासकोड चल रहा है। ऊपर दाईं ओर "पासकोड बदलें" बटन से इसे तुरंत बदल लें।</div>}
      {notice && <div className="admin-notice">{notice}</div>}

      {showPass && (
        <form className="admin-form" onSubmit={changePasscode}>
          <label>नया पासकोड (कम से कम 6 अक्षर)<input type="password" autoComplete="new-password" minLength={6} maxLength={32} value={newPasscode} onChange={e => setNewPasscode(e.target.value)} required /></label>
          <label>नया पासकोड दोबारा<input type="password" autoComplete="new-password" minLength={6} maxLength={32} value={confirmPasscode} onChange={e => setConfirmPasscode(e.target.value)} required /></label>
          <button type="submit">नया पासकोड सेव करें</button>
        </form>
      )}

      <div className="admin-tabs">
        {(Object.keys(tabNames) as Tab[]).map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => { setTab(t); resetForm() }}>{tabNames[t]}</button>
        ))}
      </div>

      <form className="admin-form" onSubmit={save}>
        {tab === 'products' && <>
          <label className="admin-full">प्रोडक्ट का नाम<input required placeholder="जैसे: Redmi 13, boAt Rockerz 255, JBL स्पीकर, चार्जर" value={form.name || ''} onChange={e => set('name', e.target.value)} /></label>
          <label>ब्रांड (न हो तो खाली छोड़ें)<input value={form.brand || ''} onChange={e => set('brand', e.target.value)} /></label>
          <label>विवरण / स्पेसिफिकेशन<input placeholder="जैसे: 6GB / 128GB, 10000mAh, Neckband" value={form.spec || ''} onChange={e => set('spec', e.target.value)} /></label>
          <label>कीमत (₹)<input required type="number" min="0" inputMode="numeric" value={form.price || ''} onChange={e => set('price', e.target.value)} /></label>
          <label>MRP / पुरानी कीमत (₹) — चाहें तो<input type="number" min="0" inputMode="numeric" placeholder="जैसे: 19999" value={form.mrp || ''} onChange={e => set('mrp', e.target.value)} /></label>
          <label>कैटेगरी<input list="km-cat" placeholder="जैसे: मोबाइल, चार्जर, स्पीकर" value={form.category || ''} onChange={e => set('category', e.target.value)} /></label>
          <label>प्रकार / नेटवर्क<input list="km-net" placeholder="जैसे: 5G, Bluetooth, Wired" value={form.network || ''} onChange={e => set('network', e.target.value)} /></label>
          <label className="admin-full">स्टॉक<select value={form.stock_status || 'स्टॉक में'} onChange={e => set('stock_status', e.target.value)}><option>स्टॉक में</option><option>कम स्टॉक</option></select></label>
          <datalist id="km-cat"><option value="मोबाइल" /><option value="हेडफोन / हेडसेट" /><option value="स्मार्टवॉच" /><option value="स्पीकर" /><option value="चार्जर / केबल" /><option value="पावर बैंक" /><option value="कवर / स्क्रीन गार्ड" /><option value="मेमोरी कार्ड" /><option value="अन्य" /></datalist>
          <datalist id="km-net"><option value="4G" /><option value="5G" /><option value="Bluetooth" /><option value="Wired" /><option value="सामान्य" /></datalist>
          <div className="admin-full admin-imagebox">
            <div className="admin-pickers">
              <button type="button" className="admin-picker-btn" disabled={busy} onClick={() => cameraRef.current?.click()}>📷 कैमरा से फ़ोटो खींचें</button>
              <button type="button" className="admin-picker-btn" disabled={busy} onClick={() => galleryRef.current?.click()}>🖼️ गैलरी से चुनें</button>
            </div>
            <input ref={cameraRef} className="admin-file" type="file" accept="image/*" capture="environment" onChange={upload} tabIndex={-1} />
            <input ref={galleryRef} className="admin-file" type="file" accept="image/*" multiple onChange={upload} tabIndex={-1} />
            <div className="admin-or"><span>या फ़ोटो का लिंक (URL) डालें</span></div>
            <div className="admin-url-row">
              <label>मुख्य फ़ोटो का लिंक<input type="url" inputMode="url" placeholder="https://..." value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} /></label>
              <label>और फ़ोटो के लिंक (कॉमा से अलग)<input placeholder="https://..., https://..." value={form.gallery_urls || ''} onChange={e => set('gallery_urls', e.target.value)} /></label>
            </div>
            {photos.length > 0 && <div className="upload-preview">{photos.map((u, i) => (
              <figure className="upload-item" key={u + i}>
                <img src={u} alt="" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                <button type="button" className="upload-x" onClick={() => removePhoto(i)} aria-label="फ़ोटो हटाएँ">×</button>
                <figcaption>{i === 0 ? 'मुख्य फ़ोटो' : <button type="button" className="upload-main" onClick={() => makeMain(i)}>मुख्य बनाएँ</button>}</figcaption>
              </figure>
            ))}</div>}
          </div>
        </>}
        {tab === 'services' && <>
          <label>सेवा का नाम<input required value={form.title || ''} onChange={e => set('title', e.target.value)} /></label>
          <label>आइकन<select value={form.icon || 'Wrench'} onChange={e => set('icon', e.target.value)}>{iconNames.map(n => <option key={n}>{n}</option>)}</select></label>
          <label className="admin-full">विवरण<input required value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
          <label>क्रम संख्या (छोटी पहले)<input type="number" value={form.sort_order || ''} onChange={e => set('sort_order', e.target.value)} /></label>
        </>}
        {tab === 'offers' && <>
          <label>ऑफर का शीर्षक<input required value={form.title || ''} onChange={e => set('title', e.target.value)} /></label>
          <label>बैज (जैसे: नया)<input value={form.badge || ''} onChange={e => set('badge', e.target.value)} /></label>
          <label className="admin-full">विवरण<input required value={form.description || ''} onChange={e => set('description', e.target.value)} /></label>
        </>}
        {tab === 'reviews' && <>
          <label>ग्राहक का नाम<input required value={form.customer_name || ''} onChange={e => set('customer_name', e.target.value)} /></label>
          <label>जगह<input value={form.location || ''} onChange={e => set('location', e.target.value)} /></label>
          <label className="admin-full">रिव्यू<input required value={form.comment || ''} onChange={e => set('comment', e.target.value)} /></label>
          <label>रेटिंग (1 से 5)<input type="number" min="1" max="5" value={form.rating || ''} onChange={e => set('rating', e.target.value)} /></label>
        </>}
        <div className="admin-actions">
          <button type="submit" disabled={busy}>{editingId ? 'बदलाव सहेजें' : 'जोड़ें और लाइव करें'}</button>
          {editingId && <button type="button" className="admin-cancel" onClick={resetForm}>रद्द करें</button>}
        </div>
      </form>

      <div className="admin-list">
        {rows.length === 0 && <span className="admin-empty-note">अभी यहाँ कुछ नहीं जोड़ा गया है।</span>}
        {rows.map(row => (
          <div key={row.id}>
            <span>{row.name || row.title || row.customer_name}</span>
            <span className="admin-row-actions">
              <button type="button" className="edit-btn" onClick={() => startEdit(row)}>बदलें</button>
              {tab === 'products' && <button type="button" className="edit-btn" onClick={() => copyLink(row.id)}>लिंक कॉपी</button>}
              <button type="button" onClick={() => remove(row)} aria-label="हटाएं"><X size={15} /></button>
            </span>
          </div>
        ))}
      </div>
    </div></div>
  )
}

export default OwnerPanel
