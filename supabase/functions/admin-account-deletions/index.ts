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
 if(pe||profile?.role!=='admin')return reply({error:'Admin access required'},403);
 const body=await req.json();
 if(body.action==='list'){
 const {data,error}=await admin.from('account_deletion_requests').select('id,user_id,status,requested_at,review_note').order('requested_at',{ascending:false}).limit(200);
 if(error)throw error;
 return reply({requests:data||[]});
 }
 if(!['review','reject','delete'].includes(body.action)||!body.request_id)return reply({error:'Invalid action'},400);
 const {data:item,error:findError}=await admin.from('account_deletion_requests').select('*').eq('id',body.request_id).single();
 if(findError||!item)return reply({error:'Request not found'},404);
 if(body.action==='review'){
 if(item.status!=='pending')return reply({error:'Request is not pending'},409);
 const {error}=await admin.from('account_deletion_requests').update({status:'in_review',review_note:String(body.note||'').slice(0,2000)}).eq('id',item.id).eq('status','pending');if(error)throw error;return reply({ok:true});
 }
 if(body.action==='reject'){
 if(!['pending','in_review'].includes(item.status))return reply({error:'Request already processed'},409);
 if(!String(body.note||'').trim())return reply({error:'Rejection reason required'},400);
 const {error}=await admin.from('account_deletion_requests').update({status:'rejected',review_note:String(body.note).slice(0,2000)}).eq('id',item.id);if(error)throw error;return reply({ok:true});
 }
 // Destructive deletion requires a separately verified data-retention and cascade policy.
 return reply({error:'Account deletion is not enabled until dependent data and payment retention are verified. Request remains in review.'},409);
 }catch(e){return reply({error:e instanceof Error?e.message:'Request failed'},500)}
});
