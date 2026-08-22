import {authenticateCredential,issueSession,json} from './_organizer-auth.js';
export async function onRequestPost({request,env}){
  try{
    const body=await request.json();
    const user=await authenticateCredential(env,String(body.credential||''));
    const session=await issueSession(env,user);
    return json({success:true,authorized:true,user,sessionToken:session.token,expiresAt:session.expiresAt,source:'cloudflare',migration:'M7.9'});
  }catch(e){
    return json({success:false,authorized:false,error:e.message||'Unable to start organizer session.'},401);
  }
}
