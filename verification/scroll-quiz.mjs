import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=new URL('./scroll-quiz-bundle.mjs',import.meta.url).pathname;
await build({entryPoints:['src/pages/TestRunner.jsx'],bundle:true,platform:'node',format:'esm',outfile:output,jsx:'automatic',packages:'external',plugins:[{name:'quiz-ui-fixtures',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'fixture'}));
 b.onResolve({filter:/contexts\/AuthContext|lib\/supabase|components\/Media|^react-router-dom$/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',resolveDir:process.cwd(),contents:path==='react'?`export const useEffect=()=>{};export function useState(initial){const i=globalThis.quizHarness.stateIndex++;if(!(i in globalThis.quizHarness.state))globalThis.quizHarness.state[i]=initial;return [globalThis.quizHarness.state[i],v=>globalThis.quizHarness.state[i]=v]};export function useRef(initial){const i=globalThis.quizHarness.refIndex++;return globalThis.quizHarness.refs[i]??=( {current:initial} )}`:path.includes('AuthContext')?`export const useAuth=()=>({user:{id:'student'}});`:path.includes('supabase')?`export const supabase={rpc:async(name,args)=>{globalThis.quizHarness.calls.push({name,args});return {data:'result-id',error:null}}};`:path.includes('Media')?`export default function Media(){return null;}`:`export const useParams=()=>({id:'test-id'});export const useNavigate=()=>url=>globalThis.quizHarness.navigation=url;`}));
}}]});
try{
 const {default:TestRunner}=await import(output);
 const questions=Array.from({length:50},(_,i)=>({id:`q${i}`,marks:2,question_text:`Question ${i+1}`,media:[],question_options:[{id:`q${i}a`,option_key:'A',option_text:'Option A',media:[]},{id:`q${i}b`,option_key:'B',option_text:'Option B',media:[]}]}));
 globalThis.quizHarness={state:[{title:'Full mock',attempt_id:'attempt',questions},{},false,'',600,'',false],refs:[],calls:[]};
 const saved=new Map();globalThis.localStorage={setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 function render(){quizHarness.stateIndex=0;quizHarness.refIndex=0;return TestRunner();}
 function collect(node,predicate,result=[]){if(!node||typeof node!=='object')return result;if(predicate(node))result.push(node);const children=node.props?.children;for(const child of Array.isArray(children)?children:[children]){if(Array.isArray(child))child.forEach(n=>collect(n,predicate,result));else collect(child,predicate,result);}return result;}
 let tree=render();assert.equal(collect(tree,n=>n.props?.className==='card question').length,50);
 let options=collect(tree,n=>n.type==='button'&&n.props['aria-pressed']!==undefined);
 options[0].props.onClick();options[99].props.onClick();
 tree=render();assert.equal(collect(tree,n=>n.type==='button'&&n.props['aria-pressed']===true).length,2);
 assert.equal(JSON.parse([...saved.values()][0]).answers.q49,'q49b');
 const submitPanel=()=>collect(tree,n=>n.props?.className==='card submit-panel')[0];
 collect(submitPanel(),n=>n.type==='button')[0].props.onClick();tree=render();
 let buttons=collect(submitPanel(),n=>n.type==='button');assert.equal(buttons.length,2);assert.equal(quizHarness.calls.length,0);
 await buttons[1].props.onClick();
 assert.deepEqual(quizHarness.calls[0],{name:'submit_quiz',args:{p_attempt_id:'attempt',p_answers:{q0:'q0a',q49:'q49b'}}});
 assert.equal(quizHarness.navigation,'/result/result-id');assert.equal(saved.size,0);
 quizHarness.state[4]=0;tree=render();assert.ok(collect(tree,n=>n.type==='button'&&n.props['aria-pressed']!==undefined).every(n=>n.props.disabled));
 console.log('PASS: 50 scroll questions, first/last selection, local draft, explicit confirmation, server submission, and expired-answer lock');
}finally{await unlink(output);delete globalThis.quizHarness;delete globalThis.localStorage;}
