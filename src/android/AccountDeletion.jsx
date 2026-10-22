import {useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
const SUPPORT='nextlayerstech@gmail.com';
const SITE='https://psctaiyari.com/delete-account';
export default function AccountDeletion(){
 const {user,profile}=useAuth();const [confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const email=user?.email||'';const isStudent=profile?.role==='student';
 const subject='PSC Taiyari Account Deletion Request';
 const mail='mailto:'+SUPPORT+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent('Please delete my PSC Taiyari account and eligible related personal data.\nRegistered email: '+email+'\nPlease let me know the verification steps and any legally retained records.');
 async function request(e){
   e.preventDefault();if(!user||!isStudent||confirm!=='DELETE'||busy)return;
   setBusy(true);setMessage('');
   try{const {data,error}=await supabase.functions.invoke('request-account-deletion',{body:{}});
     if(error)throw error;
     if(!data?.ok)throw Error(data?.error||'Request not recorded');
     setMessage('अनुरोध दर्ता भयो। प्रशासकले पहिचान पुष्टि र समीक्षा गरेपछि मात्र वास्तविक deletion हुन्छ।');setConfirm('');
   }catch(e){setMessage('अनलाइन अनुरोध असफल भयो: '+(e?.message||'Service unavailable')+'. तलको इमेल विकल्प प्रयोग गर्नुहोस्।');}
   finally{setBusy(false);}
 }
 return <section className="card" style={{maxWidth:740,margin:'24px auto',padding:24}}>
  <h1>खाता हटाउने अनुरोध / Account deletion</h1>
  <p>PSC Taiyari account र सम्बन्धित व्यक्तिगत जानकारी हटाउन अनुरोध गर्न सक्नुहुन्छ। खाता तुरुन्त हट्दैन। Verification र समीक्षा पछि व्यक्तिगत विवरण मेटाइन्छ; कानुनी रूपमा आवश्यक billing/security अभिलेख सीमित रूपमा राखिन सक्छन्।</p>
  {user&&isStudent&&<form onSubmit={request}>
    <label>पुष्टि गर्न <strong>DELETE</strong> लेख्नुहोस्<input value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></label>
    <button type="submit" className="btn" disabled={busy||confirm!=='DELETE'}>{busy?'पठाउँदै…':'Account deletion request पठाउनुहोस्'}</button>
  </form>}
  {!user&&<p>लगइन नगरे पनि तलको सार्वजनिक वेबसाइट वा आफ्नो registered email बाट अनुरोध गर्न सक्नुहुन्छ।</p>}
  {user&&!isStudent&&<p className="notice">Staff accounts को अनुरोधका लागि support email प्रयोग गर्नुहोस्।</p>}
  {message&&<p className="notice" role="status">{message}</p>}
  <hr/>
  <h2>इमेलबाट अनुरोध</h2>
  <p>आफ्नो registered email बाट <strong>{SUPPORT}</strong> मा विषय <strong>{subject}</strong> राखेर इमेल पठाउनुहोस्। Password वा OTP नपठाउनुहोस्।</p>
  <p><a href={mail}>Email app मा अनुरोध तयार गर्नुहोस्</a></p>
  <p>Mail app नखुलेमा माथिको email ठेगाना र विषय manual रूपमा प्रयोग गर्नुहोस्। Email composer खुल्नुले इमेल पठाइएको प्रमाणित गर्दैन।</p>
  <p><a href={SITE} target="_blank" rel="noopener noreferrer">सार्वजनिक Account Deletion वेबसाइट</a></p>
  <p><Link to="/privacy-policy">Privacy Policy</Link> · <Link to="/data-retention">Data Retention</Link></p>
 </section>;
}
