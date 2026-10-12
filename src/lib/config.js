export function validateConfiguration(url,key){
 if(!url||!key)return 'Missing Supabase configuration. Set .env.local and rebuild the website.';
 try{const parsed=new URL(url);if(parsed.protocol!=='https:')return 'Supabase URL must use HTTPS.';}catch{return 'Invalid Supabase URL. Check .env.local and rebuild.';}
 if(/PASTE_|YOUR_|PLACEHOLDER/i.test(key))return 'Replace the placeholder API key in .env.local and rebuild.';
 if(key.startsWith('sb_secret_'))return 'A secret key cannot be used in the browser. Use a publishable key.';
 if(!key.startsWith('sb_publishable_')){
  try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')return 'Use a publishable or anon key, never a service-role key.';}catch{return 'Invalid API key format. Use your project publishable key and rebuild.';}
 }
 return '';
}
