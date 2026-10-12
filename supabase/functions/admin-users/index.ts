import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'Login required'},401);
  const url=Deno.env.get('SUPABASE_URL')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return reply({error:'Invalid session'},401);
  const {data:profile,error:profileError}=await admin.from('profiles').select('role').eq('id',user.id).single();
  if(profileError||profile?.role!=='admin')return reply({error:'Admin access required'},403);
  if(Number(req.headers.get('content-length')||0)>100000)return reply({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>100000)return reply({error:'Request too large'},413);
  const body=JSON.parse(raw);
  if(body.action==='list'){
   const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:200});if(error)throw error;
   return reply({users:data.users.map(u=>({id:u.id,email:u.email,full_name:u.user_metadata?.full_name,confirmed:!!u.email_confirmed_at,created_at:u.created_at}))});
  }
  if(body.action!=='create'||!Array.isArray(body.users)||body.users.length<1||body.users.length>20)return reply({error:'Provide 1 to 20 users'},400);
  const seen=new Set();
  for(const u of body.users){
   if(typeof u.email!=='string'||!/^\S+@\S+\.\S+$/.test(u.email)||typeof u.full_name!=='string'||!u.full_name.trim()||typeof u.password!=='string'||u.password.length<12)return reply({error:'Each user needs a valid email, full_name and password of at least 12 characters'},400);
   const email=u.email.trim().toLowerCase();if(seen.has(email))return reply({error:'Duplicate email in request'},400);seen.add(email);
  }
  const results=[];
  for(const u of body.users){
   const {data,error}=await admin.auth.admin.createUser({email:u.email.trim().toLowerCase(),password:u.password,email_confirm:true,user_metadata:{full_name:u.full_name.trim()}});
   results.push({email:u.email,success:!error,id:data.user?.id,error:error?.message});
  }
  return reply({results});
 }catch(e){return reply({error:e instanceof Error?e.message:'Request failed'},400);}
});
