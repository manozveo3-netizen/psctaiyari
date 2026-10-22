import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';

const BUCKET='psc-payment-qr';
const TYPES=['image/png','image/jpeg','image/webp'];
export default function PaymentQRSettings(){
 const [settings,setSettings]=useState(null);
 const [file,setFile]=useState(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);
 async function load(){
   setLoading(true);
   const {data,error}=await supabase.from('payment_qr_settings').select('*').eq('id',1).single();
   setLoading(false);
   if(error)setMessage('QR settings हेर्न सकिएन: '+error.message);
   else setSettings(data);
 }
 useEffect(()=>{load()},[]);
 async function save(e){
   e.preventDefault();if(!settings||busy)return;
   setBusy(true);setMessage('');
   try{
     let path=settings.qr_path;
     if(file){
       if(!TYPES.includes(file.type)||file.size>2*1024*1024)throw Error('PNG, JPG वा WebP (अधिकतम 2 MB) मात्र अपलोड गर्नुहोस्।');
       const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
       const upload=await supabase.storage.from(BUCKET).upload(`qr-${Date.now()}.${ext}`,file,{contentType:file.type,upsert:false});
       if(upload.error)throw upload.error;
       path=upload.data.path;
     }
     if(settings.enabled&&!path)throw Error('Enable गर्नु अघि QR image upload गर्नुहोस्।');
     const {data:{user}}=await supabase.auth.getUser();
     const {error}=await supabase.from('payment_qr_settings').update({
       qr_path:path,enabled:settings.enabled,
       payee_name:settings.payee_name.trim(),
       instructions:settings.instructions.trim(),
       updated_at:new Date().toISOString(),updated_by:user?.id||null
     }).eq('id',1);
     if(error)throw error;
     setFile(null);setMessage('Payment QR settings सुरक्षित गरियो। Website मा यसै अनुसार QR देखिन्छ।');await load();
   }catch(e){setMessage('Settings save असफल: '+e.message);}
   finally{setBusy(false);}
 }
 if(loading)return <section className="card" role="status">QR settings loading…</section>;
 if(!settings)return <section className="card" role="alert">{message||'Settings भेटिएन।'}</section>;
 const url=settings.qr_path?supabase.storage.from(BUCKET).getPublicUrl(settings.qr_path).data.publicUrl:null;
 return <section className="card" style={{maxWidth:780}}>
   <h2>Website Payment QR Settings</h2>
   <p>विद्यार्थीले वेबसाइटमा देख्ने आधिकारिक QR यहाँ upload गर्नुहोस्। Digital courses को यो QR checkout Google Play Android app मा देखाइएको छैन।</p>
   <form onSubmit={save} style={{display:'grid',gap:14}}>
     <label>QR Image (PNG, JPG, WebP; अधिकतम 2 MB)
       <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/>
     </label>
     {url&&<img src={url} alt="हालको website payment QR" style={{maxWidth:260,width:'100%',borderRadius:10,border:'1px solid #ddd'}}/>}
     <label>Payee / Account Name
       <input maxLength={120} required value={settings.payee_name} onChange={e=>setSettings({...settings,payee_name:e.target.value})}/>
     </label>
     <label>Payment Instructions
       <textarea maxLength={500} value={settings.instructions} onChange={e=>setSettings({...settings,instructions:e.target.value})}/>
     </label>
     <label style={{display:'flex',alignItems:'center',gap:10}}>
       <input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/>
       QR Payment Enable (विद्यार्थीलाई QR देखाउने)
     </label>
     <button className="btn" type="submit" disabled={busy}>{busy?'Saving…':'Save QR Settings'}</button>
   </form>
   {message&&<p className="notice" role="status">{message}</p>}
   <p><small>पहिले बैंक/वालेटमा QR सक्रिय छ भनेर परीक्षण गर्नुहोस्। Transaction ID को आधारमा मात्र स्वतः पैसा received मानिँदैन। Admin ले payment statement verify गरेर Approve गर्नुपर्छ।</small></p>
 </section>;
}
