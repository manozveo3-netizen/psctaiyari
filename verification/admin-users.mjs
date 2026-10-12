import {build} from 'esbuild';import {unlink} from 'node:fs/promises';import assert from 'node:assert/strict';
let handler;globalThis.Deno={env:{get:()=> 'test-only'},serve:h=>{handler=h;}};globalThis.testRole='admin';globalThis.created=[];
const out=new URL('./edge-bundle.mjs',import.meta.url).pathname;
await build({entryPoints:['supabase/functions/admin-users/index.ts'],outfile:out,bundle:true,platform:'node',format:'esm',plugins:[{name:'mock-sdk',setup(b){b.onResolve({filter:/^npm:/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({loader:'js',contents:`export const createClient=()=>({auth:{getUser:async token=>({data:{user:token==='valid'?{id:'admin'}:null},error:null}),admin:{listUsers:async()=>({data:{users:[{id:'student',email:'student@example.com',user_metadata:{full_name:'Student'},email_confirmed_at:'today',created_at:'today',encrypted_password:'MUST_NOT_LEAK'}]}}),createUser:async args=>{globalThis.created.push(args);return {data:{user:{id:'new'}},error:null};}}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:globalThis.testRole},error:null})})})})});`}));}}]});
try{
 await import(out);const request=async(body,token='valid')=>handler(new Request('https://example.com',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)}));
 assert.equal((await request({action:'list'},'')).status,401);
 assert.equal((await request({action:'list'},'bad')).status,401);
 globalThis.testRole='student';assert.equal((await request({action:'list'})).status,403);
 globalThis.testRole='admin';const list=await (await request({action:'list'})).json();assert.equal(list.users[0].encrypted_password,undefined);
 assert.equal((await request({action:'create',users:[{email:'bad',full_name:'X',password:'short'}]})).status,400);
 const u={email:'x@example.com',full_name:'Demo',password:'Strong-Demo-1234',role:'admin'};
 assert.equal((await request({action:'create',users:[u,u]})).status,400);
 const response=await (await request({action:'create',users:[u]})).json();assert.equal(response.results[0].success,true);assert.deepEqual(globalThis.created[0].user_metadata,{full_name:'Demo'});assert.equal(globalThis.created[0].email_confirm,true);assert.equal(JSON.stringify(response).includes(u.password),false);
 console.log('PASS: admin user endpoint auth, role, validation, duplicate, metadata and credential privacy checks');
}finally{await unlink(out);delete globalThis.Deno;}
