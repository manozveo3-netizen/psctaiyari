import {useCallback,useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';

export default function AccountDeletions(){
 const [items,setItems]=useState([]),[loaded,setLoaded]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[notes,setNotes]=useState({});
 const invoke=async(body)=>{const {data,error}=await supabase.functions.invoke('admin-account-deletions',{body});if(error){let details=null;try{details=await error.context?.json()}catch{}throw new Error(details?.error||error.message)}if(data?.error)throw Error(data.error);return data};
 const load=useCallback(async()=>{setError('');setLoading(true);try{const data=await invoke({action:'list'});setItems(data.requests||[]);setLoaded(true)}catch(e){setLoaded(false);setError(e.message)}finally{setLoading(false)}},[]);
 useEffect(()=>{load()},[load]);
 async function act(item,action){
  const note=notes[item.id]||'';
  if(action==='reject'&&!note.trim()){setError('Reject गर्न कारण लेख्नुहोस्।');return}
  let confirm;
  if(action==='delete'){
   if(!window.confirm('यो कार्यले प्रयोगकर्ताको खाता स्थायी रूपमा हटाउन सक्छ। अगाडि बढ्ने?'))return;
   confirm=window.prompt('पुष्टि गर्न यो User ID पूरा टाइप गर्नुहोस्: '+item.user_id);
   if(confirm!==item.user_id){setError('User ID मिलेन। खाता हटाइएको छैन।');return}
  }
  setBusy(item.id);setError('');setMessage('');
  try{const result=await invoke({action,request_id:item.id,note,confirm});setMessage(action==='delete'?(result.audit_saved?'Account deletion completed and audit saved.':'Account deletion completed, तर audit save भएन। तुरुन्त जाँच गर्नुहोस्।'):'Request updated.');await load()}
  catch(e){setError(e.message)}finally{setBusy('')}
 }
 return <section className="card" style={{padding:20}}>
  <div className="pagehead"><div><h2>Account Deletion Requests</h2><p>Review user requests before irreversible deletion.</p></div><button className="btn" onClick={load} disabled={loading}>{loading?"Loading…":"Refresh"}</button></div>
  {error&&<p role="alert" className="notice">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
  {loading?<p role="status">अनुरोधहरू लोड हुँदैछन्…</p>:error?<p role="status">अनुरोध लोड हुन सकेन। Refresh गर्नुहोस्।</p>:loaded&&!items.length?<p>हाल कुनै deletion request छैन।</p>:items.map(item=><article key={item.id} className="card" style={{padding:16,marginBottom:12}}>
   <p><strong>{item.full_name||'User'}</strong> · <strong>{item.status}</strong></p>
   <p style={{overflowWrap:'anywhere'}}>User ID: <code>{item.user_id}</code></p>
   <p>Requested: {new Date(item.requested_at).toLocaleString()}</p>
   {item.review_note&&<p>Previous note: {item.review_note}</p>}
   {['pending','in_review'].includes(item.status)&&<>
    <label>Review note<textarea rows={2} style={{display:'block',width:'100%'}} value={notes[item.id]||''} onChange={e=>setNotes(s=>({...s,[item.id]:e.target.value}))}/></label>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
     {item.status==='pending'&&<button className="btn" disabled={!!busy} onClick={()=>act(item,'review')}>Mark In Review</button>}
     <button className="btn" disabled={!!busy} onClick={()=>act(item,'reject')}>Reject</button>
     {item.status==='in_review'&&<button className="btn" disabled={!!busy} onClick={()=>act(item,'delete')}>Approve & Delete Account</button>}
    </div>
   </>}
  </article>)}
 </section>
}
