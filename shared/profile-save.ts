import { mergeAnswers, type Answers } from './questionnaire';

type Database = { from: (table: string) => any };
export type SavedProfile = { id: string; full_name: string | null; phone_number: string | null; country: string | null; profile_data: Answers | null };
function equal(a: unknown, b: unknown): boolean {
 if (a === b) return true;
 if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
 const left = a as Answers, right = b as Answers;
 return Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => Object.prototype.hasOwnProperty.call(right,key) && equal(left[key],right[key]));
}
/** CAS on JSONB and changed scalar fields closes the Profile read/merge window. */
export async function saveProfilePatch(database: Database, userId: string, fields: Answers, dataPatch: Answers, active: () => boolean, acknowledgeOrigin?: (saved: SavedProfile) => Promise<void>): Promise<SavedProfile> {
 const guard=()=>{if(!active()) throw new Error('Profile account changed.');};
 for(let attempt=0;attempt<3;attempt++) {
  guard();
  const {data:latest,error:readError}=await database.from('users').select('id, full_name, phone_number, country, profile_data').eq('id',userId).maybeSingle();
  guard(); if(readError) throw readError; if(!latest || latest.id !== userId) throw new Error('Profile row was not found.');
  if (latest.profile_data != null && (typeof latest.profile_data !== 'object' || Array.isArray(latest.profile_data))) throw new Error('Profile data is invalid.');
  const scalar=Object.fromEntries(Object.entries(fields).filter(([key,value])=>['full_name','phone_number','country'].includes(key) && value !== undefined));
  const patch={...scalar,profile_data:mergeAnswers(latest.profile_data,dataPatch,false)};
  let query=database.from('users').update(patch).eq('id',userId);
  query=latest.profile_data == null ? query.is('profile_data',null) : query.eq('profile_data',JSON.stringify(latest.profile_data));
  for(const key of Object.keys(scalar)) query=latest[key] == null ? query.is(key,null) : query.eq(key,latest[key]);
  const {data:saved,error}=await query.select('id, full_name, phone_number, country, profile_data').maybeSingle();
  if(error) { guard(); throw error; } if(!saved) { guard(); continue; }
  if(saved.id !== userId || !equal(saved.profile_data,patch.profile_data) || !Object.entries(scalar).every(([key,value])=>equal(saved[key],value))) throw new Error('Profile save was not acknowledged.');
  // A caller may record this confirmed receipt in the originating local journal.
  // This callback must not initiate another remote write or update a different account UI.
  if (acknowledgeOrigin) await acknowledgeOrigin(saved as SavedProfile);
  guard();
  return saved as SavedProfile;
 }
 throw new Error('Profile changed elsewhere. Please retry.');
}
