import { saveProfilePatch } from '../../../shared/profile-save';

function fixture() {
 let row:any={id:'a',full_name:'Alex',phone_number:null,country:null,profile_data:{goal:'Old',future:{v:1}}};
 let beforeWrite: (()=>void) | undefined; const writes:any[]=[];
 const db={from:()=>{let payload:any;const filters:[string,unknown][]=[];const q:any={
  select:()=>q,eq:(key:string,value:unknown)=>{filters.push([key,value]);return q;},is:(key:string,value:unknown)=>{filters.push([key,value]);return q;},update:(value:any)=>{payload=value;return q;},
  maybeSingle:async()=>{
   if(!payload)return {data:{...row},error:null};
   writes.push(payload); beforeWrite?.(); beforeWrite=undefined;
   if(filters.some(([key,value])=>key==='profile_data'? JSON.stringify(row[key])!==value:row[key]!==value))return {data:null,error:null};
   row={...row,...payload};return {data:{...row},error:null};
  },
 };return q;}};
 return {db,writes,read:()=>row,change:()=>{row={...row,full_name:'New name',profile_data:{...row.profile_data,unrelated:42}};},conflict:(run:()=>void)=>{beforeWrite=run;}};
}
test('concurrent profile data survives retry and unchanged top-level fields are not overwritten',async()=>{
 const f=fixture();f.conflict(f.change);
 const saved=await saveProfilePatch(f.db,'a',{}, {goal:'New'},()=>true);
 expect(saved.profile_data).toEqual({goal:'New',future:{v:1},unrelated:42});
 expect(saved.full_name).toBe('New name');expect(f.writes).toHaveLength(2);
 expect(f.writes[0]).not.toHaveProperty('full_name');
});
test('a switched account cannot acknowledge a profile mutation',async()=>{
 const f=fixture();let active=true;f.conflict(()=>{active=false;});
 await expect(saveProfilePatch(f.db,'a',{full_name:'Edited'}, {},()=>active)).rejects.toThrow('account changed');
});
test('zero-row updates exhaust retries instead of confirming profile save',async()=>{
 let writes=0;
 const db={from:()=>{let update=false;const q:any={select:()=>q,eq:()=>q,is:()=>q,update:()=>{update=true;return q;},maybeSingle:async()=>update?(writes++,{data:null,error:null}):{data:{id:'a',profile_data:null},error:null}};return q;}};
 await expect(saveProfilePatch(db,'a',{full_name:'Edited'}, {},()=>true)).rejects.toThrow('changed elsewhere');expect(writes).toBe(3);
});
