import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpen} from 'lucide-react';
import DirectBuyButton from './DirectBuyButton';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';

// Course overview is free to browse; the lesson endpoint enforces access on Supabase.
export function CourseCards({limit}){
 const {user}=useAuth();
 const [courses,setCourses]=useState(null);
 const [enrolled,setEnrolled]=useState([]);
 const [error,setError]=useState('');
 useEffect(()=>{
   let alive=true;
   setCourses(null);setError('');
   (async()=>{
     try{
       const {data,error}=await supabase.from('courses').select('id,title_ne,description,is_free,status').eq('status','published').order('created_at');
       if(error)throw error;
       let enrollments=[];
       if(user){
         const r=await supabase.from('course_enrollments').select('course_id,status,expires_at').eq('user_id',user.id);
         if(r.error)throw r.error;
         enrollments=r.data||[];
       }
       if(alive){setCourses(data||[]);setEnrolled(enrollments);}
     }catch(e){if(alive)setError(e.message);}
   })();
   return()=>{alive=false;};
 },[user?.id]);
 if(error)return <p className="notice" role="alert">{error}</p>;
 if(!courses)return <p role="status">पाठ्यक्रम लोड हुँदैछ…</p>;
 return <div className="cards course-cards">
  {courses.slice(0,limit||courses.length).map((c,i)=>{
    const hasEnrollment=enrolled.some(e=>e.course_id===c.id&&e.status!=='cancelled'&&(!e.expires_at||new Date(e.expires_at)>new Date()));
    return <article className="card course-card" key={c.id}>
      <div className={`course-cover ${i%2?'blue':''}`}><span>SELF-PACED LEARNING</span><BookOpen size={42} aria-hidden="true"/></div>
      <div className="course-body">
        <span className="pill">{c.is_free?'निःशुल्क':hasEnrollment?'भर्ना भएको':'सदस्यता आवश्यक'}</span>
        <h2>{c.title_ne}</h2>
        <p className="muted">{c.description}</p>
        {!c.is_free&&!hasEnrollment&&<p className="muted" style={{fontSize:13}}>
          कोर्सको विवरण निःशुल्क हेर्नुहोस्। उपलब्ध डेमो पाठ Login गरेपछि हेर्न सकिन्छ।
        </p>}
        <div className="actions" style={{alignItems:'center',gap:9}}>
          <Link className="btn ghost" to={`/courses/${c.id}`}>
            {hasEnrollment||c.is_free?'पढाइ जारी राख्नुहोस्':'निःशुल्क पूर्वावलोकन'} →
          </Link>
          <DirectBuyButton course={c} show={!hasEnrollment}/>
        </div>
      </div>
    </article>;
  })}
  {!courses.length&&<p className="card">कोर्सहरू तयारीमा छन्। <Link to="/tests">अभ्यास परीक्षा हेर्नुहोस्</Link>।</p>}
 </div>;
}
export default function AndroidCourses(){
 return <><div className="pagehead"><div>
  <p className="eyebrow">आफ्नै गतिमा सिक्नुहोस्</p>
  <h1>मेरा पाठ्यक्रम</h1>
  <p className="muted">कोर्सको विवरण हेर्नुहोस्, उपलब्ध निःशुल्क पाठ पढ्नुहोस् र सक्रिय सदस्यता प्रयोग गर्नुहोस्।</p>
 </div></div><CourseCards/></>;
}
