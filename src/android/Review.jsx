import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {RotateCcw,Target,ClipboardCheck,ArrowRight} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';

export default function Review(){
 const {user}=useAuth();const [attempts,setAttempts]=useState([]),[topics,setTopics]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setError('');Promise.all([
  supabase.from('attempts').select('id,percentage,correct_answers,total_questions,started_at').eq('user_id',user.id).eq('status','completed').order('started_at',{ascending:false}).limit(20),
  supabase.from('user_topic_stats').select('*,topics(name_ne)').eq('user_id',user.id).order('mastery_score',{ascending:true})
 ]).then(([a,t])=>{if(!alive)return;if(a.error||t.error)throw a.error||t.error;setAttempts(a.data||[]);setTopics(t.data||[]);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[user.id,retry]);
 const weak=topics.filter(t=>Number(t.mastery_score)<60);
 return <div className="study-workspace"><div className="pagehead"><div><p className="eyebrow">अभ्यासबाट सिक्नुहोस्</p><h1>पुनरावृत्ति</h1><p className="muted">पछिल्ला उत्तर हेर्नुहोस् र कमजोर विषय फेरि पढ्नुहोस्।</p></div></div>
 {error&&<p className="notice" role="alert">{error} <button className="textbtn" onClick={()=>setRetry(n=>n+1)}>फेरि प्रयास</button></p>}
 {loading?<p role="status">अभ्यासको विवरण लोड हुँदैछ…</p>:!error&&<><div className="review-metrics"><div className="card"><RotateCcw size={22}/><strong>{attempts.length}</strong><small>पछिल्ला परीक्षा · २० सम्म</small></div><div className="card"><Target size={22}/><strong>{weak.length}</strong><small>६०% भन्दा कम दक्षता भएका विषय</small></div></div>
 <section className="card"><h2>प्राथमिकतामा अभ्यास गर्नुहोस्</h2>{weak.length?weak.slice(0,5).map(t=><div className="focus-topic" key={t.topic_id}><strong>{t.topics?.name_ne||'विषय'}</strong><p className="muted">दक्षता {Math.round(Number(t.mastery_score)||0)}%</p><div className="meter"><i style={{width:`${Math.max(0,Math.min(100,Number(t.mastery_score)||0))}%`}}/></div><Link className="btn ghost" to="/courses">सम्बन्धित पाठ छान्नुहोस् <ArrowRight size={16}/></Link></div>):<p className="muted">अहिले कमजोर विषयको तथ्याङ्क छैन। अभ्यासपछि यहाँ सुझाव देखिन्छ।</p>}</section>
 <section className="card recent-performance"><h2>उत्तर र व्याख्या दोहोर्‍याउनुहोस्</h2>{attempts.length?attempts.map(a=><Link className="daily-step" key={a.id} to={`/result/${a.id}`}><RotateCcw size={22}/><span><strong>{a.correct_answers}/{a.total_questions} सही · {Math.round(Number(a.percentage)||0)}%</strong><small>{new Date(a.started_at).toLocaleDateString('ne-NP')} · नतिजा र उत्तर हेर्नुहोस्</small></span><ArrowRight size={18}/></Link>):<p className="muted">पहिलो अभ्यास पूरा गरेपछि यहाँ उत्तर समीक्षा गर्न सक्नुहुन्छ।</p>}</section></>}
 <section className="continue-card mock-entry"><ClipboardCheck size={32}/><div><h2>Mock Test</h2><p>प्रकाशित परीक्षा छान्नुहोस् र आफ्नो तयारी जाँच्नुहोस्।</p></div><Link className="btn" to="/tests">परीक्षा छान्नुहोस् <ArrowRight size={17}/></Link></section>
 </div>;
}
