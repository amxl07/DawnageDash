import { saveAssessment } from '../../../shared/assessment-save';
import type { Answers } from './questionnaire-data';

function database(initial: any = null) {
 let row = initial; let conflict: (()=>void) | undefined;
 const calls: any[] = [];
 const db = { from: () => {
  let payload: any; let kind = 'read'; const filters: [string,unknown][]=[];
  const query: any = {
   select: () => query, eq: (k:string,v:unknown) => {filters.push([k,v]);return query;}, is:(k:string,v:unknown)=>{filters.push([k,v]);return query;},
   update: (p:any)=>{kind='update';payload=p;return query;}, insert:(p:any)=>{kind='insert';payload=p;return query;},
   maybeSingle: async () => {
    calls.push({kind,payload,filters});
    if(kind==='read') return {data:row ? {...row}:null,error:null};
    if(conflict) {const run=conflict;conflict=undefined;run();}
    if(kind==='insert' && row) return {data:null,error:{code:'23505'}};
    if(kind==='update' && (!row || filters.some(([k,v])=>row[k]!==v))) return {data:null,error:null};
    row={...row,...payload}; return {data:{...row},error:null};
   },
  };return query;
 }};
 return {db,calls,get:()=>row, conflict:(fn:()=>void)=>{conflict=fn;},set:(next:any)=>{row=next;}};
}
const existing = (answers: Answers = {}) => ({id:'legacy-id',user_id:'user-a',answers:JSON.stringify(answers),completed_sections:'[]'});
test('a concurrent unrelated edit survives a bounded CAS retry', async () => {
 const mock=database(existing({q14:'old',q56:'old'}));
 mock.conflict(()=>mock.set(existing({q14:'old',q56:'newer'})));
 const saved=await saveAssessment(mock.db,'user-a',{q14:'new'},[],()=>true);
 expect(saved!.answers).toMatchObject({q14:'new',q56:'newer'});
 expect(mock.calls.filter(c=>c.kind==='update')).toHaveLength(2);
});
test('duplicate first insert retries with stable user primary key', async () => {
 const mock=database(); mock.conflict(()=>mock.set({...existing({q56:'other'}),id:'user-a'}));
 const saved=await saveAssessment(mock.db,'user-a',{q14:'new'},[],()=>true);
 expect(mock.calls.find(c=>c.kind==='insert').payload.id).toBe('user-a');
 expect(saved!.answers).toMatchObject({q56:'other',q14:'new'});
});
test('account changes after read prevent any write', async()=>{
 const mock=database(existing());let count=0;
 await expect(saveAssessment(mock.db,'user-a',{},[],()=>++count<3)).rejects.toThrow();
 expect(mock.calls.filter(c=>c.kind!=='read')).toHaveLength(0);
});
test('missing acknowledgment cannot report Saved, and Profile never inserts', async()=>{
 const mock=database(existing());
 mock.db.from=()=>{const q:any={select:()=>q,eq:()=>q,is:()=>q,update:()=>q,maybeSingle:async()=>({data:null,error:{message:'denied'}})};return q;};
 await expect(saveAssessment(mock.db,'user-a',{},[],()=>true)).rejects.toBeTruthy();
 const absent=database();expect(await saveAssessment(absent.db,'user-a',{q14:'x'},[],()=>true,{create:false})).toBeNull();
 expect(absent.calls).toHaveLength(1);
});

test('zero-row CAS exhaustion rejects and never claims saved', async()=>{
 let reads=0; let writes=0;
 const db={from:()=>{let update=false;const q:any={eq:()=>q,is:()=>q,select:()=>q,update:()=>{update=true;return q;},maybeSingle:async()=>{if(update){writes++;return {data:null,error:null};}reads++;return {data:existing(),error:null};}};return q;}};
 await expect(saveAssessment(db,'user-a',{q14:'edit'},[],()=>true)).rejects.toThrow('changed elsewhere');
 expect(reads).toBe(3); expect(writes).toBe(3);
});
test('draft clears stop completed status while retaining section history', async()=>{
 const mock=database({...existing({q14:'goal'}),completed_sections:'["goals","goals","unknown"]'});
 const saved=await saveAssessment(mock.db,'user-a',{q14:' '},[],()=>true,{sections:[{id:'goals',title:'Goals',description:'',questions:[{id:'q14',text:'Goal',type:'text',required:true}]}]});
 expect(saved!.status).toBe('in_progress'); expect(saved!.completed).toEqual(['goals','unknown']);
});
test('account change after mutation rejects acknowledgment for the old editor', async()=>{
 const mock=database(existing());let active=true;
 mock.conflict(()=>{active=false;});
 await expect(saveAssessment(mock.db,'user-a',{q14:'edit'},[],()=>active)).rejects.toThrow('account changed');
});
