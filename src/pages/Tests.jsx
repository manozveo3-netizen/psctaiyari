import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {Link} from 'react-router-dom';
export default function Tests(){
 const [tests,setTests]=useState([]),[level,setLevel]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;setLoading(true);setError('');supabase.from('tests').select('*,exam_levels(name_ne,name_en),subjects(name_ne,name_en)').eq('is_published',true).order('created_at',{ascending:false}).then(({data,error})=>{if(!alive)return;if(error)setError(error.message);else setTests(data||[]);}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[retry]);
 const visible=tests.filter(x=>!level||x.exam_level_id===level);
 return <div className="study-workspace"><div className="pagehead"><div><p className="eyebrow">आफैँलाई जाँच्नुहोस्</p><h1>अभ्यास र Mock Test</h1><p className="muted">आफ्नो परीक्षा छान्नुहोस् र तयारी जाँच्नुहोस्।</p></div></div><Link className="review-shortcut" to="/review">↻ पुनरावृत्ति · नतिजा र कमजोर विषय हेर्नुहोस् →</Link>
 <label>परीक्षा छान्नुहोस्<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">सबै परीक्षा</option>{[...new Map(tests.map(x=>[x.exam_level_id,x.exam_levels?.name_ne])).entries()].map(([id,name])=><option key={id} value={id}>{name||'परीक्षा'}</option>)}</select></label>
 {error&&<p className="notice" role="alert">{error} <button className="textbtn" onClick={()=>setRetry(n=>n+1)}>फेरि प्रयास</button></p>}
 {loading?<p role="status">परीक्षाहरू लोड हुँदैछन्…</p>:!error&&<div className="cards">{visible.map(x=><article className="card" key={x.id}><span className="pill">{x.test_type}</span><h2>{x.title}</h2><p className="muted">{x.exam_levels?.name_ne} {x.subjects?.name_ne&&`• ${x.subjects.name_ne}`}</p><p>{x.total_questions} प्रश्न{x.duration_minutes?` • ${x.duration_minutes} मिनेट`:''}</p><Link className="btn" to={`/test/${x.id}`}>परीक्षा सुरु गर्नुहोस् →</Link></article>)}{!visible.length&&<p className="card">यस छनोटमा प्रकाशित परीक्षा उपलब्ध छैन।</p>}</div>}
 </div>;
}
