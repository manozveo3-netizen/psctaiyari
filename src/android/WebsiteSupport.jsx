import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Globe,Mail,ExternalLink} from 'lucide-react';

// Dedicated support-only HTML document. It has no links or navigation to pricing.
const SUPPORT_URL='https://psctaiyari.com/app-support.html';
export default function WebsiteSupport(){
 const [error,setError]=useState('');
 async function openSupport(){
   setError('');
   try{
     const {Browser}=await import('@capacitor/browser');
     await Browser.open({url:SUPPORT_URL});
   }catch(e){setError('वेबसाइट पेज खोल्न सकिएन। तलको इमेलमा सम्पर्क गर्नुहोस्।');}
 }
 return <section className="card" style={{maxWidth:760,margin:'24px auto',padding:24}}>
   <p className="eyebrow">PSC TAIYARI · NEXTLAYERS</p>
   <h1>Website & सहायता</h1>
   <p>हाम्रो आधिकारिक वेबसाइट <strong>psctaiyari.com</strong> हो। तलको link केवल प्राविधिक सहायता, Login तथा खाता सम्बन्धी सम्पर्कका लागि बनाइएको अलग पृष्ठमा जान्छ।</p>
   <button type="button" className="btn ghost" onClick={openSupport}><Globe size={17}/> वेबसाइट सहायता पेज <ExternalLink size={15}/></button>
   {error&&<p className="notice" role="alert">{error}</p>}
   <p><Mail size={16} style={{verticalAlign:'middle'}}/> Email: <a href="mailto:nextlayerstech@gmail.com">nextlayerstech@gmail.com</a></p>
   <p>पहिले सक्रिय भएको सदस्यता नदेखिए <Link to="/pricing">मेरो सदस्यता</Link> जाँच गर्नुहोस्।</p>
   <p><small>यो वेबसाइट सहायता लिंकले डिजिटल खरिद वा QR भुक्तानी गर्ने पृष्ठ खोल्दैन।</small></p>
 </section>;
}
