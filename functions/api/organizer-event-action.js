import {verifySession,json} from './_organizer-auth.js';
export async function onRequestPost({request,env}){
  try{
    const b=await request.json();
    const user=await verifySession(env,b.session);
    const eventId=String(b.eventId||'').trim(), action=String(b.eventAction||'').trim().toLowerCase();
    if(!eventId) throw new Error('Adventure ID is required.');
    const event=await env.COMMUNITY_DB.prepare('SELECT event_id,status,title FROM events WHERE event_id=?').bind(eventId).first();
    if(!event) throw new Error('Adventure not found.');
    const now=new Date().toISOString();
    if(action==='publish'){
      await env.COMMUNITY_DB.prepare("UPDATE events SET status='Published',updated_at=? WHERE event_id=?").bind(now,eventId).run();
      return json({success:true,authorized:true,user,eventId,message:'Adventure published.',source:'d1',migration:'M7.7'});
    }
    if(action==='cancel'){
      await env.COMMUNITY_DB.prepare("UPDATE events SET status='Cancelled',updated_at=? WHERE event_id=?").bind(now,eventId).run();
      return json({success:true,authorized:true,user,eventId,message:'Adventure cancelled. Registrations were preserved.',source:'d1',migration:'M7.7'});
    }
    if(action==='close'){
      await env.COMMUNITY_DB.prepare("UPDATE events SET status='Closed',updated_at=? WHERE event_id=?").bind(now,eventId).run();
      return json({success:true,authorized:true,user,eventId,message:'Adventure registration closed.',source:'d1',migration:'M7.7'});
    }
    if(action==='delete'){
      await env.COMMUNITY_DB.batch([
        env.COMMUNITY_DB.prepare('DELETE FROM registrations WHERE event_id=?').bind(eventId),
        env.COMMUNITY_DB.prepare('DELETE FROM memories WHERE event_id=?').bind(eventId),
        env.COMMUNITY_DB.prepare('DELETE FROM adventure_resources WHERE event_id=?').bind(eventId),
        env.COMMUNITY_DB.prepare('DELETE FROM events WHERE event_id=?').bind(eventId)
      ]);
      return json({success:true,authorized:true,user,eventId,message:'Adventure permanently deleted.',source:'d1',migration:'M7.7'});
    }
    throw new Error('Unknown adventure action.');
  }catch(e){return json({success:false,authorized:false,error:e.message||'Adventure action failed.'},400);}
}
