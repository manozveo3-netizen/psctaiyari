import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';

// Consumption-only: no external digital checkout links or in-app QR payment.
export default function AccessStatus(){
 const {user}=useAuth();
 const [state,setState]=useState({loading:true,subscription:null,error:''});
 useEffect(()=>{
   let active=true;
   if(!user){setState({loading:false,subscription:null,error:''});return;}
   setState({loading:true,subscription:null,error:''});
   supabase.from('subscriptions')
     .select('expires_at,plans(name)').eq('user_id',user.id).eq('status','active')
     .gt('expires_at',new Date().toISOString()).order('expires_at',{ascending:false}).limit(1).maybeSingle()
     .then(({data,error})=>{if(active)setState({loading:false,subscription:data,error:error?.message||''});})
     .catch(e=>{if(active)setState({loading:false,subscription:null,error:e.message});});
   return()=>{active=false;};
 },[user?.id]);
 return <section className="card" style={{maxWidth:760,margin:'24px auto',padding:24}}>
   <p className="eyebrow">MY COURSE ACCESS</p>
   <h1>मेरो सदस्यता</h1>
   <p>यो App अध्ययनका लागि हो। नयाँ डिजिटल सदस्यता App भित्र खरिद गर्ने सुविधा छैन।</p>
   {!user?<p>सदस्यता जाँच्न <Link to="/login">Login</Link> गर्नुहोस्।</p>
   :state.loading?<p role="status">सदस्यता जाँच हुँदैछ…</p>
   :state.error?<p role="alert">सदस्यता जाँच्न सकिएन: {state.error}</p>
   :state.subscription?<p className="notice">
      <strong>सक्रिय सदस्यता: {state.subscription.plans?.name||'Existing plan'}</strong><br/>
      समाप्ति: {new Date(state.subscription.expires_at).toLocaleDateString()}
     </p>
   :<p className="notice">अहिले सक्रिय सदस्यता भेटिएन। निःशुल्क पाठ्यक्रम विवरण र उपलब्ध डेमो हेर्नुहोस्।</p>}
   <div style={{padding:'14px 0'}}>
     <h2>सदस्यता सम्बन्धी जानकारी</h2>
     <p>PSC Taiyari को आधिकारिक वेबसाइटमा सदस्यता उपलब्ध छ। त्यहाँ पहिले नै सक्रिय गरिएको सदस्यता App मा पनि यही Login Account बाट प्रयोग गर्न सकिन्छ।</p>
     <p><strong>वेबसाइट: psctaiyari.com</strong></p>
     <small>Google Play Android version बाट वेबसाइटमा जाने खरीद वा भुक्तानी गर्ने link उपलब्ध गराइएको छैन।</small>
   </div>
   <Link className="btn" to="/courses">पाठ्यक्रम तथा निःशुल्क डेमो हेर्नुहोस् →</Link>
 </section>;
}
