import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const path='android/variables.gradle';
assert.ok(existsSync(path),'Capacitor generated project is missing');
const source=readFileSync(path,'utf8');
const sdk=name=>{
 const line=source.split(String.fromCharCode(10)).find(line=>line.trim().startsWith(name+' ='));
 assert.ok(line,'Expected '+name+' in generated Android variables.gradle');
 const version=Number(line.split('=')[1].trim().match(/^[0-9]+/)?.[0]);
 assert.ok(Number.isInteger(version),'Invalid '+name);
 return version;
};
assert.ok(sdk('minSdkVersion')<=24,'Minimum Android SDK rose above API 24; review device support');
assert.ok(sdk('targetSdkVersion')>=36,'Google Play requires API 36+ for new ordinary apps in 2026');
assert.ok(sdk('compileSdkVersion')>=36,'Android compileSdkVersion must be 36+');
console.log('PASS: generated Android SDK levels target 36+, compile 36+, min <=24');
