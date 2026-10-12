import { createClient } from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const configurationError=!url||!key?'Missing Supabase configuration. Copy .env.example to .env.local and set the project URL and publishable key.':''
export const supabase=configurationError?null:createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
