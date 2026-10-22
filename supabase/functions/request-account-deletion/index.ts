import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'Login required'},401);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await admin.auth.getUser(token);
 if(authError||!user)return reply({error:'Invalid session'},401);
 const {data:profile,error:pe}=await admin.from('profiles').select('role').eq('id',user.id).single();
 if(pe||profile?.role!=='student')return reply({error:'Only student accounts can request deletion'},403);
 const {data:existing,error:lookupError}=await admin.from('account_deletion_requests').select('id,status').eq('user_id',user.id).in('status',['pending','in_review']).limit(1);
 if(lookupError)throw lookupError;
 if(existing?.length)return reply({ok:true,already_requested:true});
 const {error}=await admin.from('account_deletion_requests').insert({user_id:user.id,status:'pending'});
 if(error)throw error;
 return reply({ok:true});
 }catch(e){return reply({error:e instanceof Error?e.message:'Request failed'},500)}
});
