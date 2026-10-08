import {verifySession,json} from './_organizer-auth.js';
import {generateDates} from './_recurrence.js';
const t=x=>String(x??'').trim();
export async function onRequestPost({request,env}){
 try{
 const p=await request.json(); const user=await verifySession(env,p.session);const db=env.COMMUNITY_DB;
 const action=t(p.action);
 if(action==='blackouts'){
   const rows=(await db.prepare('SELECT * FROM recurring_blackouts ORDER BY start_date').all()).results||[];
   return json({success:true,blackouts:rows});
 }
 if(action==='add-blackout'){
   const a=t(p.startDate),z=t(p.endDate),reason=t(p.reason);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(z)||z<a||!reason||reason.length>150)throw Error('Enter valid blackout dates and reason.');
   await db.prepare('INSERT INTO recurring_blackouts VALUES (?,?,?,?,?)').bind('blackout_'+crypto.randomUUID(),a,z,reason,new Date().toISOString()).run();return json({success:true});
 }
 if(action==='remove-blackout'){
   await db.prepare('DELETE FROM recurring_blackouts WHERE blackout_id=?').bind(t(p.id)).run();return json({success:true});
 }
 if(!['preview','generate'].includes(action))throw Error('Unknown action.');
 const id=t(p.eventId);if(!id)throw Error('Save the adventure first.');
 const event=await db.prepare('SELECT * FROM events WHERE event_id=?').bind(id).first();if(!event)throw Error('Adventure not found.');
 const frequency=t(p.frequency),weekday=Number(p.weekday),ordinal=Number(p.ordinal),count=Number(p.count);
 if(!['weekly','biweekly','monthly'].includes(frequency)||!Number.isInteger(weekday)||weekday<0||weekday>6||!Number.isInteger(count)||count<1||count>12||frequency==='monthly'&&![1,2,3,4,-1].includes(ordinal))throw Error('Invalid recurrence settings.');
 const blackouts=(await db.prepare('SELECT start_date,end_date FROM recurring_blackouts').all()).results||[];
 const existing=(await db.prepare('SELECT occurrence_date FROM recurring_occurrences WHERE series_id=(SELECT series_id FROM recurring_series WHERE template_event_id=?)').bind(id).all()).results||[];
 const dates=generateDates({start:event.start_date,frequency,weekday,ordinal,count,skipHolidays:p.skipHolidays!==false,allowHolidays:p.allowHolidays===true,blackouts,existing:[event.start_date,...existing.map(x=>x.occurrence_date)]});
 if(action==='preview')return json({success:true,...dates});
 if(!dates.dates.length)throw Error('No new eligible dates. Adjust the schedule.');
 const series=await db.prepare('SELECT series_id FROM recurring_series WHERE template_event_id=?').bind(id).first();
 const seriesId=series?.series_id||'series_'+crypto.randomUUID();const now=new Date().toISOString();
 const duration=Math.round((Date.parse(event.end_date+'T00:00:00Z')-Date.parse(event.start_date+'T00:00:00Z'))/86400000);
 if(!Number.isInteger(duration)||duration<0||duration>30)throw Error('Event duration must be between 0 and 30 days.');
 const columns=['event_id','status','featured','title','event_type','image_url','start_date','start_time','end_date','end_time','location_name','address','description','what_to_expect','what_to_bring','provided','special_notes','children_allowed','registration_required','free_event','paid_event','adult_cost','child_cost','buy_own_tickets_enabled','ticket_purchase_link','max_participants','waitlist_enabled','organizer_name','organizer_email','organizer_phone','created_by','created_at','updated_at'];
 const stmts=[];
 stmts.push(db.prepare('INSERT INTO recurring_series(series_id,template_event_id,frequency,week_ordinal,weekday,skip_holidays,allow_holidays,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(template_event_id) DO UPDATE SET frequency=excluded.frequency,week_ordinal=excluded.week_ordinal,weekday=excluded.weekday,skip_holidays=excluded.skip_holidays,allow_holidays=excluded.allow_holidays,updated_at=excluded.updated_at').bind(seriesId,id,frequency,frequency==='monthly'?ordinal:null,weekday,p.skipHolidays===false?0:1,p.allowHolidays===true?1:0,now,now));
 for(const date of dates.dates){const end=new Date(Date.parse(date+'T00:00:00Z')+duration*86400000).toISOString().slice(0,10);const newId='event_'+crypto.randomUUID().replace(/-/g,'').slice(0,12);
 const values=[newId,event.status==='Published'?'Published':'Draft',0,event.title,event.event_type,event.image_url,date,event.start_time,end,event.end_time,event.location_name,event.address,event.description,event.what_to_expect,event.what_to_bring,event.provided,event.special_notes,event.children_allowed,event.registration_required,event.free_event,event.paid_event,event.adult_cost,event.child_cost,event.buy_own_tickets_enabled,event.ticket_purchase_link,event.max_participants,event.waitlist_enabled,event.organizer_name,event.organizer_email,event.organizer_phone,user.email,now,now];
 stmts.push(db.prepare(`INSERT INTO events(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...values));
 stmts.push(db.prepare('INSERT INTO recurring_occurrences(series_id,event_id,occurrence_date) VALUES(?,?,?)').bind(seriesId,newId,date));
 }
 await db.batch(stmts);
 return json({success:true,created:dates.dates.length,...dates});
 }catch(e){return json({success:false,error:e.message||'Recurring adventure request failed.'},400);}
}
