(function(){
  'use strict';
  var config=window.IWP_SITE_CONFIG||{};
  var appUrl=String(config.appUrl||'');
  var clientId=String(config.googleClientId||'');
  var sessionKey='iwpOrganizerSessionV1';
  var requestNumber=0;
  var activeTimeout=0;var transientRetries=0;
  var dashboardCachePrefix='iwpOrganizerDashboardCacheV1:';
  var dashboardCacheMaxAge=20*60*1000;
  var dashboardCacheRendered=false;

  function byId(id){return document.getElementById(id);}
  function text(id,value){var el=byId(id);if(el)el.textContent=value==null?'':String(value);}
  function esc(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];});}
  function plural(n,one,many){return Number(n)===1?one:many;}
  function eventUrl(id){return '/adventure.html?id='+encodeURIComponent(id||'');} function editEventUrl(id){return '/organizer-builder.html?id='+encodeURIComponent(id||'');} function emailTaskUrl(item){var url='/organizer-email.html?id='+encodeURIComponent(item.eventId||'')+'&task='+encodeURIComponent(item.label||'Organizer Reminder'),session=readSession();if(session&&session.token&&session.expiresAt){url+='&sessionToken='+encodeURIComponent(session.token)+'&sessionExpires='+encodeURIComponent(session.expiresAt);}return url;}
  function clearActiveTimeout(){if(activeTimeout){clearTimeout(activeTimeout);activeTimeout=0;}}
  function removeRequests(){Array.prototype.slice.call(document.querySelectorAll('script[id^="organizerApiRequest"]')).forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node);});}
  function setState(name){
    var loading=byId('organizerLoading'),access=byId('organizerAccess'),dashboard=byId('organizerDashboard');
    if(loading)loading.hidden=name!=='loading';
    if(access)access.hidden=name!=='access';
    if(dashboard)dashboard.hidden=name!=='dashboard';
    var actions=byId('organizerTopActions');if(actions)actions.hidden=name!=='dashboard';
  }
  function storageAreas(){var areas=[];try{if(window.sessionStorage)areas.push(window.sessionStorage);}catch(ignore){}try{if(window.localStorage)areas.push(window.localStorage);}catch(ignore){}return areas;}
  function normalizeSession(payload){var session={token:String(payload&&payload.sessionToken||payload&&payload.token||''),expiresAt:String(payload&&payload.expiresAt||''),legacyToken:String(payload&&payload.legacyToken||''),legacyExpiresAt:String(payload&&payload.legacyExpiresAt||''),user:payload&&payload.user||{}};if(!session.token||!session.expiresAt||isNaN(Date.parse(session.expiresAt))||Date.parse(session.expiresAt)<=Date.now())return null;return session;}
  function readSession(){var areas=storageAreas();for(var i=0;i<areas.length;i++){try{var raw=areas[i].getItem(sessionKey)||'',data=raw?JSON.parse(raw):null,session=normalizeSession(data);if(session)return session;areas[i].removeItem(sessionKey);}catch(ignore){}}return null;}
  function writeSession(payload){var session=normalizeSession(payload);if(!session)return null;var raw=JSON.stringify(session);storageAreas().forEach(function(area){try{area.setItem(sessionKey,raw);}catch(ignore){}});return session;}
  function clearSession(){storageAreas().forEach(function(area){try{area.removeItem(sessionKey);}catch(ignore){}});}
  function dashboardCacheKey(session){return dashboardCachePrefix+String(session&&session.token||'').slice(0,16);}
  function readDashboardCache(session){try{var raw=window.sessionStorage.getItem(dashboardCacheKey(session))||window.localStorage.getItem(dashboardCacheKey(session))||'',cached=raw?JSON.parse(raw):null;if(!cached||!cached.savedAt||!cached.payload)return null;if(Date.now()-Number(cached.savedAt)>dashboardCacheMaxAge)return null;return cached.payload;}catch(ignore){return null;}}
  function writeDashboardCache(session,payload){try{var raw=JSON.stringify({savedAt:Date.now(),payload:payload});window.sessionStorage.setItem(dashboardCacheKey(session),raw);window.localStorage.setItem(dashboardCacheKey(session),raw);}catch(ignore){}}
  function showAccess(message){clearActiveTimeout();removeRequests();setState('access');text('organizerAccessMessage',message||'Sign in with the approved Google account used for Community Connections.');renderGoogleButton();}
  function signOut(){clearActiveTimeout();removeRequests();var session=readSession();clearSession();try{fetch('/api/organizer-signout',{method:'POST',credentials:'same-origin',keepalive:true});}catch(ignore){}if(window.google&&google.accounts&&google.accounts.id)google.accounts.id.disableAutoSelect();if(session&&session.token&&appUrl){var x=document.createElement('script');x.src=appUrl+(appUrl.indexOf('?')===-1?'?':'&')+'api=organizer-signout&callback=iwpOrganizerSignOutCallback&session='+encodeURIComponent(session.legacyToken||session.token)+'&_='+Date.now();document.head.appendChild(x);}setTimeout(function(){location.href='/organizer.html';},50);} window.iwpOrganizerSignOutCallback=function(){};

  var menu=document.querySelector('.mobile-menu-button'),nav=byId('mainNavigation');
  if(menu&&nav){menu.dataset.iwpMenuBound='1';menu.addEventListener('click',function(){var open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));nav.classList.toggle('is-open',!open);menu.textContent=open?'Menu':'Close';});}
  ['organizerSignOutTop','organizerSignOutBottom'].forEach(function(id){var el=byId(id);if(el)el.addEventListener('click',signOut);});

  window.iwpOrganizerSessionCallback=function(payload){
    clearActiveTimeout();removeRequests();
    if(!payload||payload.success!==true||payload.authorized!==true){showAccess(payload&&payload.error||'Organizer authorization was not accepted.');return;}
    var session=writeSession(payload);
    if(!session){showAccess('The organizer session could not be saved. Please allow site storage and sign in again.');return;}
    loadDashboard(session);
  };

  window.iwpOrganizerDashboardCallback=function(payload){
    clearActiveTimeout();removeRequests();
    if(!payload||payload.success!==true||payload.authorized!==true){
      if(payload&&payload.authenticated&&payload.user&&payload.user.email)clearSession();
      showAccess(payload&&payload.error||'Organizer authorization was not accepted.');
      return;
    }
    transientRetries=0;var activeSession=readSession();if(activeSession)writeDashboardCache(activeSession,payload);var data=payload.dashboard||{};
    setState('dashboard');
    try{
      var displayName=(payload.user&&payload.user.name)||data.greetingName||'';
      text('organizerGreeting',displayName?'Welcome back, '+displayName.split(' ')[0]:'Command Center');
      text('healthTitle',data.health&&data.health.title);text('healthMessage',data.health&&data.health.message);text('dashboardUpdated','Updated '+(data.updatedAt||'just now'));
      var health=byId('organizerHealth');if(health)health.classList.toggle('is-warning',!(data.health&&data.health.ok));
      text('statUpcoming',data.upcomingEvents||0);text('statWeek',(data.eventsThisWeek||0)+' '+plural(data.eventsThisWeek,'adventure','adventures')+' this week');
      text('statPeople',data.totalParticipants||0);text('statAttention',data.attentionCount||0);text('attentionBadge',data.attentionCount||0);
      text('statPayments',data.pendingPayments||0);text('statPaymentEvents','Across '+(data.paymentEventCount||0)+' '+plural(data.paymentEventCount,'adventure','adventures'));
      text('statWaitlist',data.waitlistedPeople||0);text('statWaitlistEvents','Across '+(data.waitlistEventCount||0)+' '+plural(data.waitlistEventCount,'adventure','adventures'));
      text('statDrafts',data.draftCount||0);
      renderNext(data.nextEvent);renderAlerts(data.alerts||[]);renderTasks(data.todayTasks||[]);renderRegistrations(data.recentRegistrations||[]);
    }catch(error){
      console.error('Organizer dashboard render failed:',error);
      text('dashboardUpdated','Dashboard loaded; some sections could not be displayed.');
    }
  };

  function renderNext(event){var el=byId('nextAdventure');if(!el)return;if(!event){el.className='organizer-empty';el.textContent='No upcoming adventures.';return;}var id=event.eventId||event.EventId||'';var title=event.title||event.Title||'Adventure';var date=event.dateDisplay||event.startDateDisplay||event.StartDate||'';var location=event.location||event.Location||event.LocationName||'';el.className='organizer-next-card';el.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(date)+(location?' · '+esc(location):'')+'</p><a href="'+eventUrl(id)+'">View public adventure →</a>';}
  function renderAlerts(items){var el=byId('attentionList');if(!el)return;if(!items.length){el.innerHTML='<div class="organizer-empty">No current alerts.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.title||'Adventure')+'</strong><p>'+esc(item.message||'Needs attention')+'</p><small>'+esc(item.startDate||'')+'</small></div>';}).join('');}
  function taskDueLabel(item){if(item.dueToday)return 'Due today';var due=String(item.dueDate||'');if(!due)return 'Upcoming';var target=new Date(due+'T12:00:00'),today=new Date();today.setHours(12,0,0,0);var days=Math.round((target.getTime()-today.getTime())/86400000);if(days===1)return 'Due tomorrow';if(days>1&&days<7)return 'Due in '+days+' days';return 'Due '+due;}
  function renderTasks(items){var el=byId('taskList');if(!el)return;if(!items.length){el.innerHTML='<div class="organizer-empty">No organizer tasks are due in the next 30 days.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){var id=item.eventId||'';return '<div class="organizer-list-item organizer-task-item"><div class="organizer-task-copy"><strong>'+esc(item.label||'Organizer task')+'</strong><p>'+esc(item.eventTitle||'Adventure')+'</p><small>'+esc(taskDueLabel(item))+'</small></div><div class="organizer-task-actions"><a href="'+emailTaskUrl(item)+'">Send Reminder</a><a class="is-secondary" href="'+editEventUrl(id)+'">Edit Event</a><a class="is-secondary" href="'+eventUrl(id)+'">View</a></div></div>';}).join('');}
  function renderRegistrations(items){var el=byId('registrationList');if(!el)return;if(!items.length){el.innerHTML='<div class="organizer-empty">No recent registrations.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.name||'Community member')+'</strong><p>'+esc(item.eventTitle||'Adventure')+' · '+esc(item.people||1)+' '+plural(item.people,'person','people')+'</p><small>'+esc(item.createdAt||'')+' · '+esc(item.status||'Registered')+'</small></div>';}).join('');}

  async function loadDashboard(session){if(!session||!session.token){showAccess();return;}setState('loading');try{var r=await fetch('/api/organizer-dashboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session:session.token})});var p=await r.json();window.iwpOrganizerDashboardCallback(p);}catch(e){showAccess('Unable to reach the organizer service. Please sign in again.');}}
  async function handleGoogleCredential(response){var credential=response&&response.credential?String(response.credential):'';if(!credential){showAccess('Google did not return a sign-in credential. Please try again.');return;}setState('loading');try{var r=await fetch('/api/organizer-session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:credential})});var p=await r.json();window.iwpOrganizerSessionCallback(p);}catch(e){showAccess('Unable to start the organizer session. Please try again.');}}
  function renderGoogleButton(){var target=byId('googleSignInButton');if(!target||target.dataset.rendered==='true')return;if(!clientId){text('organizerAccessMessage','The Google sign-in client has not been configured.');return;}if(!(window.google&&google.accounts&&google.accounts.id)){setTimeout(renderGoogleButton,150);return;}google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential,auto_select:false,cancel_on_tap_outside:true});google.accounts.id.renderButton(target,{theme:'outline',size:'large',shape:'pill',text:'signin_with',width:300});target.dataset.rendered='true';}

  async function restoreRememberedSession(){
    setState('loading');
    try{
      var r=await fetch('/api/organizer-session-restore',{method:'GET',credentials:'same-origin',headers:{'accept':'application/json'}});
      var p=await r.json();
      if(r.ok&&p&&p.success&&p.authorized){
        var session=writeSession(p);
        if(session){loadDashboard(session);return;}
      }
    }catch(ignore){}
    showAccess();
  }

  var existing=readSession();if(existing)loadDashboard(existing);else restoreRememberedSession();
})();
