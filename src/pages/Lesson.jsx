import {useEffect,useRef,useState} from 'react';import {Link,useParams} from 'react-router-dom';import {supabase} from '../lib/supabase';import {useAuth} from '../contexts/AuthContext';import {Resource} from '../components/Media';

const escapeHtml=value=>String(value||'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));

function mobilePdfMarkup({title,unit,objectives,lessonNotes}){
 const safeObjectives=(objectives||[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
 const notes=lessonNotes?.trim()?`<section class="notes"><h2>पाठ सामग्री</h2><div>${escapeHtml(lessonNotes).replace(/\n/g,'<br/>')}</div></section>`:'';
 return `<!doctype html><html lang="ne"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escapeHtml(title)}</title><style>
 @page { size: 105mm 185mm; margin: 8mm 7mm 10mm; }
 * { box-sizing: border-box; }
 html,body { margin:0; padding:0; color:#182230; background:#fff; font-family:"Noto Sans Devanagari","Noto Sans",Arial,sans-serif; font-size:11pt; line-height:1.7; }
 h1 { color:#123e72; font-size:19pt; line-height:1.35; margin:0 0 5mm; }
 h2 { color:#123e72; font-size:14pt; line-height:1.4; margin:7mm 0 3mm; break-after:avoid; }
 .brand { color:#456; font-size:9pt; margin:0 0 2mm; }
 .unit { color:#64748b; font-size:10pt; margin:0 0 6mm; }
 .objectives { background:#eff6ff; border-left:3px solid #2563eb; border-radius:2mm; padding:3mm 4mm; break-inside:avoid; }
 .objectives h2 { margin:0 0 2mm; font-size:12pt; }
 ul { margin:0; padding-left:5mm; }
 li { margin:0 0 1.5mm; }
 .notes { overflow-wrap:anywhere; }
 .footer { position:fixed; bottom:2mm; left:0; right:0; color:#64748b; font-size:8pt; text-align:center; }
 @media screen { body { width:397px; min-height:700px; padding:30px 27px 38px; } }
 </style></head><body><main><p class="brand">लोकसेवा तयारी</p><p class="unit">${escapeHtml(unit||'Learning material')}</p><h1>${escapeHtml(title)}</h1>${safeObjectives?`<section class="objectives"><h2>यस पाठबाट सिक्ने कुरा</h2><ul>${safeObjectives}</ul></section>`:''}${notes}</main><p class="footer">लोकसेवा तयारी</p></body></html>`;
}
export default function Lesson(){const {id}=useParams();return <LessonContent key={id} id={id}/>;}
function LessonContent({id}){const {user}=useAuth();const [lesson,setLesson]=useState(null),[resources,setResources]=useState([]),[tests,setTests]=useState([]),[progress,setProgress]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);const current=useRef({resource:null,position:0}),chain=useRef(Promise.resolve());
 function save(completed=false){const snapshot={...current.current};const op=chain.current.catch(()=>{}).then(async()=>{const {data,error}=await supabase.rpc('record_lesson_progress',{p_lesson_id:id,p_resource_id:snapshot.resource,p_position_seconds:snapshot.position,p_completed:completed});if(error)throw error;setProgress(Array.isArray(data)?data[0]:data);setMessage(completed?'पाठ पूरा भएको सुरक्षित भयो।':'प्रगति सुरक्षित भयो।');return data;});chain.current=op;return op;}
 useEffect(()=>{let alive=true;setLoading(true);setError('');current.current={resource:null,position:0};(async()=>{try{const l=await supabase.from('lessons').select('*,course_units(course_id,title_ne)').eq('id',id).single();if(l.error)throw l.error;const [r,p,t]=await Promise.all([supabase.from('lesson_resources').select('*').eq('lesson_id',id).order('sort_order'),supabase.from('lesson_progress').select('*').eq('lesson_id',id).eq('user_id',user.id).maybeSingle(),supabase.from('lesson_assessments').select('*,tests(id,title,is_published)').eq('lesson_id',id).order('sort_order')]);if(r.error||p.error||t.error)throw r.error||p.error||t.error;if(!alive)return;setLesson(l.data);setResources(r.data);setProgress(p.data);setTests(t.data);current.current={resource:p.data?.last_resource_id||null,position:p.data?.last_position_seconds||0};}catch(e){if(alive)setError(e.message);}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[id,user.id]);
 useEffect(()=>{if(!lesson||loading)return;const timer=setInterval(()=>save().catch(e=>setError(e.message)),30000);return()=>clearInterval(timer);},[id,lesson,loading]);
 async function complete(){setBusy(true);setError('');try{await save(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
 function printMobilePdf(){
  const tab=window.open('','_blank','noopener,noreferrer');
  if(!tab){setError('PDF बनाउन नयाँ tab खोल्न अनुमति दिनुहोस् (pop-up block भएको छ)।');return;}
  tab.document.open();
  tab.document.write(mobilePdfMarkup({title:lesson.title_ne,unit:lesson.course_units?.title_ne,objectives:lesson.objectives,lessonNotes:lesson.content_markdown}));
  tab.document.close();
  tab.onload=()=>{tab.focus();tab.print();};
 }
 if(loading)return <p role="status">Loading lesson…</p>;if(!lesson||error&&!resources.length)return <div className="card"><p role="alert">{error||'यो पाठको पहुँच छैन।'}</p><Link to="/courses">कोर्स र सदस्यता हेर्नुहोस्</Link></div>;
 return <><Link to={`/courses/${lesson.course_units.course_id}`}>← {lesson.course_units.title_ne}</Link><article className="card"><p className="eyebrow">{lesson.estimated_minutes} मिनेट · {progress?.status==='completed'?'पूरा भयो':'अध्ययन'}</p><div className="lesson-title-row"><h1>{lesson.title_ne}</h1><button className="btn ghost mobile-pdf-button" onClick={printMobilePdf}>मोबाइल PDF मा Save गर्नुहोस्</button></div><p className="muted mobile-pdf-help">खुलेको print screen मा <strong>Save as PDF</strong> छान्नुहोस्।</p>{lesson.objectives.length>0&&<ul>{lesson.objectives.map((x,i)=><li key={i}>{x}</li>)}</ul>}<div className="lesson-notes">{lesson.content_markdown||'नोट थपिँदै छ।'}</div>{resources.map(r=><section key={r.id}><h3>{r.title}</h3><Resource resource={r} resume={progress?.last_resource_id===r.id?progress.last_position_seconds:0} onPosition={position=>{current.current={resource:r.id,position};}}/></section>)}{error&&<p className="notice" role="alert">{error}</p>}<p role="status">{message}</p><div className="actions"><button className="btn ghost" disabled={busy} onClick={()=>save().catch(e=>setError(e.message))}>प्रगति सुरक्षित गर्नुहोस्</button><button className="btn" disabled={busy} onClick={complete}>पाठ पूरा भयो ✓</button></div>{tests.filter(t=>t.tests?.is_published).map(t=><p key={t.test_id}><Link className="btn" to={`/test/${t.test_id}`}>{t.tests.title} · अभ्यास गर्नुहोस्</Link></p>)}</article></>;
}
