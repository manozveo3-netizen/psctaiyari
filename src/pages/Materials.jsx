import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {BookOpen,Search} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
export default function Materials(){
 const {user}=useAuth();const [lessons,setLessons]=useState([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;(async()=>{try{const {data,error}=await supabase.from('lessons').select('id,title_ne,estimated_minutes,course_units(title_ne)').eq('status','published').order('sort_order');if(error)throw error;if(alive)setLessons(data||[]);}catch(e){if(alive)setError(e.message);}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[user.id]);
 const filtered=lessons.filter(l=>`${l.title_ne} ${l.course_units?.title_ne||''}`.toLowerCase().includes(search.trim().toLowerCase()));
 return <><div className="pagehead"><div><p className="eyebrow">STUDY LIBRARY</p><h1>Learning materials</h1><p className="muted">आफूलाई पहुँच भएका पाठ, नोट र अध्ययन सामग्री खोज्नुहोस्।</p></div></div><label className="material-search"><span><Search size={16}/> सामग्री खोज्नुहोस्</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="पाठ वा एकाइको नाम…"/></label><section className="card">{loading?<p role="status">सामग्री लोड हुँदैछ…</p>:error?<p className="notice" role="alert">{error}</p>:filtered.length?filtered.map(l=><div className="material-row" key={l.id}><span className="material-icon"><BookOpen size={21}/></span><div className="grow"><h3>{l.title_ne}</h3><p className="muted">{l.course_units?.title_ne} · {l.estimated_minutes||'—'} मिनेट</p></div><Link className="btn ghost" to={`/lessons/${l.id}`}>पढ्नुहोस् →</Link></div>):<p className="muted">{search?'खोजीसँग मिल्ने सामग्री भेटिएन।':'उपलब्ध सामग्री छैन। पाठ्यक्रममा भर्ना भएपछि पहुँच भएका सामग्री यहाँ देखिन्छन्।'} <Link to="/courses">पाठ्यक्रम हेर्नुहोस् →</Link></p>}</section></>;
}
