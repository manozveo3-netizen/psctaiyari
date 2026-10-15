import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
export function Resource({resource,onPosition,onComplete,resume=0}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;setUrl('');setError('');let timer;
 async function load(){try{if(resource.external_url){if(!resource.external_url.startsWith('https://'))throw Error('Invalid resource URL');if(active)setUrl(resource.external_url);return;}
 const {data,error}=await supabase.storage.from(resource.storage_bucket).createSignedUrl(resource.storage_path,3600);if(error)throw error;if(active)setUrl(data.signedUrl);
 }catch(e){if(active)setError(e.message);}}
 load();timer=setInterval(load,50*60*1000);return()=>{active=false;clearInterval(timer);};},[resource.external_url,resource.storage_bucket,resource.storage_path]);
 if(error)return <p role="alert">सामग्री खोल्न सकेन: {error}</p>;if(!url)return <p role="status">Loading media…</p>;
 if(resource.kind==='image')return <img className="learning-image" src={url} alt={resource.alt_text||resource.title||'Question illustration'}/>;
 if(['video','audio'].includes(resource.kind)){const Tag=resource.kind;return <Tag className="learning-player" controls src={url} onLoadedMetadata={e=>{if(resume>0)e.currentTarget.currentTime=Math.min(resume,e.currentTarget.duration||resume);}} onTimeUpdate={e=>onPosition?.(Math.floor(e.currentTarget.currentTime))} onEnded={onComplete}/>;}
 return <a className="btn ghost" href={url} target="_blank" rel="noopener noreferrer">{resource.title||'सामग्री खोल्नुहोस्'} ↗</a>;
}
export default function Media({items=[]}){return <>{items.map((r,i)=><Resource key={`${r.storage_path}:${i}`} resource={r}/>)}</>;}
