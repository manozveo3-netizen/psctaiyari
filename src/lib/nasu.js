export const NASU_QUOTAS={'1.1':1,'1.2':2,'1.3':4,'1.4':1,'1.5':2,'1.6':4,'1.7':3,'1.8':3,'1.9':3,'1.10':2,'1.11':5,'2.1':6,'2.2':8,'2.3':6};
export function inspectNasuSet(questions,units){
 const byTopic=new Map(units.filter(u=>u.topic_id).map(u=>[u.topic_id,u.syllabus_code]));
 const counts={},levels={1:0,2:0};let unmapped=0;
 for(const q of questions){const unit=byTopic.get(q.topic_id);if(!NASU_QUOTAS[unit]){unmapped++;continue;}counts[unit]=(counts[unit]||0)+1;if(unit.startsWith('1.'))levels[q.question_level]=(levels[q.question_level]||0)+1;}
 const errors=[];if(questions.length!==50)errors.push(`५० प्रश्न चाहिन्छ; अहिले ${questions.length} छन्।`);
 for(const [unit,n] of Object.entries(NASU_QUOTAS))if((counts[unit]||0)!==n)errors.push(`एकाइ ${unit}: ${counts[unit]||0}/${n}`);
 if(unmapped)errors.push(`${unmapped} प्रश्नको syllabus unit mapping छैन।`);
 if(levels[1]!==18||levels[2]!==12)errors.push(`GK Level I: ${levels[1]}/18; Level II: ${levels[2]}/12`);
 return {counts,levels,errors,valid:errors.length===0};
}
