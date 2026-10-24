import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function verifyLauncherIcons(res){
 for(const [density,scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]){
  for(const name of ['ic_launcher','ic_launcher_round','ic_launcher_foreground']){
   const path=resolve(res,`mipmap-${density}`,`${name}.png`),data=readFileSync(path);
   assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${path}: PNG required`);
   const size=Math.round((name.endsWith('foreground')?108:48)*scale);
   assert.equal(data.readUInt32BE(16),size,`${path}: width`);
   assert.equal(data.readUInt32BE(20),size,`${path}: height`);
   assert.ok(data.length>500,`${path}: logo must contain image detail`);
  }
 }
 for(const name of ['ic_launcher','ic_launcher_round']){
  const xml=readFileSync(resolve(res,'mipmap-anydpi-v26',`${name}.xml`),'utf8');
  assert.ok(xml.includes('<adaptive-icon'));
  assert.ok(xml.includes('@mipmap/ic_launcher_foreground'));
  assert.ok(xml.includes('@color/ic_launcher_background'));
 }
 assert.ok(readFileSync(resolve(res,'values/ic_launcher_background.xml'),'utf8').includes('#FFFFFF'));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 verifyLauncherIcons(process.argv[2]||fileURLToPath(new URL('../android-support/launcher-res',import.meta.url)));
 console.log('PASS: branded launcher icons at five densities, round icons, adaptive layers and white background');
}
