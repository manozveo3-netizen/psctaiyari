import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpen,ArrowRight,CheckCircle2,ClipboardCheck,RotateCcw,Orbit} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
import {CourseCards} from './AndroidCourses';

export default function AndroidDashboard(){
 const {profile,user}=useAuth();
 const [recent,setRecent]=useState([]),[attempts,setAttempts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setError('');
 Promise.all([
  supabase.from('lesson_progress').select('lesson_id,status,updated_at,lessons(title_ne)').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(8),
  supabase.from('attempts').select('id,percentage,correct_answers,total_questions,started_at').eq('user_id',user.id).eq('status','completed').order('started_at',{ascending:false}).limit(8)
 ]).then(([l,a])=>{if(!alive)return;if(l.error||a.error)throw l.error||a.error;setRecent(l.data||[]);setAttempts(a.data||[]);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[user.id,retry]);
 const next=recent.find(l=>l.lessons&&l.status!=='completed'),destination=next?`/lessons/${next.lesson_id}`:'/courses';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu'}).format(new Date());
 const isToday=value=>value&&new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu'}).format(new Date(value))===today;
 const readToday=recent.some(l=>l.status==='completed'&&isToday(l.updated_at)),practisedToday=attempts.some(a=>isToday(a.started_at));
 return <div className="study-workspace">
  <div className="pagehead"><div><p className="eyebrow">आजको पढाइ</p><h1>नमस्ते, {profile?.full_name||'विद्यार्थी'} 👋</h1><p className="muted">पढ्नुहोस्, अभ्यास गर्नुहोस् र हरेक दिन अगाडि बढ्नुहोस्।</p></div></div>
  {error&&<div className="notice" role="alert">प्रगति लोड भएन: {error} <button className="textbtn" onClick={()=>setRetry(n=>n+1)}>फेरि प्रयास</button></div>}
  <section className="continue-card" aria-busy={loading}><div><p className="eyebrow">तपाईंको अध्ययन यात्रा</p><h2>{next?'जहाँ छोड्नुभयो, त्यहीँबाट':'एकाइबाट पढाइ सुरु गर्नुहोस्'}</h2><p>{loading?'पछिल्लो पाठ खोज्दैछ…':next?.lessons.title_ne||'पाठ्यक्रम छान्नुहोस् र पहिलो पाठबाट अगाडि बढ्नुहोस्।'}</p></div><Orbit className="orbit-icon" size={76} aria-hidden="true"/><Link className="btn" to={destination}>{next?'पढाइ जारी राख्नुहोस्':'पाठ्यक्रम हेर्नुहोस्'} <ArrowRight size={18}/></Link></section>
  <section className="card daily-plan"><h2>आजको पढाइ · दैनिक चेकलिस्ट</h2><p className="muted">पाठ → अभ्यास → पुनरावृत्ति</p>{[
   [BookOpen,'एक पाठ पढ्नुहोस्','आफ्नै गतिमा विषय बुझ्नुहोस्',destination,readToday],
   [ClipboardCheck,'MCQ अभ्यास गर्नुहोस्','पढेको कुरा आफैँ जाँच्नुहोस्','/tests',practisedToday],
   [RotateCcw,'गल्ती दोहोर्‍याउनुहोस्','पछिल्ला नतिजा र व्याख्या हेर्नुहोस्','/review',false]
  ].map(([Icon,title,detail,to,done])=><Link className="daily-step" key={to} to={to}><Icon size={23}/><span><strong>{title}</strong><small>{detail}</small></span>{done?<CheckCircle2 size={21} aria-label="आज पूरा भयो"/>:<ArrowRight size={18}/>}</Link>)}</section>
  <div className="section-heading"><h2>आफ्नो पाठ्यक्रम</h2><Link to="/courses">सबै हेर्नुहोस् →</Link></div><CourseCards limit={2}/>
  <section className="card recent-performance"><div className="section-heading"><h2>पछिल्लो अभ्यास</h2><Link to="/progress">मेरो प्रगति →</Link></div>{loading?<p role="status">नतिजा लोड हुँदैछ…</p>:error?<p>नतिजा अहिले उपलब्ध छैन।</p>:attempts.length?attempts.map(a=><Link className="daily-step" key={a.id} to={`/result/${a.id}`}><ClipboardCheck size={21}/><span><strong>{a.correct_answers}/{a.total_questions} सही</strong><small>{new Date(a.started_at).toLocaleDateString('ne-NP')}</small></span><b>{Math.round(Number(a.percentage)||0)}%</b></Link>):<p className="muted">अभ्यास पूरा गरेपछि नतिजा यहाँ देखिन्छ।</p>}</section>
 </div>;
}
