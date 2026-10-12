import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';

export default function ResetPassword(){
 const {user,loading,error}=useAuth();
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const navigate=useNavigate();
 if(loading)return <div className="center" role="status">Checking reset link…</div>;
 if(!user)return <div className="auth card"><h2>Reset link unavailable</h2><p>{error||'Your link may have expired. Request a new one from the login page.'}</p><Link to="/login">Back to login</Link></div>;
 async function submit(e){
  e.preventDefault();if(busy)return;
  if(password!==confirm){setMessage('Passwords do not match.');return;}
  setBusy(true);setMessage('');
  try{
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   const {error:signOutError}=await supabase.auth.signOut();
   if(signOutError){setMessage('Password saved. Logout failed; please try Logout again.');return;}
   navigate('/login',{replace:true,state:{message:'Password updated. Please log in with your new password.'}});
  }catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 return <div className="auth card"><h2>Set a new password</h2><form onSubmit={submit}>
  <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
  <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
  <button className="btn" disabled={busy}>{busy?'Saving…':'Save password'}</button>
 </form>{message&&<p className="notice" role="status">{message}</p>}</div>;
}
