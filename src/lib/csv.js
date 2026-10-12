export function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 const pushCell=()=>{row.push(cell.trim());cell='';closed=false;};
 const pushRow=()=>{pushCell();if(row.some(x=>x!==''))rows.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('Unexpected quote in CSV.');quoted=true;}
  else if(c===',')pushCell();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();}
  else{if(closed&&!/\s/.test(c))throw Error('Unexpected text after CSV quote.');if(!closed)cell+=c;}
 }
 if(quoted)throw Error('Unclosed CSV quote.');if(cell||row.length||closed)pushRow();
 if(rows.length<2)throw Error('CSV needs a header and at least one data row.');
 const headers=rows.shift();if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error('CSV headers must be nonempty and unique.');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Row ${i+2}: expected ${headers.length} columns, found ${r.length}.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
export function validateQuestions(rows,levels,subjects,topics){
 if(rows.length>500)throw Error('Maximum 500 questions per file.');
 const required=['exam_level_code','subject_code','question_text','option_a','option_b','option_c','option_d','correct_option'];
 const seen=new Set();return rows.map((r,i)=>{
  const fail=m=>{throw Error(`Row ${i+2}: ${m}`);};
  for(const k of required)if(!r[k])fail(`Missing ${k}.`);
  const level=levels.find(x=>x.code===r.exam_level_code),subject=subjects.find(x=>x.code===r.subject_code);
  if(!level)fail('Unknown exam_level_code.');if(!subject)fail('Unknown subject_code.');
  const topic=r.topic_id?topics.find(x=>x.id===r.topic_id&&x.subject_id===subject.id):null;if(r.topic_id&&!topic)fail('Topic must belong to the selected subject.');
  const correct=r.correct_option.toUpperCase();if(!'ABCD'.split('').includes(correct))fail('correct_option must be A, B, C or D.');
  const difficulty=r.difficulty||'medium';if(!['easy','medium','hard'].includes(difficulty))fail('Invalid difficulty.');
  const marks=r.marks?Number(r.marks):1;if(!Number.isFinite(marks)||marks<=0||marks>100)fail('marks must be greater than 0 and at most 100.');
  const signature=[level.id,subject.id,r.question_text.trim().toLowerCase()].join('|');if(seen.has(signature))return null;seen.add(signature);
  return {exam_level_id:level.id,subject_id:subject.id,topic_id:topic?.id||null,question_text:r.question_text,options:['a','b','c','d'].map(k=>r['option_'+k]),correct_option:correct,difficulty,explanation:r.explanation||null,source_name:r.source_name||null,source_url:r.source_url||null,marks};
 }).filter(Boolean);
}
export function validateUsers(rows){
 if(rows.length>20)throw Error('Maximum 20 users per upload.');const seen=new Set();
 return rows.map((r,i)=>{const fail=m=>{throw Error(`Row ${i+2}: ${m}`);};const email=r.email?.toLowerCase();if(!email||!/^\S+@\S+\.\S+$/.test(email))fail('Invalid email.');if(!r.full_name)fail('Missing full_name.');if(!r.password||r.password.length<12)fail('Password needs at least 12 characters.');if(seen.has(email))fail('Duplicate email.');seen.add(email);return {email,password:r.password,full_name:r.full_name};});
}
