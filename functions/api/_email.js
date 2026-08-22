function clean(v){return String(v??'').trim()}
function bool(v){return v===true||v===1||v==='1'||String(v||'').toLowerCase()==='true'}
function htmlEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function displayTime(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);if(!m)return String(v||'');let h=Number(m[1]);const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${m[2]} ${ap}`}
function eventDateLine(e){const start=[e.start_date,displayTime(e.start_time)].filter(Boolean).join(' '),end=[e.end_date,displayTime(e.end_time)].filter(Boolean).join(' ');return end&&end!==start?`${start} – ${end}`:start}
function fromAddress(env){return clean(env.GMAIL_FROM_ADDRESS)||'iwpcommunityconnections@gmail.com'}
function base64UrlUtf8(s){const bytes=new TextEncoder().encode(String(s||''));let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function header(v){return String(v??'').replace(/[\r\n]+/g,' ').trim()}
async function gmailAccessToken(env){
  const clientId=clean(env.GMAIL_CLIENT_ID),clientSecret=clean(env.GMAIL_CLIENT_SECRET),refreshToken=clean(env.GMAIL_REFRESH_TOKEN);
  if(!clientId||!clientSecret||!refreshToken)throw new Error('Gmail API credentials are not fully configured.');
  const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'});
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.access_token)throw new Error('Unable to refresh Gmail access token: '+(data.error_description||data.error||res.status));
  return data.access_token;
}
async function sendMail(env,{to,subject,text,html,replyTo}){
  const recipient=clean(to);if(!recipient)throw new Error('Email recipient is required.');
  const token=await gmailAccessToken(env);
  const boundary='iwp_'+crypto.randomUUID().replace(/-/g,'');
  const plain=String(text||'');
  const rich=String(html||('<div style="font-family:Arial,sans-serif;white-space:pre-wrap">'+htmlEscape(plain).replace(/\n/g,'<br>')+'</div>'));
  const lines=[
    `From: IWP Community Connections <${header(fromAddress(env))}>`,
    `To: ${header(recipient)}`,
    `Subject: ${header(subject)}`,
    'MIME-Version: 1.0',
    ...(replyTo?[`Reply-To: ${header(replyTo)}`]:[]),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',plain,'',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',rich,'',
    `--${boundary}--`,''
  ];
  const raw=base64UrlUtf8(lines.join('\r\n'));
  const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({raw})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error('Gmail send failed: '+(data?.error?.message||res.status));
  return data;
}

function checkInUrl(e,r){return 'https://connections.redlinecreates.com/organizer-checkin.html?eventId='+encodeURIComponent(e.event_id||'')+'&registrationId='+encodeURIComponent(r.registration_id||'')}
function participantHtml(e,r){const url=checkInUrl(e,r),qr='https://quickchart.io/qr?size=260&margin=2&text='+encodeURIComponent(url);return '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111"><p>Hi '+htmlEscape(r.name)+',</p><p>Thanks for registering for <strong>'+htmlEscape(e.title||'Community Connections Adventure')+'</strong>.</p><p><strong>Date/Time:</strong> '+htmlEscape(eventDateLine(e))+'<br><strong>Location:</strong> '+htmlEscape(e.location_name||'To be announced')+'<br><strong>Status:</strong> '+htmlEscape(r.status)+'</p><p><strong>Event-day QR code</strong><br>Keep this email available on event day so the organizer can scan your code for check-in.</p><p><img src="'+htmlEscape(qr)+'" alt="Event-day check-in QR code" width="260" height="260"></p><p style="font-size:13px;color:#555">This is a member-organized Community Connections event and is not facilitated, monitored, or organized by IWP staff.</p><p>IWP Community Connections<br>You Are Not Alone.</p></div>'}

function participantBody(e,r){const lines=[];lines.push(`Hi ${r.name},`,'','Thanks for registering for:',e.title||'Community Connections Adventure','');lines.push('Date/Time: '+eventDateLine(e));lines.push('Location: '+(e.location_name||'To be announced'));if(e.address)lines.push('Address: '+e.address);if(e.organizer_name)lines.push('Organizer: '+e.organizer_name);lines.push('','Registration status: '+r.status,'Adults: '+Number(r.adult_count||0));if(Number(r.child_count||0)>0)lines.push('Children: '+Number(r.child_count||0));if(bool(e.paid_event)){lines.push('','Payment status: '+(r.payment_status||'Pending'),'Payment method: '+(r.payment_method||'Not selected'));if(String(r.payment_status||'').toLowerCase()==='pending')lines.push('Your reservation is not confirmed until payment has been received.')}lines.push('','Event-day check-in link: '+checkInUrl(e,r),'','Important: This is a member-organized Community Connections event and is not facilitated, monitored, or organized by IWP staff.','','IWP Community Connections','Find Your Next Adventure');return lines.join('\n')}
function organizerBody(e,r){const base='https://connections.redlinecreates.com';const lines=['New registration received for:',e.title||'Community Connections Adventure','','Participant',`Name: ${r.name}`,`Email: ${r.email}`,`Phone: ${r.phone}`,`Adults: ${Number(r.adult_count||0)}`,`Children: ${Number(r.child_count||0)}`,`Status: ${r.status}`,`Payment Status: ${r.payment_status||''}`,`Payment Method: ${r.payment_method||'Not selected'}`,''];if(r.emergency_contact_name||r.emergency_contact_phone){lines.push('Emergency Contact',`Name: ${r.emergency_contact_name||''}`,`Phone: ${r.emergency_contact_phone||''}`,'')}if(r.notes){lines.push('Notes:',r.notes,'')}lines.push('Quick Links',`Command Center: ${base}/organizer.html`,`Adventure Details: ${base}/adventure.html?id=${encodeURIComponent(e.event_id)}`,`Registration Page: ${base}/register.html?id=${encodeURIComponent(e.event_id)}`,'','This message was automatically generated by IWP Community Connections.');return lines.join('\n')}
export {sendMail,participantBody,participantHtml,organizerBody,clean,bool,displayTime,eventDateLine,htmlEscape};
