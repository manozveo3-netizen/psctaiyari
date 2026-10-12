import { createClient } from '@supabase/supabase-js'
import {validateConfiguration} from './config'
const url=import.meta.env.VITE_SUPABASE_URL
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const configurationError=validateConfiguration(url,key)
export const supabase=configurationError?null:createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
