import {json} from './_organizer-auth.js';
export async function onRequestPost(){
  const r=json({success:true,signedOut:true,migration:'M7.5.1'});
  r.headers.append('set-cookie','iwp_organizer_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  return r;
}
