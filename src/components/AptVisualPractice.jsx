import {createClient} from '@supabase/supabase-js';
import {useEffect,useState} from 'react';

const aptClient=createClient(
  'https://blxzndusavssxbhcaxkn.supabase.co',
  'sb_publishable_oeCNHWrekh9sDEQxUPBEuA_oWKAGwVO'
);

export default function AptVisualPractice(){
  const [items,setItems]=useState([]);
  const [answers,setAnswers]=useState({});
  const [index,setIndex]=useState(0);
  const [submitted,setSubmitted]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{let active=true;
    (async()=>{
      const {data,error:loadError}=await aptClient
        .from('apttest_mcqs')
        .select('id,question_number,question_text,image_bucket,image_path,correct_option,explanation')
        .eq('is_published',true)
        .eq('topic','तार्किक चित्रात्मक विश्लेषण')
        .order('question_number');
      if(loadError){if(active)setError('चित्रात्मक प्रश्न load भएन।');return}
      const hydrated=await Promise.all((data||[]).map(async item=>{
        const {data:signed}=await aptClient.storage.from(item.image_bucket).createSignedUrl(item.image_path,3600);
        return {...item,image_url:signed?.signedUrl||''};
      }));
      if(active)setItems(hydrated);
    })();
    return()=>{active=false};
  },[]);

  const q=items[index];
  const answered=Object.keys(answers).length;
  const score=items.reduce((n,item)=>n+(answers[item.id]===item.correct_option?1:0),0);

  if(!items.length)return <section className="card"><h2>तार्किक चित्रात्मक विश्लेषण</h2><p className="muted">{error||'चित्रात्मक MCQ तयार हुँदैछ…'}</p></section>;

  return <section className="card quiz-practice">
    <div className="section-heading"><div><p className="eyebrow">चित्रात्मक अभ्यास</p><h2>तार्किक चित्रात्मक विश्लेषण</h2></div><span>{answered}/{items.length} उत्तर</span></div>
    <article className="question">
      <small>प्रश्न {index+1} / {items.length}</small>
      <h2>{q.question_text}</h2>
      {q.image_url?<img className="question-media" src={q.image_url} alt={'चित्रात्मक प्रश्न '+q.question_number} loading="eager"/>:<p className="notice">चित्र load भएन।</p>}
      <div className="options">{['A','B','C','D'].map(option=>{
        const isSelected=answers[q.id]===option;
        const className=submitted?(option===q.correct_option?'correct':isSelected?'wrong':''):isSelected?'selected':'';
        return <button key={option} className={className} disabled={submitted} onClick={()=>setAnswers(x=>({...x,[q.id]:option}))}><b>{option}</b><span>विकल्प {option}</span></button>;
      })}</div>
      {submitted&&<p className="quiz-explanation"><b>व्याख्या:</b> {q.explanation}</p>}
    </article>
    <div className="actions">
      <button className="btn ghost" disabled={index===0} onClick={()=>setIndex(x=>x-1)}>← अघिल्लो</button>
      {index<items.length-1?<button className="btn" onClick={()=>setIndex(x=>x+1)}>अर्को →</button>:<button className="btn" disabled={submitted||answered!==items.length} onClick={()=>setSubmitted(true)}>उत्तर जाँच्नुहोस्</button>}
    </div>
    {submitted&&<section className="quiz-score"><h2>तपाईंको अंक: {score}/{items.length}</h2><p>सही {score} · गलत {items.length-score}</p></section>}
  </section>;
}
