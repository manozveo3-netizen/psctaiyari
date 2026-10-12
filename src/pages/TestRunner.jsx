import {useEffect,useRef,useState} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
export default function TestRunner(){
 const {id}=useParams(),nav=useNavigate(),{user}=useAuth();
 const [test,setTest]=useState(null),[index,setIndex]=useState(0),[answers,setAnswers]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[seconds,setSeconds]=useState(0);
 const lock=useRef(false),answersRef=useRef({}),autoAttempt=useRef(null);
 const key=`quiz:${user.id}:${id}`;
 useEffect(()=>{let active=true;setTest(null);setError('');setIndex(0);autoAttempt.current=null;
 (async()=>{try{const {data,error}=await supabase.rpc('start_quiz',{p_test_id:id});if(error)throw error;if(!active)return;
 let saved={};try{const draft=JSON.parse(localStorage.getItem(key));if(draft?.attempt_id===data.attempt_id)saved=draft.answers||{};}catch{}
 answersRef.current=saved;setAnswers(saved);setTest(data);
 }catch(e){if(active)setError(e.message);}})();return()=>{active=false;};},[id,key]);
 async function finish(){if(lock.current||!test)return;lock.current=true;setBusy(true);setError('');
 try{const {data,error}=await supabase.rpc('submit_quiz',{p_attempt_id:test.attempt_id,p_answers:answersRef.current});if(error)throw error;try{localStorage.removeItem(key);}catch{}nav(`/result/${data}`);
 }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}}
 useEffect(()=>{if(!test)return;const tick=()=>{const n=Math.max(0,Math.ceil((Date.parse(test.deadline)-Date.now())/1000));setSeconds(n);if(n===0&&autoAttempt.current!==test.attempt_id){autoAttempt.current=test.attempt_id;finish();}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[test]);
 function choose(qid,oid){const next={...answersRef.current,[qid]:oid};answersRef.current=next;setAnswers(next);try{localStorage.setItem(key,JSON.stringify({attempt_id:test.attempt_id,answers:next}));}catch{setError('Your browser cannot save progress. Keep this tab open.');}}
 if(!test)return <div className="card" role="status">{error||'Loading test…'}</div>;
 const qs=test.questions,q=qs[Math.min(index,qs.length-1)];
 return <div className="test"><div className="testtop"><b>{test.title}</b><span>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} · {index+1}/{qs.length}</span></div>{error&&<p className="notice" role="alert">{error}</p>}<div className="card question"><h2>{q.question_text}</h2><div className="options">{q.question_options.map(o=><button key={o.id} disabled={busy||seconds===0} className={answers[q.id]===o.id?'selected':''} onClick={()=>choose(q.id,o.id)}><b>{o.option_key}</b>{o.option_text}</button>)}</div><div className="actions"><button className="btn ghost" disabled={busy||index===0} onClick={()=>setIndex(index-1)}>Previous</button>{index<qs.length-1&&<button className="btn" disabled={busy} onClick={()=>setIndex(index+1)}>Next</button>}<button className="btn" disabled={busy} onClick={finish}>{busy?'Submitting…':'Submit Test'}</button></div></div></div>;
}
