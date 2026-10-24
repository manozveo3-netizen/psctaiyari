import {useEffect,useLayoutEffect,useRef} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Capacitor} from '@capacitor/core';
import {App as NativeApp} from '@capacitor/app';
import {useAuth} from '../contexts/AuthContext';
import {installAndroidBackHandler} from './backNavigation';

// Mounted outside App so Back is handled during its welcome splash as well.
export default function AndroidBackNavigation(){
 const location=useLocation(),navigate=useNavigate(),{user}=useAuth();
 const current=useRef({pathname:location.pathname,home:user?'/dashboard':'/',navigate});
 useLayoutEffect(()=>{
  current.current={pathname:location.pathname,home:user?'/dashboard':'/',navigate};
 },[location.pathname,navigate,user?.id]);
 useEffect(()=>{
  if(Capacitor.getPlatform()!=='android')return;
  return installAndroidBackHandler({
   app:NativeApp,
   getRoute:()=>current.current,
   navigate:(...args)=>current.current.navigate(...args)
  });
 },[]);
 return null;
}
