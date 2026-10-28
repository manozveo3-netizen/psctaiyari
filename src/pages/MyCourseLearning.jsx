import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
import {Resource} from '../components/Media';
export default function MyCourseLearning(){
 const {id}=useParams(),{user}=useAuth();const [query]=useSearchParams();const focusUnit=query.get('unit');const [completed,setCompleted]=useState([]),[saving,setSaving]=useState(''),[pageIndex,setPageIndex]=useState(0);const [course,setCourse]=useState(null),[units,setUnits]=useState([]),[subs,setSubs]=useState([]),[subsubs,setSubsubs]=useState([]),[materials,setMaterials]=useState([]),[allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{setPageIndex(0);setCompleted([]);setLoading(true);setAllowed(false);setError('');let active=true;(async()=>{try{
 const e=await supabase.from('course_enrollments').select('id,expires_at').eq('user_id',user.id).eq('course_id',id).eq('status','active').maybeSingle();
 if(e.error)throw e.error;
 if(!e.data||e.data.expires_at&&new Date(e.data.expires_at)<=new Date())throw Error('यो course अध्ययन गर्ने पहुँच छैन।');
 const c=await supabase.from('courses').select('id,title_ne,description,status').eq('id',id).eq('status','published').single();if(c.error)throw c.error;
 let unitQuery=supabase.from('learning_units').select('*').eq('course_id',id).eq('status','published');
 if(focusUnit)unitQuery=unitQuery.eq('id',focusUnit);
 const u=await unitQuery.order('sort_order');if(u.error)throw u.error;
 let s=[],z=[],m=[];
 if(u.data.length){const a=await supabase.from('learning_sub_units').select('*').in('unit_id',u.data.map(x=>x.id)).eq('status','published').order('sort_order');if(a.error)throw a.error;s=a.data||[];}
 if(s.length){const a=await supabase.from('learning_sub_sub_units').select('*').in('sub_unit_id',s.map(x=>x.id)).eq('status','published').order('sort_order');if(a.error)throw a.error;z=a.data||[];}
 if(z.length){const a=await supabase.from('learning_materials').select('*').in('sub_sub_unit_id',z.map(x=>x.id)).eq('status','published').order('sort_order');if(a.error)throw a.error;m=a.data||[];}
 if(m.length){const pr=await supabase.from('student_material_progress').select('material_id').eq('user_id',user.id).in('material_id',m.map(x=>x.id));if(pr.error)throw pr.error;if(active)setCompleted((pr.data||[]).map(x=>x.material_id))}
 if(active){setAllowed(true);setCourse(c.data);setUnits(u.data||[]);setSubs(s);setSubsubs(z);setMaterials(m)}
 }catch(e){if(active)setError(e.message)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[id,user?.id,focusUnit]);
 async function markComplete(materialId){setSaving(materialId);setError('');try{const r=await supabase.from('student_material_progress').upsert({user_id:user.id,material_id:materialId},{onConflict:'user_id,material_id',ignoreDuplicates:true});if(r.error)throw r.error;setCompleted(x=>x.includes(materialId)?x:[...x,materialId])}catch(e){setError(e.message)}finally{setSaving('')}}
 const pages=units.flatMap(u=>subs.filter(sub=>sub.unit_id===u.id).flatMap(sub=>subsubs.filter(z=>z.sub_unit_id===sub.id).flatMap(z=>materials.filter(m=>m.sub_sub_unit_id===z.id).map(m=>({unit:u,sub,z,material:m})))));
 const currentPage=pages[Math.min(pageIndex,Math.max(0,pages.length-1))];
 const completedCount=pages.filter(p=>completed.includes(p.material.id)).length;
 if(loading)return <p role="status">पाठ्यक्रम लोड हुँदैछ…</p>;
 if(!allowed)return <div className="card"><p className="notice">{error}</p><Link to={`/my-courses?course=${encodeURIComponent(id)}`}>← My Courses</Link></div>;
 return <section><Link to={`/my-courses?course=${encodeURIComponent(id)}`}>← My Courses</Link><h1>{course.title_ne}</h1><p>{course.description}</p>{error&&<p className="notice" role="alert">{error}</p>}
 {!units.length&&<p className="card">{focusUnit?'छानिएको Unit को प्रकाशित अध्ययन सामग्री उपलब्ध छैन।':'अध्ययन सामग्री तयारीमा छ।'}</p>}
 {!!units.length&&!pages.length&&<p className="card">यस Unit मा प्रकाशित अध्ययन सामग्री उपलब्ध छैन।</p>}
 {currentPage&&<article className="card" key={currentPage.material.id}>
 <p className="eyebrow">{currentPage.unit.code&&'Unit '+currentPage.unit.code+' · '}{currentPage.unit.title_ne}</p>
 <p className="muted">{currentPage.sub.title_ne} / {currentPage.z.title_ne}</p>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><strong>Page {pageIndex+1} / {pages.length}</strong><span>{completedCount} / {pages.length} pages completed</span></div>
 <div role="progressbar" aria-valuemin={0} aria-valuemax={pages.length} aria-valuenow={completedCount} aria-label="Pages completed" style={{height:8,background:'#e5e7eb',borderRadius:8,overflow:'hidden',margin:'12px 0 20px'}}><div style={{background:'#205D4D',height:'100%',width:(100*completedCount/pages.length)+'%'}}/></div>
 <h2>{currentPage.material.title_ne}</h2>
 {currentPage.material.description&&<p>{currentPage.material.description}</p>}
 <Resource resource={currentPage.material}/>
 <div className="actions" style={{marginTop:20}}>
 <button className="btn ghost" type="button" disabled={completed.includes(currentPage.material.id)||saving===currentPage.material.id} onClick={()=>markComplete(currentPage.material.id)}>{completed.includes(currentPage.material.id)?'✓ यो Page पूरा भयो':saving===currentPage.material.id?'Saving…':'Mark this Page as Complete'}</button>
 </div>
 <div className="actions" style={{display:'flex',justifyContent:'space-between',gap:12,marginTop:18}}>
 <button className="btn ghost" type="button" disabled={pageIndex===0} onClick={()=>setPageIndex(x=>Math.max(0,x-1))}>← Previous Page</button>
 <button className="btn" type="button" disabled={pageIndex>=pages.length-1} onClick={()=>setPageIndex(x=>Math.min(pages.length-1,x+1))}>Next Page →</button>
 </div>
 </article>}

 </section>;
}
