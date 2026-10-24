import {useState} from 'react';
import {supabase} from '../lib/supabase';
import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {Eye,EyeOff,GraduationCap} from 'lucide-react';
export default function Login(){
 const [mode,setMode]=useState('login'),[f,setF]=useState({name:'',email:'',password:''}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[showPassword,setShowPassword]=useState(false);
 const {user,loading}=useAuth();const location=useLocation();
 const from=location.state?.from;const destination=typeof from==='string'&&from.startsWith('/')&&!from.startsWith('//')&&!from.startsWith('/login')?from:'/dashboard';
 if(user&&!loading)return <Navigate to={destination} replace/>;
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setMsg('');
  try{
   if(mode==='forgot'){
    const {error}=await supabase.auth.resetPasswordForEmail(f.email.trim(),{redirectTo:'https://psctaiyari.com'+'/reset-password'});
    if(error)throw error;
    setMsg('यदि खाता छ भने password reset link इमेलमा आउँछ। यो link वेबसाइटमा खुल्छ; नयाँ password राखेपछि एपमा फर्केर लगइन गर्नुहोस्।');
    return;
   }
   const result=mode==='register'?await supabase.auth.signUp({email:f.email.trim(),password:f.password,options:{data:{full_name:f.name.trim()},emailRedirectTo:'https://psctaiyari.com'+'/login'}}):await supabase.auth.signInWithPassword({email:f.email.trim(),password:f.password});
   if(result.error)throw result.error;
   if(mode==='register'&&!result.data.session)setMsg('इमेलको verification link वेबसाइटमा खोलेर पुष्टि गर्नुहोस्। त्यसपछि एपमा फर्केर लगइन गर्नुहोस्।');
  }catch(e){setMsg(e.message);}finally{setBusy(false);}
 }
 return <main className="android-auth-screen"><section className="android-auth-card" aria-label="PSC Taiyari login">
  <div className="android-auth-brand"><span><GraduationCap size={25}/></span><div><b>PSC Taiyari</b><small>BY NEXTLAYERS</small></div></div>
  <div className="android-auth-intro"><h1>{mode==='login'?'लोकसेवा तयारी सुरु गरौँ':mode==='forgot'?'पासवर्ड नयाँ बनाउनुहोस्':'नयाँ खाता बनाउनुहोस्'}</h1><p>{mode==='login'?'आफ्नो पढाइ, अभ्यास र प्रगति एकै ठाउँमा राख्नुहोस्।':mode==='forgot'?'दर्ता भएको इमेलमा सुरक्षित reset link पठाइन्छ।':'निःशुल्क खाता बनाएर पढाइ सुरु गर्नुहोस्।'}</p></div>
  <form onSubmit={submit}>{mode==='register'&&<label>पूरा नाम<input autoComplete="name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/></label>}<label>इमेल<input autoComplete="email" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required/></label>{mode!=='forgot'&&<label>पासवर्ड<span className="password-field"><input autoComplete={mode==='login'?'current-password':'new-password'} type={showPassword?'text':'password'} minLength={mode==='register'?8:1} value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/><button type="button" className="password-toggle" aria-label={showPassword?'पासवर्ड लुकाउनुहोस्':'पासवर्ड देखाउनुहोस्'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={20}/>:<Eye size={20}/>}</button></span></label>}<button className="btn android-login-submit" disabled={busy}>{busy?'कृपया प्रतीक्षा गर्नुहोस्…':mode==='login'?'Login गर्नुहोस्':mode==='forgot'?'Reset link पठाउनुहोस्':'खाता बनाउनुहोस्'}</button></form>{(msg||location.state?.message)&&<p className="notice" role="status">{msg||location.state.message}</p>}<div className="android-auth-actions"><button className="textbtn" disabled={busy} onClick={()=>{setMode(mode==='login'?'register':'login');setMsg('');setShowPassword(false);}}>{mode==='login'?'नयाँ प्रयोगकर्ता? खाता बनाउनुहोस्':'पहिले नै खाता छ? Login गर्नुहोस्'}</button>{mode==='login'&&<button className="textbtn" disabled={busy} onClick={()=>{setMode('forgot');setMsg('');}}>पासवर्ड बिर्सनुभयो?</button>}</div>
 </section></main>;
}
