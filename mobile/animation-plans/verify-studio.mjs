// Local artifact verification only. Does not load Expo, real accounts or a backend.
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const evidence=path.join(root,'evidence');
await mkdir(evidence,{recursive:true});
const profile=path.join(evidence,'.browser-profile-'+Date.now());
const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--disable-background-networking','--disable-component-update','--disable-sync',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank',
],{stdio:['ignore','ignore','pipe']});
let socket;const pending=new Map();let sequence=0;const errors=[];const checks=[];
try{
 const endpoint=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Chrome startup timed out: '+log)),300000);
  let log='';child.once('error',reject);child.once('exit',code=>reject(Error('Chrome exited: '+code)));
  child.stderr.on('data',b=>{log=(log+b).slice(-5000);const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timeout);resolve(m[1])}});
 });
 socket=new WebSocket(endpoint);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timeout);pending.delete(m.id);if(m.error){p.reject(Error(JSON.stringify(m.error)))}else{p.resolve(m.result)}}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)});
 const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Timed out '+method))},60000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))});
 const target=await call('Target.createTarget',{url:'about:blank'});const {sessionId:sid}=await call('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const evalJS=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sid);if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 await call('Runtime.enable',{},sid);await call('Page.enable',{},sid);await call('Emulation.setDeviceMetricsOverride',{width:1280,height:980,deviceScaleFactor:1,mobile:false},sid);
 // HTML is self-contained: no app/server or external asset requests.
 await call('Page.setDocumentContent',{frameId:(await call('Page.getFrameTree',{},sid)).frameTree.frame.id,html:await readFile(path.join(root,'motion-studio.html'),'utf8')},sid);
 const check=async(name,expression)=>{if(!await evalJS(expression))throw Error('Failed: '+name);checks.push(name);console.log('PASS '+name)};
 const click=async selector=>{const rect=await evalJS(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;if(!e.contains(document.elementFromPoint(x,y)))throw Error('Control covered');return{x,y}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect},sid);await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect},sid)};
 const shot=async name=>{await new Promise(r=>setTimeout(r,250));const s=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sid);await writeFile(path.join(evidence,name+'.png'),Buffer.from(s.data,'base64'))};
 await check('Home preview boots',`document.querySelector('#screen').innerText.includes('Build your rhythm.')`);await shot('studio-home-dark');
 await click('[data-screen="checkin"]');await click('[data-next]');await check('Check-in validates unanswered ratings',`document.querySelector('#form-error').textContent.length>0`);
 await click('[data-rate="energy"][data-value="7"]');await click('[data-rate="stress"][data-value="4"]');await check('Chosen ratings expose checked semantics',`document.querySelector('[data-rate="energy"][aria-checked="true"]').dataset.value==='7'`);await shot('studio-checkin-dark');
 await click('[data-next]');await click('[data-sleep="8"]');await click('[data-rate="hunger"][data-value="5"]');await click('[data-choice="digestion"][data-value="Comfortable"]');await click('[data-next]');await click('[data-choice="training"][data-value="Rest day"]');await click('[data-rate="nutrition"][data-value="8"]');await click('[data-next]');await check('Check-in reaches review',`document.querySelector('#screen').innerText.includes('A clear record.')`);await click('[data-next]');await check('Receipt is explicitly fictional',`document.querySelector('#screen').innerText.includes('nothing was sent')`);
 await click('[data-screen="workout"]');await evalJS(`document.querySelector('#weight').value='62.5';document.querySelector('#reps').value='6'`);await click('[data-complete="0"]');await check('Set advances and Undo is available',`document.querySelector('#screen').innerText.includes('Working set 2')&&!!document.querySelector('[data-undo]')`);await click('[data-undo]');await check('Undo restores first set',`document.querySelector('#screen').innerText.includes('Working set 1')`);await check('Undo preserves entered values',`document.querySelector('#weight').value==='62.5'&&document.querySelector('#reps').value==='6'`);await click('[data-complete="0"]');await click('#rest-toggle');await check('Rest pauses',`document.querySelector('#rest-toggle').textContent!=='Pause'`);await click('#rest-toggle');await check('Rest resumes',`document.querySelector('#rest-toggle').textContent==='Pause'`);await shot('studio-workout-dark');await click('[data-complete="1"]');await click('[data-complete="2"]');await click('[data-demo-done]');await check('Summary uses recorded demo values',`document.querySelector('[data-demo-done]').textContent.includes('62.5 kg × 6')`);
 await click('[data-screen="progress"]');await evalJS(`document.querySelector('#inspect').value=1;document.querySelector('#inspect').dispatchEvent(new Event('input',{bubbles:true}))`);await check('Chart reports exact selected observation',`document.querySelector('#observed-value').textContent==='72.1'&&document.querySelector('#observed-date').textContent.startsWith('4 Sep')`);await click('#theme');await shot('studio-progress-light');
 await click('[data-screen="welcome"]');await check('Welcome action is available',`!!document.querySelector('[data-go="checkin"]')`);await shot('studio-welcome-light');
 await click('#reduce');await check('Reduced motion switches live',`document.body.classList.contains('reduced')`);
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sid);await click('[data-screen="checkin"]');await click('#reset');await check('390px has no horizontal document overflow',`document.documentElement.scrollWidth<=390`);await shot('studio-mobile-light');
 await call('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:false},sid);await check('320px has no horizontal document overflow',`document.documentElement.scrollWidth<=320`);await check('No runtime exceptions',`true`);if(errors.length)throw Error(errors.join('\n'));
 await writeFile(path.join(evidence,'studio-verification.json'),JSON.stringify({date:'2026-09-17',artifact:'motion-studio.html',environment:'Headless Chrome, web illustration only',checks,errors,nativePerformanceTested:false},null,2)+'\n');
 await call('Browser.close');
}finally{for(const p of pending.values())clearTimeout(p.timeout);socket?.close();child.kill('SIGTERM');await new Promise(r=>setTimeout(r,500));await rm(profile,{recursive:true,force:true}).catch(()=>{})}
