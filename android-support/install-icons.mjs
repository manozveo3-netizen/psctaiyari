import {cpSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyLauncherIcons} from '../verification/android-icons.mjs';

export function installLauncherIcons(androidRoot=fileURLToPath(new URL('../android',import.meta.url))){
 const manifest=readFileSync(resolve(androidRoot,'app/src/main/AndroidManifest.xml'),'utf8');
 for(const [attribute,resource] of [['icon','ic_launcher'],['roundIcon','ic_launcher_round']]){
  if(!manifest.includes(`android:${attribute}="@mipmap/${resource}"`)){
   throw new Error(`Android manifest must point ${attribute} to @mipmap/${resource}`);
  }
 }
 const source=fileURLToPath(new URL('./launcher-res',import.meta.url));
 verifyLauncherIcons(source);
 const target=resolve(androidRoot,'app/src/main/res');
 cpSync(source,target,{recursive:true});
 verifyLauncherIcons(target);
 console.log('Installed PSC Taiyari launcher icons for Android (legacy, round and adaptive).');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(!process.env.CAPACITOR_PLATFORM_NAME||process.env.CAPACITOR_PLATFORM_NAME==='android'){
  installLauncherIcons();
 }
}
