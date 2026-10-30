import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';

const QR_BUCKET='psc-payment-qr', PROOF_BUCKET='psc-payment-proofs';
const ALLOWED=['image/png','image/jpeg','image/webp'];

export default function Payment(){
 const [query]=useSearchParams();
 const {user}=useAuth();
 const planId=query.get('plan');
 const [plan,setPlan]=useState(null);
 const [settings,setSettings]=useState(null);
 const [previous,setPrevious]=useState(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [reference,setReference]=useState('');
 const [proof,setProof]=useState(null);
 const [message,setMessage]=useState('');
 const [submitted,setSubmitted]=useState(null);

 useEffect(()=>{
   let active=true;
   setLoading(true);setMessage('');setSubmitted(null);setPrevious(null);
   (async()=>{
     try{
       if(!planId)throw Error('कृपया पहिले सदस्यता योजना छान्नुहोस्।');
       const [p,s,history]=await Promise.all([
         supabase.from('plans').select('id,name,price_npr,duration_days,active').eq('id',planId).eq('active',true).single(),
         supabase.from('payment_qr_settings').select('qr_path,payee_name,instructions,enabled').eq('id',1).maybeSingle(),
         supabase.from('payments').select('id,status,transaction_id,submitted_at,rejection_reason').eq('plan_id',planId).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(1).maybeSingle()
       ]);
       if(p.error)throw p.error;
       if(s.error)throw s.error;
       if(history.error)throw history.error;
       if(active){setPlan(p.data);setSettings(s.data);setPrevious(history.data);}
     }catch(e){if(active)setMessage(e.message);}
     finally{if(active)setLoading(false);}
   })();
   return()=>{active=false;};
 },[planId,user?.id]);

 const ready=Boolean(settings?.enabled&&settings?.qr_path);
 const qrUrl=ready?supabase.storage.from(QR_BUCKET).getPublicUrl(settings.qr_path).data.publicUrl:null;
 const pending=previous?.status==='pending';

 async function submit(e){
   e.preventDefault();
   if(busy||!ready||!plan||pending)return;
   setMessage('');
   const ref=reference.trim().toUpperCase();
   if(!/^[A-Z0-9][A-Z0-9._/-]{5,79}$/.test(ref)){setMessage('६ देखि ८० अक्षरको मान्य Transaction ID लेख्नुहोस्।');return;}
   if(proof&&(!ALLOWED.includes(proof.type)||proof.size>4*1024*1024)){setMessage('Screenshot PNG/JPG/WebP र 4 MB भन्दा सानो हुनुपर्छ।');return;}
   setBusy(true);
   try{
     // Amount and student identity are resolved securely by the database, not this browser.
     const {data:paymentId,error}=await supabase.rpc('submit_manual_payment',{p_plan_id:plan.id,p_transaction_id:ref});
     if(error)throw error;
     setSubmitted(paymentId);
     setPrevious({id:paymentId,status:'pending',transaction_id:ref,submitted_at:new Date().toISOString()});
     setReference('');
     if(proof){
       const ext=proof.type==='image/png'?'png':proof.type==='image/webp'?'webp':'jpg';
       const storagePath=`${user.id}/${paymentId}/proof-${Date.now()}.${ext}`;
       const uploaded=await supabase.storage.from(PROOF_BUCKET).upload(storagePath,proof,{contentType:proof.type,upsert:false});
       if(uploaded.error){setMessage('Payment request सुरक्षित रूपमा दर्ता भयो, तर screenshot upload भएन: '+uploaded.error.message);return;}
       const attached=await supabase.rpc('attach_manual_payment_proof',{p_payment_id:paymentId,p_storage_path:storagePath});
       if(attached.error){setMessage('Payment request दर्ता भयो, तर screenshot जोड्न सकिएन: '+attached.error.message);return;}
     }
     setMessage('Payment verification request दर्ता भयो। Admin ले बैंक/वालेटमा पैसा प्राप्त भएको पुष्टि गरेपछि मात्रै सदस्यता सक्रिय हुन्छ।');
   }catch(e){setMessage('अनुरोध पठाउन सकिएन: '+e.message);}
   finally{setBusy(false);}
 }
 if(loading)return <section className="card payment" role="status">Payment details लोड हुँदैछ…</section>;
 if(!plan)return <section className="card payment" role="alert">{message||'Plan भेटिएन।'} <Link to="/pricing">योजना छान्नुहोस्</Link></section>;

 return <section className="card payment qr-checkout" style={{maxWidth:690}}>
   <p className="eyebrow">SECURE WEBSITE CHECKOUT • NPR</p>
   <h1>{plan.name} सदस्यता</h1>
   <p className="price">रु. {Number(plan.price_npr).toLocaleString('en-IN')} <small>/ {plan.duration_days} दिन</small></p>
   <p>अहिले Website मार्फत QR रकम भुक्तानी र Admin verification उपलब्ध छ। भुक्तानी पठाउनेबित्तिकै access खुल्दैन।</p>
   {pending||submitted?<div className="notice" role="status">
     <strong>Payment review मा छ।</strong> Transaction: {previous?.transaction_id||'—'}. पुष्टि भएपछि योजना सक्रिय हुनेछ। <Link to="/dashboard">Dashboard मा जानुहोस्</Link>
   </div>:null}
   {previous?.status==='rejected'&&<p className="notice">पछिल्लो request अस्वीकार भयो: {previous.rejection_reason||'Admin verification unsuccessful'}। सही भुक्तानी विवरण भए पुनः request गर्न सक्नुहुन्छ।</p>}
   {!ready?<div className="notice" role="alert"><strong>QR Payment अहिले बन्द छ।</strong> Admin ले आधिकारिक QR upload गरी Enable गरेपछि यहाँ देखिन्छ। अहिले रकम नपठाउनुहोस्।</div>
   :<div className="qr-payment-panel" style={{display:'grid',gap:16,justifyItems:'center',margin:'20px auto',padding:20,border:'1px solid #e3e8e2',borderRadius:16,maxWidth:425}}>
      <h2 style={{margin:0}}>QR Scan गरेर रकम पठाउनुहोस्</h2>
      <img src={qrUrl} alt={settings.payee_name+' को आधिकारिक Payment QR'} style={{width:'100%',maxWidth:300,height:'auto',objectFit:'contain'}}/>
      <p style={{margin:0,textAlign:'center'}}><strong>Payee:</strong> {settings.payee_name}</p>
      <p style={{margin:0,textAlign:'center'}}>{settings.instructions}</p>
      <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="btn ghost">QR खोल्नुहोस् / Save गर्नुहोस्</a>
      <small style={{textAlign:'center'}}>मोबाइलमा एउटै फोनबाट QR scan गर्न नमिले QR save गरी wallet/banking app को Scan from Gallery विकल्प प्रयोग गर्नुहोस् (उपलब्ध भएमा)।</small>
      <p className="notice" style={{margin:0}}>भुक्तानी गर्नुअघि QR मा देखिएको प्राप्तकर्ताको नाम मिलेको पुष्टि गर्नुहोस्। बैंकिङ एपमा वास्तविक रकम रु. {Number(plan.price_npr).toLocaleString('en-IN')} राख्नुहोस्।</p>
    </div>}
   {ready&&!pending&&!submitted&&<form onSubmit={submit} style={{display:'grid',gap:12}}>
     <h2>Payment को विवरण पठाउनुहोस्</h2>
     <label>Transaction ID / Reference Number
      <input autoComplete="off" value={reference} onChange={e=>setReference(e.target.value)} placeholder="उदाहरण: TXN12345678" maxLength={80} required/>
     </label>
     <label>Payment Screenshot (optional)
       <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/>
     </label>
     <small>Screenshot भए verification गर्न सजिलो हुन्छ। Max 4 MB। Transaction ID भुक्तानी पुष्टि गर्न चाहिन्छ।</small>
     <button type="submit" className="btn" disabled={busy}>{busy?'Request दर्ता हुँदैछ…':'Payment Verification Request पठाउनुहोस्'}</button>
   </form>}
   {message&&<p className="notice" role="status">{message}</p>}
   <p><Link to="/pricing">← अन्य योजना हेर्नुहोस्</Link></p>
 </section>;
}
