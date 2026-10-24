// Use router history only when it belongs to this app session. A deep link or
// reloaded inner page may have no previous entry; return home instead of exiting.
export function installAndroidBackHandler({app,getRoute,navigate,getHistoryState=()=>window.history.state,onError=console.error}){
 let active=true;
 const listener=app.addListener('backButton',({canGoBack})=>{
  if(!active)return;
  const {pathname,home}=getRoute();
  const path=pathname.replace(/\/+$/,'')||'/';
  if(path==='/'||path===home){
   app.exitApp().catch(onError);
   return;
  }
  const index=getHistoryState()?.idx;
  if(canGoBack&&Number.isInteger(index)&&index>0){
   navigate(-1);
  }else{
   navigate(home,{replace:true});
  }
 });
 // Capacitor registration is asynchronous. Cleanup also handles React StrictMode
 // unmounting before the listener handle has arrived, without leaking listeners.
 return ()=>{
  active=false;
  listener.then(handle=>handle.remove()).catch(onError);
 };
}
