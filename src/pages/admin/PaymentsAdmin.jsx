import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';

export default function PaymentsAdmin(){
 const {profile}=useAuth();
 const [payments,setPayments]=useState([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [proofUrl,setProofUrl]=useState(null);
 const [proofId,setProofId]=useState(null);
 async function load(){
   const {data,error}=await supabase.from('payments')
     .select('id,user_id,plan_id,amount_npr,status,transaction_id,screenshot_path,submitted_at,rejection_reason,plans(name,duration_days)')
     .order('submitted_at',{ascending:false}).limit(300);
   if(error)setMessage(error.message);else setPayments(data||[]);
 }
 useEffect(()=>{load();},[]);
 async function showProof(row){
   setMessage('');setProofUrl(null);setProofId(null);
   const {data,error}=await supabase.storage.from('psc-payment-proofs').createSignedUrl(row.screenshot_path,60);
   if(error)setMessage('Screenshot खोल्न सकिएन: '+error.message);
   else{setProofUrl(data.signedUrl);setProofId(row.id);}
 }
 async function process(row,action){
   if(busy||profile?.role!=='admin')return;
   const reason=action==='reject'?window.prompt('Payment reject गर्ने कारण?'):null;
   if(action==='reject'&&!reason?.trim())return;
   if(action==='approve'&&!window.confirm('Bank/wallet statement मा रु. '+row.amount_npr+' र Tx ID '+row.transaction_id+' प्राप्त भएको VERIFY गर्नुभयो?'))return;
   setBusy(true);setMessage('');
   try{
     const {error}=action==='approve'?await supabase.rpc('approve_payment',{p_payment_id:row.id})
       :await supabase.rpc('reject_payment',{p_payment_id:row.id,p_reason:reason.trim()});
     if(error)throw error;
     setMessage(action==='approve'?'Payment verified and subscription activated.':'Payment rejected.');
     await load();
   }catch(e){setMessage(e.message);}
   finally{setBusy(false);}
 }
 return <section className="card">
   <h2>Payment Verification</h2>
   <p>पहिले बैंक/वालेटको वास्तविक incoming transaction र amount verify गर्नुहोस्। Screenshot वा Transaction ID मात्रै पर्याप्त छैन।</p>
   <button type="button" onClick={load} disabled={busy}>Refresh Payments</button>
   {message&&<p className="notice" role="status">{message}</p>}
   <div style={{overflowX:'auto'}}><table>
     <thead><tr><th>Student ID</th><th>Plan</th><th>Amount</th><th>Transaction ID</th><th>Status</th><th>Proof</th><th>Action</th></tr></thead>
     <tbody>{payments.map(p=><tr key={p.id}>
       <td><small>{p.user_id}</small></td>
       <td>{p.plans?.name||p.plan_id}</td><td>रु. {p.amount_npr}</td>
       <td><strong>{p.transaction_id||'—'}</strong><small>{new Date(p.submitted_at).toLocaleString()}</small></td>
       <td>{p.status}{p.rejection_reason&&<small>{p.rejection_reason}</small>}</td>
       <td>{p.screenshot_path?<button type="button" onClick={()=>showProof(p)}>View screenshot</button>:'—'}</td>
       <td>{p.status==='pending'&&profile?.role==='admin'?<>
         <button type="button" className="success" disabled={busy} onClick={()=>process(p,'approve')}>Verify & Approve</button>{' '}
         <button type="button" className="danger" disabled={busy} onClick={()=>process(p,'reject')}>Reject</button>
       </>:null}</td>
     </tr>)}</tbody>
   </table></div>
   {!payments.length&&<p>अहिले कुनै payment request छैन।</p>}
   {proofUrl&&<div style={{maxWidth:460,marginTop:20}}>
     <h3>Payment Screenshot</h3><img src={proofUrl} alt={'Payment evidence for '+proofId} style={{maxWidth:'100%',height:'auto'}}/>
     <p><small>Private signed preview एक मिनेटपछि expire हुन्छ।</small></p>
   </div>}
 </section>;
}
