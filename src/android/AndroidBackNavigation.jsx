import {useEffect,useLayoutEffect,useRef} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Capacitor} from '@capacitor/core';
import {App as NativeApp} from '@capacitor/app';
import {useAuth} from '../contexts/AuthContext';
import {installAndroidBackHandler} from './backNavigation';

// Mounted outside App so Android Back is also handled before login.
export default function AndroidBackNavigation(){
 const location=useLocation(),navigate=useNavigate(),{user}=useAuth();
 const current=useRef({pathname:location.pathname,home:user?'/dashboard':'/login',navigate});
 useLayoutEffect(()=>{
  current.current={pathname:location.pathname,home:user?'/dashboard':'/login',navigate};
 },[location.pathname,navigate,user?.id]);
 useEffect(()=>{
  if(Capacitor.getPlatform()!=='android')return;
  return installAndroidBackHandler({
   app:NativeApp,
   getRoute:()=>current.current,
   navigate:(...args)=>current.current.navigate(...args),
   confirmExit:()=>window.confirm('Are you sure you want to exit PSC Taiyari?')
  });
 },[]);
 return null;
}
