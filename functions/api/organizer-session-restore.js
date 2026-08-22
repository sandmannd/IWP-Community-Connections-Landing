import {verifySession,json} from './_organizer-auth.js';

function cookieValue(request,name){
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    if(part.slice(0,i).trim()===name){
      try{return decodeURIComponent(part.slice(i+1).trim());}catch(_){return part.slice(i+1).trim();}
    }
  }
  return '';
}

export async function onRequestGet({request,env}){
  try{
    const token=cookieValue(request,'iwp_organizer_session');
    if(!token)return json({success:false,authorized:false,authenticated:false,error:'No remembered organizer session.',migration:'M7.5.1'},401);
    const user=await verifySession(env,token);
    let payload={};
    try{
      const body=token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/');
      const padded=body.padEnd(Math.ceil(body.length/4)*4,'=');
      payload=JSON.parse(atob(padded));
    }catch(_){}
    return json({success:true,authorized:true,authenticated:true,sessionToken:token,expiresAt:new Date(Number(payload.exp||Date.now())).toISOString(),user,source:'cloudflare-d1-cookie',migration:'M7.5.1'});
  }catch(e){
    const r=json({success:false,authorized:false,authenticated:false,error:e.message||'Remembered organizer session could not be restored.',migration:'M7.5.1'},401);
    r.headers.append('set-cookie','iwp_organizer_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
    return r;
  }
}
