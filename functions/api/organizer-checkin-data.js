import {verifySession,json} from './_organizer-auth.js';
function n(v){return Number(v||0)}
export async function onRequestPost({request,env}){
  try{
    const b=await request.json();
    const user=await verifySession(env,b.session);
    const eventId=String(b.eventId||'').trim(),registrationId=String(b.registrationId||'').trim();
    if(!eventId||!registrationId)throw new Error('This check-in link is incomplete or invalid.');
    const event=await env.COMMUNITY_DB.prepare('SELECT event_id,title,start_date,start_time,location_name FROM events WHERE event_id=?').bind(eventId).first();
    const r=await env.COMMUNITY_DB.prepare('SELECT * FROM registrations WHERE event_id=? AND registration_id=?').bind(eventId,registrationId).first();
    if(!event||!r)throw new Error('Registration not found.');
    return json({success:true,authorized:true,user,data:{event:{eventId:event.event_id,title:event.title,Title:event.title,startDate:event.start_date,startTime:event.start_time,location:event.location_name},registration:{registrationId:r.registration_id,name:r.name,email:r.email,phone:r.phone,status:r.status,adults:n(r.adult_count),children:n(r.child_count),adultGuestNames:r.adult_guest_names||'',childNames:r.child_names||''}},source:'d1',migration:'M7.9'});
  }catch(e){return json({success:false,authorized:false,error:e.message||'Unable to load QR check-in.'},401)}
}
