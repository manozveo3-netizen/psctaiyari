import {useEffect,useState} from 'react';
import {useParams,Link} from 'react-router-dom';
import {supabase} from '../lib/supabase';
export default function Result(){
 const {id}=useParams();
 const [state,setState]=useState({id:null,loading:true,attempt:null,error:''});
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  setState({id,loading:true,attempt:null,error:''});
  (async()=>{
   try{
    const {data,error}=await supabase.from('attempts').select('*,tests(title)').eq('id',id).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error('Result not found or you do not have access to it.');
    if(active)setState({id,loading:false,attempt:data,error:''});
   }catch(error){
    if(active)setState({id,loading:false,attempt:null,error:error.message||'Unable to load your result.'});
   }
  })();
  return()=>{active=false;};
 },[id,retry]);
 if(state.id!==id||state.loading)return <div role="status">Loading result…</div>;
 if(state.error)return <div className="card" role="alert"><p>{state.error}</p><button className="btn" onClick={()=>setRetry(n=>n+1)}>Retry</button> <Link to="/tests">Back to tests</Link></div>;
 const a=state.attempt;
 if(a.status!=='completed')return <div className="card"><p>This test has not been submitted yet.</p><Link className="btn" to={`/test/${a.test_id}`}>Back to test</Link></div>;
 return <div className="result card"><p className="eyebrow">Result</p><h1>{a.tests?.title}</h1><div className="bigscore">{a.percentage}%</div><div className="grid4"><Mini n={a.correct_answers} t="Correct"/><Mini n={a.wrong_answers} t="Wrong"/><Mini n={a.skipped_answers} t="Skipped"/><Mini n={a.total_questions} t="Questions"/></div><Link className="btn" to="/tests">Practice Again</Link></div>;
}
function Mini({n,t}){return <div className="stat"><strong>{n}</strong><span>{t}</span></div>;}
