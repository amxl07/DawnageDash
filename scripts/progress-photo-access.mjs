// Operator/service-only provisioning. Importable for tests; dry-run by default.
import { pathToFileURL } from 'node:url';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export async function provisionPhotoAccess({operation,clientId,coachId,apply=false,approved=false},request) {
  if(!['grant','revoke'].includes(operation) || !uuid.test(clientId) || !uuid.test(coachId) || clientId===coachId) throw new Error('Provide a grant/revoke operation and distinct valid client/coach UUIDs.');
  if(apply && !approved) throw new Error('Explicit operator approval is required for --apply (add --approved after reviewing consent and assignment).');
  if(operation==='grant') {
    const rows=await request(`/rest/v1/users?select=id,role,coach_id&or=(id.eq.${clientId},id.eq.${coachId})`);
    const client=rows.find(row=>row.id===clientId),coach=rows.find(row=>row.id===coachId);
    if(client?.role!=='client' || client?.coach_id!==coachId || coach?.role!=='coach') throw new Error('Client/coach assignment or trusted role does not match. Nothing changed.');
  }
  if(apply) {
    if(operation==='grant') await request('/rest/v1/progress_photo_coach_access?on_conflict=client_id,coach_id',{
      method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({client_id:clientId,coach_id:coachId}),
    });
    else await request(`/rest/v1/progress_photo_coach_access?client_id=eq.${clientId}&coach_id=eq.${coachId}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
  }
  return {operation,applied:apply};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const args=process.argv.slice(2);
    if(args.includes('--help')) {
      console.log('Usage: node scripts/progress-photo-access.mjs grant|revoke --client UUID --coach UUID [--apply --approved]\nRequires PHOTO_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in operator environment. Default: read-only preview. No automatic grants.');
    } else {
      const origin=process.env.PHOTO_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
      if(!origin || !/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?$/.test(origin) || !key) throw new Error('Configure PHOTO_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the operator environment.');
      const request=async(path,options={})=>{
        let response;
        try { response=await fetch(origin+path,{...options,redirect:'error',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers}}); }
        catch { throw new Error('Photo access request failed. Check operator connectivity.'); }
        if(!response.ok) throw new Error(`Photo access request rejected (HTTP ${response.status}). No backend details logged.`);
        const body=await response.text();
        return body?JSON.parse(body):null;
      };
      const value=(name)=>args[args.indexOf(name)+1];
      const result=await provisionPhotoAccess({operation:args[0],clientId:value('--client'),coachId:value('--coach'),apply:args.includes('--apply'),approved:args.includes('--approved')},request);
      console.log(`${result.applied?'APPLIED':'PREVIEW ONLY'}: photo access ${result.operation}. ${result.applied?'':'Review consent before --apply --approved.'}`);
    }
  } catch(error) {
    // Only this tool's sanitized messages are printed; never SDK responses or credentials.
    console.error(error instanceof Error && /^(Provide|Explicit|Client\/coach|Configure|Photo access)/.test(error.message) ? error.message : 'Photo access operation failed. No backend details logged.');
    process.exitCode=1;
  }
}
