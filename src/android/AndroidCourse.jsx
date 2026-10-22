import {useEffect,useState} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import Course from '../pages/Course';
import DirectBuyButton,{isDirectApk} from './DirectBuyButton';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';

export default function AndroidCourse(){
 const {id}=useParams(),location=useLocation(),{user}=useAuth();
 const [course,setCourse]=useState(null);
 const [preview,setPreview]=useState([]);
 const [previewLoading,setPreviewLoading]=useState(true);
 const [eligible,setEligible]=useState(false);
 useEffect(()=>{
   let alive=true;
   setCourse(null);setPreview([]);setPreviewLoading(true);
   (async()=>{
     try{
       const {data,error}=await supabase.from('courses')
         .select('id,title_ne,is_free,status').eq('id',id).eq('status','published').single();
       if(error)throw error;
       let hasAccess=false;
       let demos=[];
       if(user){
         const r=await supabase.from('course_enrollments').select('status,expires_at').eq('course_id',id).eq('user_id',user.id);
         if(r.error)throw r.error;
         hasAccess=(r.data||[]).some(e=>e.status!=='cancelled'&&(!e.expires_at||new Date(e.expires_at)>new Date()));
         const units=await supabase.from('course_units').select('id').eq('course_id',id).eq('status','published');
         if(units.error)throw units.error;
         if(units.data?.length){
           const l=await supabase.from('lessons')
             .select('id,title_ne,estimated_minutes').in('unit_id',units.data.map(u=>u.id))
             .eq('status','published').eq('is_preview',true).order('sort_order');
           if(l.error)throw l.error;
           demos=l.data||[];
         }
       }
       if(alive){setCourse(data);setEligible(!data.is_free&&!hasAccess);setPreview(demos);}
     }catch(err){if(alive){setCourse(null);setEligible(false);}}
     finally{if(alive)setPreviewLoading(false);}
   })();
   return()=>{alive=false;};
 },[id,user?.id]);
 return <>
   {course&&!course.is_free&&<section className="card" style={{marginBottom:18}}>
     <p className="eyebrow">FREE PREVIEW · अध्ययन सुरु गर्नुहोस्</p>
     <h2>निःशुल्क डेमो पाठ</h2>
     {!user?<p>डेमो पाठ हेर्न नि:शुल्क Account बाट Login गर्नुहोस्।
       {' '}<Link to="/login" state={{from:location.pathname}}>Login / Register →</Link>
     </p>:previewLoading?<p role="status">डेमो पाठ खोज्दैछ…</p>
     :preview.length?<div>
       <p>यी पाठहरू सदस्यता बिना अध्ययन गर्न सक्नुहुन्छ:</p>
       {preview.map(p=><p key={p.id}><Link className="btn ghost" to={`/lessons/${p.id}`}>▶ {p.title_ne}{p.estimated_minutes?` · ${p.estimated_minutes} मिनेट`:''}</Link></p>)}
     </div>:<p>यस कोर्सको डेमो पाठ अझै प्रकाशित भएको छैन। अहिले तल कोर्सको विवरण र उपलब्ध एकाइहरू हेर्न सक्नुहुन्छ।</p>}
     {eligible&&<div className="notice" style={{marginTop:16}}>
       <strong>पूर्ण अध्ययनका लागि सदस्यता आवश्यक छ।</strong>
       <p style={{margin:'8px 0 0'}}>सदस्यता PSC Taiyari को वेबसाइटमा उपलब्ध छ। पहिले नै सदस्यता सक्रिय भए यही Account प्रयोग गरेर पढ्न सक्नुहुन्छ।</p>
       <p style={{margin:'6px 0 0'}}><small>आधिकारिक वेबसाइट: psctaiyari.com (App भित्र खरिद लिंक छैन)</small></p>
     </div>}
     {isDirectApk&&eligible&&<p style={{marginBottom:0}}><DirectBuyButton course={course}/></p>}
   </section>}
   <Course/>
 </>;
}
