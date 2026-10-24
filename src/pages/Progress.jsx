import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
export default function Progress(){
 const {user}=useAuth();const [stats,setStats]=useState([]),[lessons,setLessons]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setError('');(async()=>{try{const [s,l]=await Promise.all([
  supabase.from('user_topic_stats').select('*,topics(name_ne)').eq('user_id',user.id).order('mastery_score',{ascending:false}),
  supabase.from('lesson_progress').select('*,lessons(title_ne)').eq('user_id',user.id).order('updated_at',{ascending:false})
 ]);if(s.error||l.error)throw s.error||l.error;if(alive){setStats(s.data||[]);setLessons(l.data||[]);}}catch(e){if(alive)setError(e.message);}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[user.id,retry]);
 const weakest=stats.length?[...stats].sort((a,b)=>Number(a.mastery_score)-Number(b.mastery_score))[0]:null;
 return <div className="study-workspace"><div className="pagehead"><div><p className="eyebrow">हरेक प्रयासको हिसाब</p><h1>मेरो प्रगति</h1><p className="muted">पूरा भएका पाठ र अभ्यासबाट बनेको विषयगत दक्षता।</p></div></div>
 {error&&<p className="notice" role="alert">{error} <button className="textbtn" onClick={()=>setRetry(n=>n+1)}>फेरि प्रयास</button></p>}
 {loading?<p role="status">प्रगति लोड हुँदैछ…</p>:!error&&<><div className="progress-summary"><div className="card"><strong>{lessons.filter(l=>l.status==='completed').length}</strong><small>पाठ पूरा</small></div><div className="card"><strong>{lessons.filter(l=>l.status!=='completed').length}</strong><small>अध्ययन भइरहेका पाठ</small></div><Link className="card progress-review" to="/review">↻ पुनरावृत्ति<small>कमजोर विषय र उत्तर समीक्षा →</small></Link></div>
 <section className="card"><h2>विषय अनुसार दक्षता</h2>{stats.map(x=><div className="progressrow" key={x.topic_id}><span>{x.topics?.name_ne||'विषय'}</span><div className="meter" role="progressbar" aria-label={x.topics?.name_ne||'विषयको दक्षता'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,Number(x.mastery_score)||0))}><i style={{width:`${Math.max(0,Math.min(100,Number(x.mastery_score)||0))}%`}}/></div><b>{Math.round(Number(x.mastery_score)||0)}%</b></div>)}{!stats.length&&<p className="muted">अभ्यासको नतिजा प्रशोधन भएपछि यहाँ दक्षता देखिन्छ। <Link to="/tests">अभ्यास सुरु गर्नुहोस् →</Link></p>}
 {weakest&&Number(weakest.mastery_score)<60&&<div className="notice"><strong>अबको कदम</strong><p>{weakest.topics?.name_ne||'कमजोर विषय'} मा थप अध्ययन र अभ्यास गर्नुहोस्।</p><Link to="/review">पुनरावृत्ति खोल्नुहोस् →</Link></div>}</section>
 <section className="card recent-performance"><h2>पाठको प्रगति</h2>{lessons.map(l=><div className="lesson-row" key={l.lesson_id}><span>{l.lessons?.title_ne||'पाठको पहुँच नवीकरण गर्नुहोस्'}<small>{l.status==='completed'?'✓ पूरा':'पढ्दै'}</small></span>{l.lessons&&<Link className="btn ghost" to={`/lessons/${l.lesson_id}`}>जारी राख्नुहोस्</Link>}</div>)}{!lessons.length&&<p><Link to="/courses">कोर्सबाट पढाइ सुरु गर्नुहोस् →</Link></p>}</section></>}
 </div>;
}
