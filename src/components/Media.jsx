import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
export function Resource({resource,onPosition,onComplete,resume=0}){
 const [url,setUrl]=useState(''),[docxHtml,setDocxHtml]=useState(''),[error,setError]=useState('');
 const kind=resource.material_type||resource.kind;
 useEffect(()=>{let active=true;setUrl('');setDocxHtml('');setError('');let timer;
 async function load(){try{
  // Rich text is stored directly in the database, so it has no Storage bucket/path.
  // Avoid calling Supabase Storage with null values.
  if(kind==='rich_text')return;
  if(resource.external_url){if(!resource.external_url.startsWith('https://'))throw Error('Invalid resource URL');if(active)setUrl(resource.external_url);return;}
  if(!resource.storage_bucket||!resource.storage_path)throw Error('सामग्रीको file location उपलब्ध छैन।');
 const {data,error}=await supabase.storage.from(resource.storage_bucket).createSignedUrl(resource.storage_path,3600);if(error)throw error;if(active)setUrl(data.signedUrl);
 }catch(e){if(active)setError(e.message);}}
 load();if(kind!=='rich_text')timer=setInterval(load,50*60*1000);return()=>{active=false;clearInterval(timer);};},[kind,resource.external_url,resource.storage_bucket,resource.storage_path]);
 useEffect(()=>{let active=true;if(kind!=='docx'||!url)return;import('mammoth').then(async({default:mammoth})=>{const response=await fetch(url);if(!response.ok)throw Error('DOCX file खोल्न सकेन।');const result=await mammoth.convertToHtml({arrayBuffer:await response.arrayBuffer()});if(active)setDocxHtml(result.value);}).catch(e=>active&&setError(e.message));return()=>{active=false};},[kind,url]);
 if(error)return <p role="alert">सामग्री खोल्न सकेन: {error}</p>;
 if(kind==='rich_text')return <div className="lesson-notes">{resource.content_html}</div>;
 if(!url)return <p role="status">Loading media…</p>;
 if(kind==='image')return <img className="learning-image" src={url} alt={resource.alt_text||resource.title_ne||resource.title||'Learning material'}/>;
 if(kind==='pdf')return <iframe className="learning-document" title={resource.title_ne||resource.title||'PDF'} src={url}/>;
 if(kind==='docx')return docxHtml?<div className="docx-content" dangerouslySetInnerHTML={{__html:docxHtml}}/>:<p role="status">DOCX तयार हुँदैछ…</p>;
 if(['video','audio'].includes(kind)){const Tag=kind;return <Tag className="learning-player" controls src={url} onLoadedMetadata={e=>{if(resume>0)e.currentTarget.currentTime=Math.min(resume,e.currentTarget.duration||resume);}} onTimeUpdate={e=>onPosition?.(Math.floor(e.currentTarget.currentTime))} onEnded={onComplete}/>;}
 return <a className="btn ghost" href={url} target="_blank" rel="noopener noreferrer">{resource.title||'सामग्री खोल्नुहोस्'} ↗</a>;
}
export default function Media({items=[]}){return <>{items.map((r,i)=><Resource key={`${r.storage_path}:${i}`} resource={r}/>)}</>;}
