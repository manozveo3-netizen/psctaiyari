import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installAndroidBackHandler} from '../src/android/backNavigation.js';

const callbacks=[],calls=[],errors=[];
let route={pathname:'/lessons/first',home:'/dashboard'},state={idx:3},resolveHandle,removed=0;
const app={
 addListener(name,callback){assert.equal(name,'backButton');callbacks.push(callback);return new Promise(resolve=>{resolveHandle=resolve;});},
 exitApp:async()=>{calls.push('exit');}
};
const cleanup=installAndroidBackHandler({app,getRoute:()=>route,getHistoryState:()=>state,navigate:(...args)=>calls.push(args),onError:e=>errors.push(e)});
const back=callbacks[0];
back({canGoBack:true});assert.deepEqual(calls.pop(),[-1]);
// A native WebView with no history must never exit from an inner page.
for(const pathname of ['/courses','/courses/one','/lessons/one','/test/one','/result/one','/progress','/review','/settings/delete-account','/unknown']){
 route.pathname=pathname;state={idx:0};back({canGoBack:false});assert.deepEqual(calls.pop(),['/dashboard',{replace:true}]);
}
// Ignore an unrelated native history stack and malformed router indexes.
for(const idx of [undefined,null,-1,NaN,'2']){
 state={idx};back({canGoBack:true});assert.deepEqual(calls.pop(),['/dashboard',{replace:true}]);
}
state={idx:5};back({canGoBack:false});assert.deepEqual(calls.pop(),['/dashboard',{replace:true}]);
// Home exits even when a previous test or login remains in history.
for(const pathname of ['/dashboard','/dashboard/','/']){
 route.pathname=pathname;back({canGoBack:true});assert.equal(calls.pop(),'exit');
}
// Sign-out and route changes are read at the time of the press, not mount time.
route={pathname:'/login',home:'/'};state=null;back({canGoBack:false});assert.deepEqual(calls.pop(),['/',{replace:true}]);
route.pathname='/';back({canGoBack:false});assert.equal(calls.pop(),'exit');
// StrictMode cleanup before asynchronous registration finishes.
cleanup();route.pathname='/';back({canGoBack:false});assert.equal(calls.length,0);
resolveHandle({remove:async()=>{removed++;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(removed,1);assert.deepEqual(errors,[]);
const entry=readFileSync('src/main.jsx','utf8');
assert.ok(entry.includes('<AuthProvider><AndroidBackNavigation/><App/>'),'Install before the welcome splash');
assert.equal(readFileSync('src/android/AndroidBackNavigation.jsx','utf8').includes("Capacitor.getPlatform()!=='android'"),true,'Do not intercept web/iOS back');
assert.ok(JSON.parse(readFileSync('package.json','utf8')).dependencies['@capacitor/app']);
console.log('PASS: Android Back returns through router history, deep links fall back home, only home exits, sign-out and async listener cleanup');
