import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {BookOpen,ArrowRight} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
export default function MyCourses(){
 const {user}=useAuth();const [searchParams,setSearchParams]=useSearchParams();const [selected,setSelected]=useState(()=>searchParams.get('course')||''),[unitRows,setUnitRows]=useState([]),[unitLoading,setUnitLoading]=useState(false),[unitError,setUnitError]=useState(''),[courses,setCourses]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{setLoading(true);setError('');try{
 const {data:enrollments,error:enrollError}=await supabase.from('course_enrollments').select('course_id,enrolled_at').eq('user_id',user.id).eq('status','active').or('expires_at.is.null,expires_at.gt.'+new Date().toISOString());
 if(enrollError)throw enrollError;
 if(!enrollments?.length){if(active)setCourses([]);return}
 const ids=[...new Set(enrollments.map(e=>e.course_id))];
 const {data,error}=await supabase.from('courses').select('id,title_ne,title_en,description,course_code,paper,fee_npr').in('id',ids).eq('status','published');
 if(error)throw error;
 if(active)setCourses(data||[]);
 }catch(e){if(active)setError(e.message)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[user?.id]);
 useEffect(()=>{const courseId=searchParams.get('course')||'';setSelected(current=>current===courseId?current:courseId)},[searchParams]);
 function toggleCourse(courseId){const next=selected===courseId?'':courseId;setSelected(next);setSearchParams(next?{course:next}:{})}
 useEffect(()=>{if(!selected){setUnitRows([]);return}let active=true;(async()=>{setUnitLoading(true);setUnitError('');try{
 const u=await supabase.from('learning_units').select('id,code,title_ne,title_en,sort_order').eq('course_id',selected).eq('status','published').order('sort_order');if(u.error)throw u.error;
 const units=u.data||[];let subs=[],subsubs=[],materials=[],done=[];
 if(units.length){const q=await supabase.from('learning_sub_units').select('id,unit_id').in('unit_id',units.map(x=>x.id)).eq('status','published');if(q.error)throw q.error;subs=q.data||[]}
 if(subs.length){const q=await supabase.from('learning_sub_sub_units').select('id,sub_unit_id').in('sub_unit_id',subs.map(x=>x.id)).eq('status','published');if(q.error)throw q.error;subsubs=q.data||[]}
 if(subsubs.length){const q=await supabase.from('learning_materials').select('id,sub_sub_unit_id').in('sub_sub_unit_id',subsubs.map(x=>x.id)).eq('status','published');if(q.error)throw q.error;materials=q.data||[]}
 if(materials.length){const q=await supabase.from('student_material_progress').select('material_id').eq('user_id',user.id).in('material_id',materials.map(x=>x.id));if(q.error)throw q.error;done=q.data||[]}
 const completed=new Set(done.map(x=>x.material_id));
 const rows=units.map(unit=>{const subIds=new Set(subs.filter(s=>s.unit_id===unit.id).map(x=>x.id));const zIds=new Set(subsubs.filter(z=>subIds.has(z.sub_unit_id)).map(x=>x.id));const entries=materials.filter(m=>zIds.has(m.sub_sub_unit_id));const finished=entries.filter(m=>completed.has(m.id)).length;return {...unit,total:entries.length,finished,percent:entries.length?Math.round(100*finished/entries.length):0}});
 if(active)setUnitRows(rows);
 }catch(e){if(active)setUnitError(e.message)}finally{if(active)setUnitLoading(false)}})();return()=>{active=false}},[selected,user?.id]);
 return <section><div className="pagehead"><div><p className="eyebrow">MY LEARNING</p><h1>My Courses</h1><p className="muted">तपाईंलाई पहुँच प्रदान गरिएका courses बाट आफ्नो पढाइ सुरु गर्नुहोस्।</p></div></div>
 {loading&&<p role="status">My Courses लोड हुँदैछ…</p>}{error&&<p className="notice" role="alert">{error}</p>}
 {!loading&&!error&&!courses.length&&<div className="card"><h2>अहिलेसम्म कुनै course छैन</h2><p>Course खरिद गरी Admin बाट payment approve भएपछि यहाँ देखिन्छ।</p><Link className="btn" to="/courses">Courses हेर्नुहोस्</Link></div>}
 <div style={{display:'flex',gap:18,overflowX:'auto',padding:'8px 2px 22px',scrollSnapType:'x mandatory'}}>{courses.map((c,i)=><article key={c.id} className="card" style={{flex:'0 0 min(310px,82vw)',scrollSnapAlign:'start',display:'flex',flexDirection:'column',gap:12}}><div className={`course-cover ${i%2?'blue':''}`}><span>MY COURSE</span><BookOpen size={42}/></div><span className="pill">Access Active</span><h2 style={{margin:0}}>{c.title_ne}</h2><p className="muted">{c.title_en||c.description||'लोकसेवा तयारी'}</p><div style={{marginTop:'auto'}}><button className="btn" type="button" onClick={()=>toggleCourse(c.id)} aria-expanded={selected===c.id}>{selected===c.id?'प्रगति बन्द गर्नुहोस्':'अध्ययन प्रगति हेर्नुहोस्'} <ArrowRight size={16}/></button></div></article>)}</div>
 {selected&&<section className="card" style={{marginTop:18}}><h2>अध्ययन प्रगति विवरण</h2><p className="muted">{courses.find(c=>c.id===selected)?.title_ne}</p>
 {unitLoading&&<p role="status">Progress लोड हुँदैछ…</p>}{unitError&&<p className="notice" role="alert">{unitError}</p>}
 {!unitLoading&&!unitError&&!unitRows.length&&<p>यस course मा प्रकाशित Units अझै छैनन्।</p>}
 {unitRows.map(u=><article key={u.id} style={{padding:'16px 0',borderBottom:'1px solid #e5e7eb'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><strong>{u.code?'Unit '+u.code+' · ':''}{u.title_ne}</strong><strong>{u.percent}% coverage</strong></div>
 <div role="progressbar" aria-valuenow={u.percent} aria-valuemin={0} aria-valuemax={100} aria-label={u.title_ne+' अध्ययन प्रगति'} style={{height:12,borderRadius:12,background:'#e5e7eb',overflow:'hidden',margin:'12px 0'}}><div style={{height:'100%',width:u.percent+'%',background:'#205D4D',borderRadius:12}}/></div>
 <small>{u.finished} / {u.total} प्रकाशित सामग्री पूरा</small>
 <div className="actions" style={{marginTop:12}}><Link className="btn" to={`/my-courses/${selected}?unit=${u.id}`}>Learning</Link><Link className="btn ghost" to={`/quizzes?course=${selected}&unit=${u.id}`}>Practice Quiz</Link></div>
 </article>)}</section>}</section>
}
