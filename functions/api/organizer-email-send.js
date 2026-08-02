export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const appUrl = String(context.env.IWP_APPS_SCRIPT_URL || body.appUrl || '').trim();
    if (!appUrl || !appUrl.startsWith('https://script.google.com/')) return Response.json({ success:false, error:'Email service is not configured.' }, { status:500 });
    const upstream = await fetch(appUrl, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ action:'organizerSendParticipantEmailApi', session:body.session||'', eventId:body.eventId||'', subject:body.subject||'', body:body.body||'', audience:body.audience||'registered', taskLabel:body.taskLabel||'' }), redirect:'follow' });
    const raw = await upstream.text(); let result; try { result=JSON.parse(raw); } catch (_) { throw new Error('The email service returned an invalid response.'); }
    return Response.json(result, { status:result.success?200:400, headers:{ 'cache-control':'no-store' } });
  } catch (error) { return Response.json({ success:false, error:error&&error.message?error.message:'Email could not be sent.' }, { status:500, headers:{ 'cache-control':'no-store' } }); }
}
