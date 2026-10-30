import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';

const ACCEPT='.pdf,.jpg,.jpeg,.doc,.docx';
const materialType=file=>{
 const name=(file?.name||'').toLowerCase();
 if(name.endsWith('.pdf'))return 'pdf';
 if(name.endsWith('.jpg')||name.endsWith('.jpeg'))return 'image';
 return 'docx';
};
const safeName=name=>name.replace(/[^a-zA-Z0-9._-]/g,'_');

export default function QuickMaterialUpload(){
 const [courses,setCourses]=useState([]),[units,setUnits]=useState([]);
 const [courseId,setCourseId]=useState(''),[unitId,setUnitId]=useState('');
 const [topic,setTopic]=useState(''),[file,setFile]=useState(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');

 useEffect(()=>{let active=true;(async()=>{const {data,error}=await supabase.from('courses').select('id,title_ne,title_en,course_code').eq('status','published').order('title_ne');if(error)throw error;if(active)setCourses(data||[]);})().catch(e=>active&&setError(e.message));return()=>{active=false};},[]);

 useEffect(()=>{setUnitId('');setUnits([]);if(!courseId)return;let active=true;(async()=>{const {data,error}=await supabase.from('learning_units').select('id,code,title_ne,title_en,status,sort_order').eq('course_id',courseId).order('sort_order');if(error)throw error;if(active)setUnits(data||[]);})().catch(e=>active&&setError(e.message));return()=>{active=false};},[courseId]);

 async function ensureTopicPath(){
  let {data:sub,error}=await supabase.from('learning_sub_units').select('id').eq('unit_id',unitId).eq('code','materials').limit(1).maybeSingle();
  if(error)throw error;
  if(!sub){const r=await supabase.from('learning_sub_units').insert({unit_id:unitId,code:'materials',title_ne:'अध्ययन सामग्री',title_en:'Learning materials',sort_order:999,status:'published'}).select('id').single();if(r.error)throw r.error;sub=r.data;}
  let {data:subsub,error:subsubError}=await supabase.from('learning_sub_sub_units').select('id').eq('sub_unit_id',sub.id).eq('title_ne',topic.trim()).limit(1).maybeSingle();
  if(subsubError)throw subsubError;
  if(!subsub){const r=await supabase.from('learning_sub_sub_units').insert({sub_unit_id:sub.id,code:null,title_ne:topic.trim(),title_en:topic.trim(),sort_order:999,status:'published'}).select('id').single();if(r.error)throw r.error;subsub=r.data;}
  return subsub.id;
 }

 async function submit(e){
  e.preventDefault();setError('');setMessage('');
  if(!courseId||!unitId||!topic.trim()||!file)return;
  setBusy(true);let uploaded=null;
  try{
   const ext=materialType(file);
   const path=courseId+'/'+unitId+'/'+crypto.randomUUID()+'-'+safeName(file.name);
   const up=await supabase.storage.from('course-materials').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
   if(up.error)throw up.error;
   uploaded=path;
   const subSubUnitId=await ensureTopicPath();
   const {error:saveError}=await supabase.from('learning_materials').insert({sub_sub_unit_id:subSubUnitId,title_ne:topic.trim(),title_en:topic.trim(),material_type:ext,storage_bucket:'course-materials',storage_path:path,sort_order:999,status:'published'});
   if(saveError)throw saveError;
   setTopic('');setFile(null);
   const input=document.getElementById('quick-material-file');if(input)input.value='';
   setMessage('Learning material सुरक्षित र प्रकाशित भयो।');
  }catch(err){
   if(uploaded)await supabase.storage.from('course-materials').remove([uploaded]);
   setError(err.message||'सामग्री सुरक्षित हुन सकेन।');
  }finally{setBusy(false);}
 }

 return <section className="learning-admin">
  <div className="learning-admin-intro"><div><p className="eyebrow">QUICK UPLOAD</p><h2>Learning Material</h2><p className="muted">Published course छान्नुहोस्, त्यसको Unit छान्नुहोस्, Topic लेख्नुहोस् र file upload गर्नुहोस्।</p></div></div>
  {message&&<p className="success" role="status">{message}</p>}
  {error&&<p className="notice" role="alert">{error}</p>}
  {!courses.length&&!error&&<p className="card muted">Published course उपलब्ध छैन। पहिले Course मा गएर course publish गर्नुहोस्।</p>}
  <form className="card formgrid" onSubmit={submit}>
   <label>Course<select required value={courseId} onChange={e=>setCourseId(e.target.value)}><option value="">Published course छान्नुहोस्</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title_ne}{c.course_code?' ('+c.course_code+')':''}</option>)}</select></label>
   <label>Unit<select required disabled={!courseId} value={unitId} onChange={e=>setUnitId(e.target.value)}><option value="">{courseId?'Unit छान्नुहोस्':'पहिले course छान्नुहोस्'}</option>{units.map(u=><option key={u.id} value={u.id}>{u.code?u.code+' · ':''}{u.title_ne}{u.status!=='published'?' (Draft)':''}</option>)}</select></label>
   <label>Topic<input required value={topic} onChange={e=>setTopic(e.target.value)} placeholder="जस्तै: सौर्यमण्डल" /></label>
   <label>File (PDF, JPG/JPEG, DOC/DOCX)<input id="quick-material-file" required type="file" accept={ACCEPT} onChange={e=>setFile(e.target.files?.[0]||null)} />{file&&<small>{file.name} · {(file.size/1048576).toFixed(2)} MB</small>}</label>
   <div className="span2"><button className="btn" disabled={busy||!courses.length}>{busy?'Uploading…':'Save Learning Material'}</button></div>
  </form>
 </section>;
}
