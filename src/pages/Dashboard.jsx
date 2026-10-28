import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronLeft,ChevronRight,ClipboardCheck} from 'lucide-react';
import '../diary-dashboard.css';

const TOTAL_PAGES=7;
const dayLabel=day=>`दिन ${day}`;

export default function Dashboard(){
  const {profile,user}=useAuth();
  const [attempts,setAttempts]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [page,setPage]=useState(1);
  const completedDays=useMemo(()=>Math.min(TOTAL_PAGES,new Set(attempts.map(a=>new Date(a.started_at).toDateString())).size),[attempts]);
  const displayName=(profile?.full_name||'विद्यार्थी').split(' ')[0];const initials=(profile?.full_name||'वि').split(' ').map(x=>x[0]).join('').slice(0,2);
  useEffect(()=>{let alive=true;if(!user)return;setLoading(true);setError('');supabase.from('attempts').select('started_at').eq('user_id',user.id).eq('status','completed').order('started_at',{ascending:false}).limit(100).then(({data,error})=>{if(error)throw error;if(alive)setAttempts(data||[]);}).catch(e=>alive&&setError(e.message)).finally(()=>alive&&setLoading(false));return()=>{alive=false;};},[user]);
  useEffect(()=>{if(!loading)setPage(Math.min(TOTAL_PAGES,Math.max(1,completedDays+1)));},[loading,completedDays]);
  const isToday=page===Math.min(TOTAL_PAGES,completedDays+1);const completed=page<=completedDays;
  return <div className="student-dashboard diary-dashboard">
    <header className="student-dash-head diary-dash-head"><div><p className="diary-crumb">मेरो पढाइ / घर</p><h1>नमस्ते, {displayName} 👋</h1><p>एक-एक पाना पूरा गर्दै आफ्नो तयारी अगाडि बढाउनुहोस्।</p></div><div className="student-profile"><Link to="/progress" className="progress-link">मेरो प्रगति</Link><span className="student-avatar">{initials}</span></div></header>
    {error&&<p className="notice" role="alert">तयारीको विवरण लोड हुन सकेन। कृपया फेरि प्रयास गर्नुहोस्।</p>}
    <main className="diary-page" aria-label="आजको पढाइ"><section className="diary-lesson"><div className="diary-title"><span className="diary-sun" aria-hidden="true">☀</span><div><div className="diary-heading-row"><h2>{isToday?'आजको पाना':'पढाइको पाना'}</h2><span>{dayLabel(page)}</span></div><p>{completed?'यो पाना पूरा भयो। फेरि हेर्न चाहनुहुन्छ भने खोल्नुहोस्।':'आज एउटा पाठ पढ्नुहोस् र त्यसपछि छोटो Quiz बाट अभ्यास गर्नुहोस्।'}</p></div></div><div className="diary-course"><span className="diary-book"><BookOpen size={30}/></span><div><small>आजको पढाइ</small><h3>मेरो पाठ्यक्रम</h3><p>आफ्नो enrolled course बाट आजको पाठ छानेर पढ्नुहोस्।</p></div></div><Link className="diary-start" to="/courses">{completed?'फेरि पढ्नुहोस्':'पढ्न सुरु गर्नुहोस्'} <ArrowRight size={20}/></Link></section><aside className="diary-goals"><div className="diary-goals-title"><ClipboardCheck size={27}/><h2>आजको लक्ष्य</h2></div><Goal done={completedDays>0} text="एउटा पाठ खोल्नुहोस्"/><Goal done={completed} text="पाठको मुख्य कुरा बुझ्नुहोस्"/><Goal done={false} text="छोटो Quiz बाट अभ्यास गर्नुहोस्"/><Link to="/quizzes" className="diary-quiz-link">Quiz खोल्नुहोस् <ArrowRight size={15}/></Link></aside></main>
    <nav className="diary-pagination" aria-label="पढाइका पाना"><button type="button" className="page-arrow" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} aria-label="अघिल्लो पाना"><ChevronLeft/></button><div className="page-tabs">{Array.from({length:TOTAL_PAGES},(_,index)=>{const day=index+1;const done=day<=completedDays;return <button type="button" key={day} onClick={()=>setPage(day)} className={day===page?'active':done?'done':''}>{dayLabel(day)}{done&&<Check size={14}/>}</button>;})}</div><button type="button" className="page-arrow" onClick={()=>setPage(p=>Math.min(TOTAL_PAGES,p+1))} disabled={page===TOTAL_PAGES} aria-label="अर्को पाना"><ChevronRight/></button><span className="previous-page"><ArrowLeft size={13}/> अघिल्लो पाना</span><span className="next-page">अर्को पाना <ArrowRight size={13}/></span></nav>
  </div>;
}
function Goal({done,text}){return <div className={`diary-goal-item ${done?'done':''}`}><span>{done?<Check size={15}/>:null}</span><p>{text}</p></div>;}