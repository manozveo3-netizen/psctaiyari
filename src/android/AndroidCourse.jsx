import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import Course from '../pages/Course';
import DirectBuyButton from './DirectBuyButton';
import {isDirectApk} from './DirectBuyButton';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';

export default function AndroidCourse(){
 const {id}=useParams(),{user}=useAuth();
 const [course,setCourse]=useState(null),[eligible,setEligible]=useState(false);
 useEffect(()=>{
   let active=true;
   if(!isDirectApk)return;
   (async()=>{
     try{
       const {data,error}=await supabase.from('courses').select('id,title_ne,is_free,status').eq('id',id).eq('status','published').single();
       if(error)throw error;
       let hasAccess=false;
       if(user){
         const r=await supabase.from('course_enrollments').select('status,expires_at').eq('course_id',id).eq('user_id',user.id);
         if(r.error)throw r.error;
         hasAccess=(r.data||[]).some(e=>e.status!=='cancelled'&&(!e.expires_at||new Date(e.expires_at)>new Date()));
       }
       if(active){setCourse(data);setEligible(!data.is_free&&!hasAccess);}
     }catch(error){if(active){setCourse(null);setEligible(false);}}
   })();
   return()=>{active=false;};
 },[id,user?.id]);
 return <>
   {isDirectApk&&eligible&&<section className="card" style={{marginBottom:18}}>
     <p>यो कोर्स लिन PSC Taiyari वेबसाइटमा उपलब्ध योजना छान्नुहोस्। त्यहाँ QR payment र Admin verification छ।</p>
     <DirectBuyButton course={course}/>
   </section>}
   <Course/>
 </>;
}
