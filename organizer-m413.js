(function(){
  'use strict';
  var config=window.IWP_SITE_CONFIG||{};
  var appUrl=String(config.appUrl||'');
  var clientId=String(config.googleClientId||'');
  var sessionKey='iwpOrganizerSessionV1';
  var requestNumber=0;
  var activeTimeout=0;

  function storageAreas(){var areas=[];try{if(window.sessionStorage)areas.push(window.sessionStorage);}catch(ignore){}try{if(window.localStorage)areas.push(window.localStorage);}catch(ignore){}return areas;}
  function normalizeSession(payload){var session={token:String(payload&&payload.sessionToken||payload&&payload.token||''),expiresAt:String(payload&&payload.expiresAt||''),user:payload&&payload.user||{}};if(!session.token||!session.expiresAt||isNaN(Date.parse(session.expiresAt))||Date.parse(session.expiresAt)<=Date.now())return null;return session;}
  function readSession(){var areas=storageAreas();for(var i=0;i<areas.length;i++){try{var raw=areas[i].getItem(sessionKey)||'';var data=raw?JSON.parse(raw):null;var session=normalizeSession(data);if(session)return session;areas[i].removeItem(sessionKey);}catch(ignore){}}return null;}
  function writeSession(payload){var session=normalizeSession(payload);if(!session)return null;var raw=JSON.stringify(session);storageAreas().forEach(function(area){try{area.setItem(sessionKey,raw);}catch(ignore){}});return session;}
  function clearSession(){storageAreas().forEach(function(area){try{area.removeItem(sessionKey);}catch(ignore){}});}
  function removeRequestScripts(prefix){Array.prototype.slice.call(document.querySelectorAll('script[id^="'+prefix+'"]')).forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node);});}
  function clearRequestTimeout(){if(activeTimeout){clearTimeout(activeTimeout);activeTimeout=0;}}

  var menu=document.querySelector('.mobile-menu-button');var nav=document.getElementById('mainNavigation');
  if(menu&&nav){menu.addEventListener('click',function(){var open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));nav.classList.toggle('is-open',!open);menu.textContent=open?'Menu':'Close';});}

  function text(id,value){var el=document.getElementById(id);if(el)el.textContent=value==null?'':String(value);}
  function esc(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];});}
  function plural(n,one,many){return Number(n)===1?one:many;}
  function eventUrl(id){return '/adventure.html?id='+encodeURIComponent(id||'');}
  function setState(name){
    document.getElementById('organizerLoading').hidden=name!=='loading';
    document.getElementById('organizerAccess').hidden=name!=='access';
    document.getElementById('organizerDashboard').hidden=name!=='dashboard';
    ['organizerSignOutTop'].forEach(function(id){var el=document.getElementById(id);if(el)el.hidden=name!=='dashboard';});
  }
  function showAccess(message){clearRequestTimeout();setState('access');text('organizerAccessMessage',message||'Sign in with the approved Google account used for Community Connections.');renderGoogleButton();}
  function signOut(){var session=readSession();clearSession();if(window.google&&google.accounts&&google.accounts.id)google.accounts.id.disableAutoSelect();if(session&&session.token&&appUrl){var script=document.createElement('script');script.src=appUrl+(appUrl.indexOf('?')===-1?'?':'&')+'api=organizer-signout&callback=iwpOrganizerSignOutCallback&session='+encodeURIComponent(session.token)+'&_='+Date.now();document.head.appendChild(script);}setState('access');renderGoogleButton();}
  window.iwpOrganizerSignOutCallback=function(){location.href='/organizer.html';};
  ['organizerSignOutTop','organizerSignOutBottom'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',signOut);});

  window.iwpOrganizerSessionCallback=function(payload){clearRequestTimeout();removeRequestScripts('organizerSessionRequest');if(!payload||!payload.success||!payload.authorized){showAccess(payload&&payload.error||'Google sign-in was not accepted by the organizer service.');return;}var session=writeSession(payload);if(!session){showAccess('The organizer session could not be saved. Please allow site storage and sign in again.');return;}if(payload.dashboard){window.iwpOrganizerDashboardCallback(payload);return;}loadDashboard(session);};
  window.iwpOrganizerDashboardCallback=function(payload){
    clearRequestTimeout();removeRequestScripts('organizerApiRequest');
    if(!payload||!payload.success||!payload.authorized){showAccess(payload&&payload.error);return;}
    var data=payload.dashboard||{};setState('dashboard');
    var displayName=(payload.user&&payload.user.name)||data.greetingName||'';
    text('organizerGreeting',displayName?'Welcome back, '+displayName.split(' ')[0]:'Adventure Builder');
    text('healthTitle',data.health&&data.health.title);text('healthMessage',data.health&&data.health.message);text('dashboardUpdated','Updated '+(data.updatedAt||'just now'));
    document.getElementById('organizerHealth').classList.toggle('is-warning',!(data.health&&data.health.ok));
    text('statUpcoming',data.upcomingEvents||0);text('statWeek',(data.eventsThisWeek||0)+' '+plural(data.eventsThisWeek,'adventure','adventures')+' this week');
    text('statPeople',data.totalParticipants||0);text('statAttention',data.attentionCount||0);text('attentionBadge',data.attentionCount||0);
    text('statPayments',data.pendingPayments||0);text('statPaymentEvents','Across '+(data.paymentEventCount||0)+' '+plural(data.paymentEventCount,'adventure','adventures'));
    text('statWaitlist',data.waitlistedPeople||0);text('statWaitlistEvents','Across '+(data.waitlistEventCount||0)+' '+plural(data.waitlistEventCount,'adventure','adventures'));
    text('statDrafts',data.draftCount||0);renderNext(data.nextEvent);renderAlerts(data.alerts||[]);renderTasks(data.todayTasks||[]);renderRegistrations(data.recentRegistrations||[]);
  };

  function renderNext(event){var el=document.getElementById('nextAdventure');if(!event){el.className='organizer-empty';el.textContent='No upcoming adventures.';return;}var id=event.eventId||event.EventId||'';var title=event.title||event.Title||'Adventure';var date=event.dateDisplay||event.startDateDisplay||event.StartDate||'';var location=event.location||event.Location||'';el.className='organizer-next-card';el.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(date)+(location?' · '+esc(location):'')+'</p><a href="'+eventUrl(id)+'">View public adventure →</a>';}
  function renderAlerts(items){var el=document.getElementById('attentionList');if(!items.length){el.innerHTML='<div class="organizer-empty">No current alerts.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.title||'Adventure')+'</strong><p>'+esc(item.message||'Needs attention')+'</p><small>'+esc(item.startDate||'')+'</small></div>';}).join('');}
  function renderTasks(items){var el=document.getElementById('taskList');if(!items.length){el.innerHTML='<div class="organizer-empty">No tasks are due.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.label||'Organizer task')+'</strong><p>'+esc(item.eventTitle||'Adventure')+'</p><small>'+(item.overdue?'Overdue · ':'Due ')+esc(item.dueDate||'')+'</small></div>';}).join('');}
  function renderRegistrations(items){var el=document.getElementById('registrationList');if(!items.length){el.innerHTML='<div class="organizer-empty">No recent registrations.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.name||'Community member')+'</strong><p>'+esc(item.eventTitle||'Adventure')+' · '+esc(item.people||1)+' '+plural(item.people,'person','people')+'</p><small>'+esc(item.createdAt||'')+' · '+esc(item.status||'Registered')+'</small></div>';}).join('');}

  function jsonp(route,callback,params,prefix,errorMessage){
    clearRequestTimeout();removeRequestScripts(prefix);var script=document.createElement('script');script.async=true;script.id=prefix+(++requestNumber);var query='api='+encodeURIComponent(route)+'&callback='+encodeURIComponent(callback);Object.keys(params||{}).forEach(function(key){query+='&'+encodeURIComponent(key)+'='+encodeURIComponent(params[key]);});script.src=appUrl+(appUrl.indexOf('?')===-1?'?':'&')+query+'&_='+Date.now();script.onerror=function(){showAccess(errorMessage);};document.head.appendChild(script);activeTimeout=setTimeout(function(){showAccess('The organizer service took too long to respond. Please sign in again.');},20000);
  }
  function loadDashboard(session){if(!appUrl){showAccess('The organizer service URL has not been configured.');return;}if(!session||!session.token){showAccess();return;}setState('loading');jsonp('organizer-dashboard','iwpOrganizerDashboardCallback',{session:session.token},'organizerApiRequest','Unable to reach the organizer service. Please sign in again.');}
  function handleGoogleCredential(response){var credential=response&&response.credential?String(response.credential):'';if(!credential){showAccess('Google did not return a sign-in credential. Please try again.');return;}setState('loading');jsonp('organizer-session','iwpOrganizerSessionCallback',{credential:credential},'organizerSessionRequest','Unable to start the organizer session. Please try again.');}
  function renderGoogleButton(){var target=document.getElementById('googleSignInButton');if(!target||target.dataset.rendered==='true')return;if(!clientId){text('organizerAccessMessage','The Google sign-in client has not been configured.');return;}if(!(window.google&&google.accounts&&google.accounts.id)){setTimeout(renderGoogleButton,150);return;}google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential,auto_select:false,cancel_on_tap_outside:true});google.accounts.id.renderButton(target,{theme:'outline',size:'large',shape:'pill',text:'signin_with',width:300});target.dataset.rendered='true';}

  var existing=readSession();if(existing)loadDashboard(existing);else showAccess();
})();
