import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
// Android does not sell digital subscriptions until Play Billing and server verification are integrated.
export default function AccessStatus(){
 const {user}=useAuth();const [state,setState]=useState({loading:true,subscription:null,error:''});
 useEffect(()=>{let active=true;if(!user){setState({loading:false,subscription:null,error:''});return;}
 supabase.from('subscriptions').select('expires_at,plans(name)').eq('user_id',user.id).eq('status','active').gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}).limit(1).maybeSingle()
 .then(({data,error})=>{if(active)setState({loading:false,subscription:data,error:error?.message||''})})
 .catch(e=>{if(active)setState({loading:false,subscription:null,error:e.message})});return()=>{active=false};},[user]);
 return <section className="card" style={{maxWidth:720,margin:'24px auto',padding:24}}>
 <h1>मेरो सदस्यता / Course access</h1>
 <p>यो Android एपमा अहिले नयाँ सदस्यता खरिद गर्ने सुविधा उपलब्ध छैन। उपलब्ध निःशुल्क सामग्री र पहिले नै सक्रिय सदस्यता प्रयोग गर्न सक्नुहुन्छ।</p>
 {!user?<p>सदस्यता हेर्न <Link to="/login">Login</Link> गर्नुहोस्।</p>
 :state.loading?<p role="status">सदस्यता जाँच हुँदैछ…</p>
 :state.error?<p role="alert">सदस्यता हेर्न सकिएन: {state.error}</p>
 :state.subscription?<p className="notice">सक्रिय: {state.subscription.plans?.name||'Existing plan'} (समाप्ति: {new Date(state.subscription.expires_at).toLocaleDateString()})</p>
 :<p className="notice">सक्रिय सदस्यता छैन। निःशुल्क सामग्री र अभ्यास हेर्नुहोस्।</p>}
 <p><Link className="btn" to="/courses">पाठ्यक्रम हेर्नुहोस्</Link></p>
 </section>;
}
