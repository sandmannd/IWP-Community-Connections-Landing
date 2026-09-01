import {sendMail,displayTime} from './_email.js';

function clean(v){return String(v??'').trim()}
function chicagoDate(offsetDays=0){const d=new Date(Date.now()+offsetDays*86400000);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function firstName(name){return clean(name).split(/\s+/)[0]||'there'}
function tpl(s,e,r){return String(s||'').replace(/{{FirstName}}/g,firstName(r.name)).replace(/{{AdventureTitle}}/g,e.title||'Community Connections Adventure').replace(/{{AdventureDate}}/g,e.start_date||'').replace(/{{AdventureTime}}/g,displayTime(e.start_time)||'').replace(/{{Location}}/g,e.location_name||'To be announced').replace(/{{OrganizerName}}/g,e.organizer_name||'the organizer')}
function errorDetails(error){return {message:String(error?.message||error||'Unknown error'),stack:error?.stack?String(error.stack):undefined}}
function logInfo(message,details={}){console.log('[automation-run]',message,JSON.stringify(details))}
function logError(message,error,details={}){console.error('[automation-run]',message,JSON.stringify({...details,error:errorDetails(error)}))}

async function setting(db,key,fallback=''){const x=await db.prepare('SELECT setting_value FROM settings WHERE setting_key=?').bind(key).first();return x?String(x.setting_value||''):fallback}
async function already(db,key){const x=await db.prepare("SELECT 1 AS ok FROM logs WHERE message='AUTOMATION_SENT' AND details LIKE ? LIMIT 1").bind('%'+key+'%').first();return !!x}
async function mark(db,key,type,eventId,registrationId){await db.prepare("INSERT INTO logs(log_id,level,message,details,created_at) VALUES (?,?,?,?,?)").bind('log_'+crypto.randomUUID(),'INFO','AUTOMATION_SENT',JSON.stringify({key,type,eventId,registrationId}),new Date().toISOString()).run()}

async function sendBatch(env,type,event,regs,template,runId){
  let sent=0,failed=0,skippedNoEmail=0,skippedAlreadySent=0;
  for(const r of regs){
    if(!r.email){skippedNoEmail++;continue}
    const key=[type,event.event_id,r.registration_id].join(':');
    try{
      if(await already(env.COMMUNITY_DB,key)){skippedAlreadySent++;continue}
      let subject,body;
      if(type==='reminder24'){
        subject='Tomorrow: '+event.title;
        body=tpl(template||'Hi {{FirstName}},\n\nThis is a reminder that {{AdventureTitle}} is coming up on {{AdventureDate}} at {{AdventureTime}}.\n\nLocation: {{Location}}',event,r);
      }else{
        subject='Thank you for joining '+event.title;
        body=tpl(template||'Hi {{FirstName}},\n\nThank you for joining us for {{AdventureTitle}}. We hope you had a great time connecting with the community.',event,r);
      }
      await sendMail(env,{to:r.email,subject,text:body,replyTo:event.organizer_email||undefined});
      await mark(env.COMMUNITY_DB,key,type,event.event_id,r.registration_id);
      sent++;
    }catch(e){
      failed++;
      logError('email failed',e,{runId,type,eventId:event.event_id,registrationId:r.registration_id});
      try{
        await env.COMMUNITY_DB.prepare("INSERT INTO logs(log_id,level,message,details,created_at) VALUES (?,?,?,?,?)").bind('log_'+crypto.randomUUID(),'ERROR','AUTOMATION_EMAIL_FAILED',JSON.stringify({key,error:String(e?.message||e)}),new Date().toISOString()).run();
      }catch(logDbError){
        logError('failed to write AUTOMATION_EMAIL_FAILED database log',logDbError,{runId,type,eventId:event.event_id,registrationId:r.registration_id});
      }
    }
  }
  logInfo('batch complete',{runId,type,eventId:event.event_id,registrations:regs.length,sent,failed,skippedNoEmail,skippedAlreadySent});
  return {sent,failed,skippedNoEmail,skippedAlreadySent};
}

export async function onRequestPost({request,env}){
  const runId=crypto.randomUUID();
  const startedAt=Date.now();
  let stage='authorization';
  try{
    logInfo('started',{runId,date:chicagoDate(0)});

    const auth=clean(request.headers.get('authorization'));
    if(!env.AUTOMATION_SECRET||auth!=='Bearer '+env.AUTOMATION_SECRET){
      logInfo('unauthorized',{runId,secretConfigured:!!env.AUTOMATION_SECRET});
      return Response.json({success:false,error:'Unauthorized'},{status:401});
    }
    if(!env.COMMUNITY_DB){
      logError('D1 binding missing',new Error('COMMUNITY_DB is not configured'),{runId});
      return Response.json({success:false,error:'D1 is not configured.'},{status:503});
    }

    stage='load settings';
    const tomorrow=chicagoDate(1),yesterday=chicagoDate(-1);
    const reminderTemplate=await setting(env.COMMUNITY_DB,'reminderTemplate');
    const thankTemplate=await setting(env.COMMUNITY_DB,'thankYouTemplate');

    stage='load events';
    const events=(await env.COMMUNITY_DB.prepare("SELECT * FROM events WHERE lower(status) IN ('published','completed')").all()).results||[];
    logInfo('events loaded',{runId,count:events.length,tomorrow,yesterday});

    let summary={success:true,migration:'M7.9',date:chicagoDate(0),reminders:{sent:0,failed:0},thankYous:{sent:0,failed:0}};
    for(const e of events){
      stage='load registrations for event '+e.event_id;
      const regs=(await env.COMMUNITY_DB.prepare("SELECT * FROM registrations WHERE event_id=? AND lower(status) NOT IN ('cancelled','canceled','waitlist','deleted')").bind(e.event_id).all()).results||[];

      if(e.start_date===tomorrow){
        stage='send reminder batch for event '+e.event_id;
        const x=await sendBatch(env,'reminder24',e,regs,reminderTemplate,runId);
        summary.reminders.sent+=x.sent;
        summary.reminders.failed+=x.failed;
      }

      const end=e.end_date||e.start_date;
      if(end===yesterday){
        stage='send thank-you batch for event '+e.event_id;
        const x=await sendBatch(env,'thankyou',e,regs,thankTemplate,runId);
        summary.thankYous.sent+=x.sent;
        summary.thankYous.failed+=x.failed;
      }
    }

    logInfo('completed',{runId,durationMs:Date.now()-startedAt,summary});
    return Response.json(summary,{headers:{'cache-control':'no-store'}});
  }catch(error){
    logError('fatal error',error,{runId,stage,durationMs:Date.now()-startedAt});
    return Response.json({success:false,error:'Automation run failed.',runId},{status:500,headers:{'cache-control':'no-store'}});
  }
}
