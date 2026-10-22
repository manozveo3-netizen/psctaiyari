import {useState} from 'react';
import {supabase} from '../lib/supabase';
import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
export default function Login(){
 const [mode,setMode]=useState('login'),[f,setF]=useState({name:'',email:'',password:''}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
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
 return <div className="auth card"><h2>{mode==='login'?'Welcome back':mode==='forgot'?'Reset your password':'Create account'}</h2><form onSubmit={submit}>{mode==='register'&&<label>Full name<input autoComplete="name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} required/></label>}<label>Email<input autoComplete="email" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required/></label>{mode!=='forgot'&&<label>Password<input autoComplete={mode==='login'?'current-password':'new-password'} type="password" minLength={mode==='register'?8:1} value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></label>}<button className="btn" disabled={busy}>{busy?'Please wait…':mode==='login'?'Login':mode==='forgot'?'Send reset link':'Register'}</button></form>{(msg||location.state?.message)&&<p className="notice" role="status">{msg||location.state.message}</p>}<button className="textbtn" disabled={busy} onClick={()=>{setMode(mode==='login'?'register':'login');setMsg('');}}>{mode==='login'?'New user? Register':'Already registered? Login'}</button>{mode==='login'&&<button className="textbtn" disabled={busy} onClick={()=>{setMode('forgot');setMsg('');}}>Forgot password?</button>}</div>;
}
