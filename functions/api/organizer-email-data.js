export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || body.appUrl || '').trim();
    if (!appUrl) throw new Error('Organizer email service is not configured.');
    const upstream = await fetch(appUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'organizerEmailDataApi',session:body.session||'',eventId:body.eventId||''}),redirect:'follow'});
    const raw=await upstream.text(); const result=JSON.parse(raw);
    return Response.json(result,{status:result.success?200:401,headers:{'cache-control':'no-store'}});
  } catch(error) { return Response.json({success:false,error:error&&error.message?error.message:'Reminder details could not be loaded.'},{status:500,headers:{'cache-control':'no-store'}}); }
}
