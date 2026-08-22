import {verifySession,json} from './_organizer-auth.js';
function clean(v){return String(v??'').trim();}
export async function onRequestPost({request,env}){
  try{
    const b=await request.json();
    const user=await verifySession(env,b.session);
    const eventId=clean(b.eventId), ids=Array.isArray(b.registrationIds)?b.registrationIds.map(clean).filter(Boolean):[], action=clean(b.registrationAction).toLowerCase(), changes=b.changes||{};
    if(!eventId||!ids.length) throw new Error('Adventure and registration selection are required.');
    const event=await env.COMMUNITY_DB.prepare('SELECT event_id FROM events WHERE event_id=?').bind(eventId).first();
    if(!event) throw new Error('Adventure not found.');
    const now=new Date().toISOString();
    const statements=[];
    for(const id of ids){
      const row=await env.COMMUNITY_DB.prepare('SELECT * FROM registrations WHERE registration_id=? AND event_id=?').bind(id,eventId).first();
      if(!row) continue;
      if(action==='checkin') statements.push(env.COMMUNITY_DB.prepare("UPDATE registrations SET status='Checked In',updated_at=? WHERE registration_id=? AND event_id=?").bind(now,id,eventId));
      else if(action==='undo-checkin') statements.push(env.COMMUNITY_DB.prepare("UPDATE registrations SET status='Confirmed',updated_at=? WHERE registration_id=? AND event_id=?").bind(now,id,eventId));
      else if(action==='cancel') statements.push(env.COMMUNITY_DB.prepare("UPDATE registrations SET status='Cancelled',updated_at=? WHERE registration_id=? AND event_id=?").bind(now,id,eventId));
      else if(action==='mark-paid') statements.push(env.COMMUNITY_DB.prepare("UPDATE registrations SET payment_status='Paid',payment_method=?,updated_at=? WHERE registration_id=? AND event_id=?").bind(clean(changes.paymentMethod||row.payment_method),now,id,eventId));
      else if(action==='update'){
        const name=clean(changes.name||row.name), email=clean(changes.email??row.email).toLowerCase(), phone=clean(changes.phone??row.phone), status=clean(changes.status||row.status), pay=clean(changes.paymentStatus||row.payment_status), method=clean(changes.paymentMethod??row.payment_method), notes=clean(changes.notes??row.notes);
        if(!name) throw new Error('Registration name is required.');
        statements.push(env.COMMUNITY_DB.prepare('UPDATE registrations SET name=?,email=?,phone=?,status=?,payment_status=?,payment_method=?,notes=?,updated_at=? WHERE registration_id=? AND event_id=?').bind(name,email,phone,status,pay,method,notes,now,id,eventId));
      } else throw new Error('Unknown registration action.');
    }
    if(!statements.length) throw new Error('No matching registrations were found.');
    await env.COMMUNITY_DB.batch(statements);
    return json({success:true,authorized:true,user,updated:statements.length,message:'Registration changes saved.',source:'d1',migration:'M7.7'});
  }catch(e){return json({success:false,authorized:false,error:e.message||'Registration action failed.'},400);}
}
