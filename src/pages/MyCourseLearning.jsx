import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
import {Resource} from '../components/Media';
export default function MyCourseLearning(){
 const {id}=useParams(),{user}=useAuth();const [course,setCourse]=useState(null),[units,setUnits]=useState([]),[subs,setSubs]=useState([]),[subsubs,setSubsubs]=useState([]),[materials,setMaterials]=useState([]),[allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{try{
 const e=await supabase.from('course_enrollments').select('id,expires_at').eq('user_id',user.id).eq('course_id',id).eq('status','active').maybeSingle();
 if(e.error)throw e.error;
 if(!e.data||e.data.expires_at&&new Date(e.data.expires_at)<=new Date())throw Error('यो course अध्ययन गर्ने पहुँच छैन।');
 const c=await supabase.from('courses').select('id,title_ne,description,status').eq('id',id).eq('status','published').single();if(c.error)throw c.error;
 const u=await supabase.from('learning_units').select('*').eq('course_id',id).eq('status','published').order('sort_order');if(u.error)throw u.error;
 let s=[],z=[],m=[];
 if(u.data.length){const a=await supabase.from('learning_sub_units').select('*').in('unit_id',u.data.map(x=>x.id)).eq('status','published').order('sort_order');if(a.error)throw a.error;s=a.data||[];}
 if(s.length){const a=await supabase.from('learning_sub_sub_units').select('*').in('sub_unit_id',s.map(x=>x.id)).eq('status','published').order('sort_order');if(a.error)throw a.error;z=a.data||[];}
 if(z.length){const a=await supabase.from('learning_materials').select('*').in('sub_sub_unit_id',z.map(x=>x.id)).eq('status','published').order('sort_order');if(a.error)throw a.error;m=a.data||[];}
 if(active){setAllowed(true);setCourse(c.data);setUnits(u.data||[]);setSubs(s);setSubsubs(z);setMaterials(m)}
 }catch(e){if(active)setError(e.message)}finally{if(active)setLoading(false)}})();return()=>{active=false}},[id,user?.id]);
 if(loading)return <p role="status">पाठ्यक्रम लोड हुँदैछ…</p>;
 if(!allowed)return <div className="card"><p className="notice">{error}</p><Link to="/my-courses">← My Courses</Link></div>;
 return <section><Link to="/my-courses">← My Courses</Link><h1>{course.title_ne}</h1><p>{course.description}</p>
 {!units.length&&<p className="card">अध्ययन सामग्री तयारीमा छ।</p>}
 {units.map(u=><section className="card" key={u.id}><h2>{u.code&&u.code+' · '}{u.title_ne}</h2>{subs.filter(s=>s.unit_id===u.id).map(s=><details className="content-details" key={s.id}><summary>{s.code&&s.code+' · '}{s.title_ne}</summary>{subsubs.filter(z=>z.sub_unit_id===s.id).map(z=><details className="content-details" key={z.id}><summary>{z.code&&z.code+' · '}{z.title_ne}</summary>{materials.filter(m=>m.sub_sub_unit_id===z.id).map(m=><article className="material-preview" key={m.id}><h3>{m.title_ne}</h3>{m.description&&<p>{m.description}</p>}<Resource resource={m}/></article>)}</details>)}</details>)}</section>)}
 </section>;
}
