import {build} from 'esbuild';
import {writeFile,unlink} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
const output=new URL('./guard-bundle.mjs',import.meta.url).pathname;
await build({entryPoints:['src/components/Guard.jsx'],bundle:true,platform:'node',format:'esm',outfile:output,jsx:'automatic',packages:'external',plugins:[{name:'auth-test',setup(b){
 b.onResolve({filter:/contexts\/AuthContext/},()=>({path:'auth',namespace:'mock'}));
 b.onResolve({filter:/^react-router-dom$/},()=>({path:'router',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='auth'?'export const useAuth=()=>globalThis.authState;':`import React from 'react';export const useLocation=()=>({pathname:'/admin/payments',search:'?page=2'});export const Navigate=({to,state})=>React.createElement('span',{'data-to':to,'data-from':state?.from});`,loader:'js',resolveDir:process.cwd()}));
}}]});
try{
 const {Guard}=await import(output);
 const render=(state,props={})=>{globalThis.authState={loading:false,error:'',refreshProfile:()=>{},...state};return renderToStaticMarkup(React.createElement(Guard,props,'Protected content'));};
 assert.match(render({loading:true}),/Loading/);
 assert.match(render({user:null}),/data-to="\/login" data-from="\/admin\/payments\?page=2"/);
 assert.match(render({user:{id:'a'},error:'Database offline'}),/Unable to load your profile/);
 assert.match(render({user:{id:'a'},profile:{role:'student'}}),/Protected content/);
 assert.match(render({user:{id:'a'},profile:{role:'student'}},{admin:true}),/data-to="\/dashboard"/);
 assert.match(render({user:{id:'a'},profile:{role:'reviewer'}},{admin:true}),/Protected content/);
 assert.match(render({user:{id:'a'},profile:{role:'reviewer'}},{roles:['admin']}),/data-to="\/dashboard"/);
 assert.match(render({user:{id:'a'},profile:{role:'admin'}},{roles:['admin']}),/Protected content/);
 console.log('PASS: 8 guard checks (loading, signed out return URL, error, student, reviewer, admin)');
}finally{await unlink(output);delete globalThis.authState;}
