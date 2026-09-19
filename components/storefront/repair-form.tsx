'use client'

import { FormEvent, useState } from 'react'
import { Check, MessageCircle } from 'lucide-react'
import { whatsappLink } from '@/lib/supabase'

export function RepairForm() {
  const [sent, setSent] = useState(false)

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const d = new FormData(e.currentTarget)
    setSent(true)
    window.open(whatsappLink(`नमस्ते Kamal Mobile, मुझे रिपेयर बुक करनी है।\nनाम: ${d.get('name')}\nफोन: ${d.get('phone')}\nमोबाइल मॉडल: ${d.get('model')}\nसमस्या: ${d.get('issue')}\nपसंदीदा समय: ${d.get('time')}`), '_blank', 'noopener,noreferrer')
  }

  return (
    <form className="repair-form" onSubmit={submit}>
      {sent && <div className="sent-note"><Check size={17} /> WhatsApp संदेश तैयार है।</div>}
      <div className="form-row">
        <label>आपका नाम<input required name="name" placeholder="पूरा नाम" /></label>
        <label>फोन नंबर<input required name="phone" type="tel" placeholder="10 अंकों का नंबर" /></label>
      </div>
      <div className="form-row">
        <label>मोबाइल मॉडल<input required name="model" placeholder="जैसे: Redmi Note 12" /></label>
        <label>समस्या का प्रकार<select name="issue"><option>स्क्रीन / डिस्प्ले</option><option>बैटरी / चार्जिंग</option><option>सॉफ्टवेयर / हैंग</option><option>पानी से खराब</option><option>अन्य समस्या</option></select></label>
      </div>
      <label>आप कब आना चाहेंगे?<select name="time"><option>सुबह 9:00 - 12:00</option><option>दोपहर 12:00 - 4:00</option><option>शाम 4:00 - रात 8:00</option></select></label>
      <button className="button form-button" type="submit"><MessageCircle size={18} /> WhatsApp पर बुक करें</button>
    </form>
  )
}

export default RepairForm
