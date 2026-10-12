import {createContext,useContext,useEffect,useState,useCallback,useRef} from 'react';
import {supabase} from '../lib/supabase';
const C=createContext(null);
export const useAuth=()=>useContext(C);
export function AuthProvider({children}) {
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0);
 const loadProfile=useCallback(async(s)=>{
  const ticket=++generation.current;
  setSession(s);setProfile(null);setLoading(true);setError('');
  try {
   if(s?.user){
    const {data,error}=await supabase.from('profiles').select('*').eq('id',s.user.id).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error('Your account profile is missing. Please contact support.');
    if(ticket===generation.current)setProfile(data);
   }
  } catch(e){if(ticket===generation.current)setError(e.message);}
  finally{if(ticket===generation.current)setLoading(false);}
 },[]);
 useEffect(()=>{
  let active=true, eventSeen=false;
  // Defer database calls until the auth callback has released its lock.
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{
   eventSeen=true;
   generation.current++;
   setSession(s);setProfile(null);setLoading(true);
   setTimeout(()=>{if(active)loadProfile(s);},0);
  });
  supabase.auth.getSession().then(({data,error})=>{
   if(!active||eventSeen)return;
   if(error){setError(error.message);setLoading(false);return;}
   loadProfile(data.session);
  }).catch(e=>{if(active&&!eventSeen){setError(e.message);setLoading(false);}});
  return()=>{active=false;generation.current++;subscription.unsubscribe();};
 },[loadProfile]);
 async function signOut(){const {error}=await supabase.auth.signOut();if(error){setError(error.message);return;}await loadProfile(null);}
 return <C.Provider value={{session,user:session?.user,profile,loading,error,refreshProfile:()=>loadProfile(session),signOut}}>{children}</C.Provider>;
}
