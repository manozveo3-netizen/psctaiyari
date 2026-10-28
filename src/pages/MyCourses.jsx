import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpen,ArrowRight} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
export default function MyCourses(){
 const {user}=useAuth();const [courses,setCourses]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{setLoading(true);setError('');try{
 const {data:enrollments,error:enrollError}=await supabase.from('course_enrollments').select('course_id,enrolled_at').eq('user_id',user.id).eq('status','active').or('expires_at.is.null,expires_at.gt.'+new Date().toISOString());
 if(enrollError)throw enrollError;
 if(!enrollments?.length){if(active)setCourses([]);return}
 const ids=[...new Set(enrollments.map(e=>e.course_id))];
 const {data,error}=await supabase.from('courses').select('id,title_ne,title_en,description,course_code,paper,fee_npr').in('id',ids).eq('status','published');
 if(error)throw error;
 if(active)setCourses(data||[]);
 }catch(e){if(active)setError(e.message)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[user?.id]);
 return <section><div className="pagehead"><div><p className="eyebrow">MY LEARNING</p><h1>My Courses</h1><p className="muted">तपाईंलाई पहुँच प्रदान गरिएका courses बाट आफ्नो पढाइ सुरु गर्नुहोस्।</p></div></div>
 {loading&&<p role="status">My Courses लोड हुँदैछ…</p>}{error&&<p className="notice" role="alert">{error}</p>}
 {!loading&&!error&&!courses.length&&<div className="card"><h2>अहिलेसम्म कुनै course छैन</h2><p>Course खरिद गरी Admin बाट payment approve भएपछि यहाँ देखिन्छ।</p><Link className="btn" to="/courses">Courses हेर्नुहोस्</Link></div>}
 <div style={{display:'flex',gap:18,overflowX:'auto',padding:'8px 2px 22px',scrollSnapType:'x mandatory'}}>{courses.map((c,i)=><article key={c.id} className="card" style={{flex:'0 0 min(310px,82vw)',scrollSnapAlign:'start',display:'flex',flexDirection:'column',gap:12}}><div className={`course-cover ${i%2?'blue':''}`}><span>MY COURSE</span><BookOpen size={42}/></div><span className="pill">Access Active</span><h2 style={{margin:0}}>{c.title_ne}</h2><p className="muted">{c.title_en||c.description||'लोकसेवा तयारी'}</p><div style={{marginTop:'auto'}}><Link className="btn" to={`/my-courses/${c.id}`}>अध्ययन सुरु गर्नुहोस् <ArrowRight size={16}/></Link></div></article>)}</div></section>
}
