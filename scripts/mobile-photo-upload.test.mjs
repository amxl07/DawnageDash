import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const uploads=[];
const context=vm.createContext({ Date, URL, ArrayBuffer, fetch:async()=>({blob:async()=>({size:100}),arrayBuffer:async()=>new ArrayBuffer(100)}) });
const mocks={
  'expo-image-manipulator':{manipulateAsync:async()=>({uri:'file:///fixture.jpg'}),SaveFormat:{JPEG:'jpeg'}},
  './supabase':{supabase:{storage:{from:()=>({upload:async(...args)=>{uploads.push(args);return {error:null};},getPublicUrl:()=>({data:{publicUrl:'https://fixture.invalid/public/photo.jpg'}})})}}},
};
async function load(url){
  const module=new vm.SourceTextModule(stripTypeScriptTypes(await readFile(url,'utf8')), {context,identifier:url.href});
  await module.link(async(name)=>{
    if(mocks[name]) return new vm.SyntheticModule(Object.keys(mocks[name]),function(){for(const [key,value] of Object.entries(mocks[name]))this.setExport(key,value);},{context});
    return load(new URL(name.endsWith('.ts')?name:`${name}.ts`,url));
  });
  return module;
}
const module=await load(new URL('../mobile/src/lib/photos.ts',import.meta.url));
await module.evaluate();
test('actual native upload returns only a reference and rejects unsafe destinations',async()=>{
  const owner='11111111-1111-4111-8111-111111111111';
  const result=await module.namespace.uploadPhoto('file:///local.jpg',owner,'2026-09-19','Front');
  assert.equal(result.objectPath,uploads[0][0]);
  assert.equal(result.publicUrl,undefined);
  assert.equal(result.bytes,100);
  assert.throws(()=>module.namespace.storagePath(owner,'../other-owner','Front'));
});
