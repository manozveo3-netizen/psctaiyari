import {restoreAnswers} from '../lib/quiz';
import {useEffect,useRef,useState} from 'react';
import {useParams,useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {useAuth} from '../contexts/AuthContext';
import Media from '../components/Media';
export default function TestRunner(){
 const {id}=useParams(),nav=useNavigate(),{user}=useAuth();
 const [test,setTest]=useState(null),[index,setIndex]=useState(0),[answers,setAnswers]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[seconds,setSeconds]=useState(0),[sync,setSync]=useState('');
 const lock=useRef(false),answersRef=useRef({}),autoAttempt=useRef(null),chain=useRef(Promise.resolve()),dirty=useRef(false),active=useRef(true);
 const key=`quiz:${user.id}:${id}`;
 useEffect(()=>{active.current=true;let alive=true;setTest(null);setError('');setIndex(0);autoAttempt.current=null;lock.current=false;dirty.current=false;
 (async()=>{try{const {data,error}=await supabase.rpc('start_quiz',{p_test_id:id});if(error)throw error;if(!alive)return;
 let draft;try{draft=JSON.parse(localStorage.getItem(key));}catch{}
 const saved=restoreAnswers(data.saved_answers,draft,data.attempt_id,data.saved_at);answersRef.current=saved;setAnswers(saved);setTest(data);dirty.current=JSON.stringify(saved)!==JSON.stringify(data.saved_answers||{});
 }catch(e){if(alive)setError(e.message);}})();return()=>{alive=false;active.current=false;};},[id,key]);
 function persist(){if(!test||lock.current||!dirty.current)return;const snapshot={...answersRef.current};dirty.current=false;setSync('Saving…');
 chain.current=chain.current.catch(()=>{}).then(async()=>{const {error}=await supabase.rpc('save_quiz_answers',{p_attempt_id:test.attempt_id,p_answers:snapshot});if(error)throw error;}).then(()=>{if(active.current)setSync('उत्तर server मा सुरक्षित भयो।');}).catch(e=>{dirty.current=true;if(active.current)setSync(`Server save भएन: ${e.message}। फेरि प्रयास हुँदैछ; यही browser मा उत्तर सुरक्षित छन्।`);});
 }
 async function finish(){if(lock.current||!test)return;lock.current=true;setBusy(true);setError('');
 try{await chain.current.catch(()=>{});const {data,error}=await supabase.rpc('submit_quiz',{p_attempt_id:test.attempt_id,p_answers:answersRef.current});if(error)throw error;try{localStorage.removeItem(key);}catch{}nav(`/result/${data}`);
 }catch(e){setError(e.message);}finally{lock.current=false;if(active.current)setBusy(false);}}
 useEffect(()=>{if(!test)return;const tick=()=>{const n=Math.max(0,Math.ceil((Date.parse(test.deadline)-Date.now())/1000));setSeconds(n);if(n===0&&autoAttempt.current!==test.attempt_id){autoAttempt.current=test.attempt_id;finish();}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[test]);
 useEffect(()=>{if(!test)return;const timer=setInterval(persist,5000);const online=()=>persist();window.addEventListener('online',online);return()=>{clearInterval(timer);window.removeEventListener('online',online);};},[test]);
 function choose(qid,oid){const next={...answersRef.current,[qid]:oid};answersRef.current=next;setAnswers(next);dirty.current=true;setSync('यो browser मा सुरक्षित; server sync हुँदैछ…');try{localStorage.setItem(key,JSON.stringify({attempt_id:test.attempt_id,answers:next,saved_at:Date.now()}));}catch{setError('Browser save उपलब्ध छैन। Internet जोडिएको राख्नुहोस्।');}}
 if(!test)return <div className="card" role="status">{error||'Loading test…'}</div>;
 const qs=test.questions,q=qs[Math.min(index,qs.length-1)];if(!q)return <p role="alert">यो परीक्षामा प्रश्न उपलब्ध छैन।</p>;
 return <div className="test"><div className="testtop"><b>{test.title}</b><span aria-live="off">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} · {index+1}/{qs.length}</span></div><p role="status">{sync}</p>{error&&<p className="notice" role="alert">{error}</p>}<nav className="question-palette" aria-label="प्रश्नमा जानुहोस्">{qs.map((x,i)=><button key={x.id} aria-label={`प्रश्न ${i+1}${answers[x.id]?' उत्तर दिइएको':''}`} aria-current={i===index?'step':undefined} className={answers[x.id]?'answered':''} onClick={()=>setIndex(i)}>{i+1}</button>)}</nav><div className="card question"><small>प्रश्न {index+1} · {q.marks} अंक</small><h2>{q.question_text}</h2><Media items={q.media}/><div className="options">{q.question_options.map(o=><button key={o.id} disabled={busy||seconds===0} aria-pressed={answers[q.id]===o.id} className={answers[q.id]===o.id?'selected':''} onClick={()=>choose(q.id,o.id)}><b>{o.option_key}</b><span>{o.option_text}<Media items={o.media}/></span></button>)}</div><div className="actions"><button className="btn ghost" disabled={busy||index===0} onClick={()=>setIndex(index-1)}>Previous</button>{index<qs.length-1&&<button className="btn" disabled={busy} onClick={()=>setIndex(index+1)}>Next</button>}<button className="btn" disabled={busy} onClick={finish}>{busy?'Submitting…':'Submit Test'}</button></div><p>{Object.values(answers).filter(Boolean).length}/{qs.length} प्रश्नको उत्तर दिइएको।</p></div></div>;
}
