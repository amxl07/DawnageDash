import assert from 'node:assert/strict';
import test from 'node:test';
import { provisionPhotoAccess } from './progress-photo-access.mjs';
const clientId='11111111-1111-4111-8111-111111111111';
const coachId='22222222-2222-4222-8222-222222222222';
const rows=[{id:clientId,role:'client',coach_id:coachId},{id:coachId,role:'coach',coach_id:null}];
test('defaults to preview, never provisions from an assignment without operator approval', async () => {
  const writes=[];
  const request=async (path, options) => { if(options?.method) writes.push(options); return rows; };
  assert.equal((await provisionPhotoAccess({operation:'grant',clientId,coachId},request)).applied,false);
  assert.equal(writes.length,0);
  await assert.rejects(()=>provisionPhotoAccess({operation:'grant',clientId,coachId,apply:true},request), /approval/);
  assert.equal(writes.length,0);
  assert.equal((await provisionPhotoAccess({operation:'grant',clientId,coachId,apply:true,approved:true},request)).applied,true);
  assert.equal(writes[0].method,'POST');
  assert.deepEqual(JSON.parse(writes[0].body),{client_id:clientId,coach_id:coachId});
});
test('rejects a wrong coach assignment or role; revokes stale grants after reassignment', async () => {
  for(const invalid of [[], [{...rows[0],coach_id:null},rows[1]], [rows[0],{...rows[1],role:'client'}]]) {
    await assert.rejects(()=>provisionPhotoAccess({operation:'grant',clientId,coachId,apply:true,approved:true},async()=>invalid), /assignment/);
  }
  const writes=[];
  await provisionPhotoAccess({operation:'revoke',clientId,coachId,apply:true,approved:true},async(path,options)=>{ writes.push({path,options}); return []; });
  assert.equal(writes.length,1);
  assert.equal(writes[0].options.method,'DELETE');
  assert.ok(writes[0].path.includes(`client_id=eq.${clientId}&coach_id=eq.${coachId}`));
});
