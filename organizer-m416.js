(function(){
  'use strict';
  var config=window.IWP_SITE_CONFIG||{};
  var appUrl=String(config.appUrl||'');
  var clientId=String(config.googleClientId||'');
  var credentialKey='iwpOrganizerGoogleCredential';
  var requestNumber=0;
  var activeTimeout=0;

  function byId(id){return document.getElementById(id);}
  function text(id,value){var el=byId(id);if(el)el.textContent=value==null?'':String(value);}
  function esc(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];});}
  function plural(n,one,many){return Number(n)===1?one:many;}
  function eventUrl(id){return '/adventure.html?id='+encodeURIComponent(id||'');}
  function clearActiveTimeout(){if(activeTimeout){clearTimeout(activeTimeout);activeTimeout=0;}}
  function removeRequests(){Array.prototype.slice.call(document.querySelectorAll('script[id^="organizerApiRequest"]')).forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node);});}
  function setState(name){
    var loading=byId('organizerLoading'),access=byId('organizerAccess'),dashboard=byId('organizerDashboard');
    if(loading)loading.hidden=name!=='loading';
    if(access)access.hidden=name!=='access';
    if(dashboard)dashboard.hidden=name!=='dashboard';
    var top=byId('organizerSignOutTop');if(top)top.hidden=name!=='dashboard';
  }
  function savedCredential(){try{return sessionStorage.getItem(credentialKey)||'';}catch(ignore){return '';}}
  function saveCredential(value){try{if(value)sessionStorage.setItem(credentialKey,value);else sessionStorage.removeItem(credentialKey);}catch(ignore){}}
  function showAccess(message){clearActiveTimeout();removeRequests();setState('access');text('organizerAccessMessage',message||'Sign in with the approved Google account used for Community Connections.');renderGoogleButton();}
  function signOut(){clearActiveTimeout();removeRequests();saveCredential('');if(window.google&&google.accounts&&google.accounts.id)google.accounts.id.disableAutoSelect();location.href='/organizer.html';}

  var menu=document.querySelector('.mobile-menu-button'),nav=byId('mainNavigation');
  if(menu&&nav){menu.addEventListener('click',function(){var open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));nav.classList.toggle('is-open',!open);menu.textContent=open?'Menu':'Close';});}
  ['organizerSignOutTop','organizerSignOutBottom'].forEach(function(id){var el=byId(id);if(el)el.addEventListener('click',signOut);});

  window.iwpOrganizerDashboardCallback=function(payload){
    clearActiveTimeout();removeRequests();
    if(!payload||payload.success!==true||payload.authorized!==true){
      if(payload&&payload.authenticated&&payload.user&&payload.user.email)saveCredential('');
      showAccess(payload&&payload.error||'Organizer authorization was not accepted.');
      return;
    }
    var data=payload.dashboard||{};
    setState('dashboard');
    try{
      var displayName=(payload.user&&payload.user.name)||data.greetingName||'';
      text('organizerGreeting',displayName?'Welcome back, '+displayName.split(' ')[0]:'Adventure Builder');
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
  function renderTasks(items){var el=byId('taskList');if(!el)return;if(!items.length){el.innerHTML='<div class="organizer-empty">No tasks are due.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.label||'Organizer task')+'</strong><p>'+esc(item.eventTitle||'Adventure')+'</p><small>'+(item.overdue?'Overdue · ':'Due ')+esc(item.dueDate||'')+'</small></div>';}).join('');}
  function renderRegistrations(items){var el=byId('registrationList');if(!el)return;if(!items.length){el.innerHTML='<div class="organizer-empty">No recent registrations.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.name||'Community member')+'</strong><p>'+esc(item.eventTitle||'Adventure')+' · '+esc(item.people||1)+' '+plural(item.people,'person','people')+'</p><small>'+esc(item.createdAt||'')+' · '+esc(item.status||'Registered')+'</small></div>';}).join('');}

  function loadDashboard(credential){
    clearActiveTimeout();removeRequests();
    if(!appUrl){showAccess('The organizer service URL has not been configured.');return;}
    if(!credential){showAccess();return;}
    setState('loading');
    var script=document.createElement('script');script.async=true;script.id='organizerApiRequest'+(++requestNumber);
    script.src=appUrl+(appUrl.indexOf('?')===-1?'?':'&')+'api=organizer-dashboard&callback=iwpOrganizerDashboardCallback&credential='+encodeURIComponent(credential)+'&_='+Date.now();
    script.onerror=function(){showAccess('Unable to reach the organizer service. Please sign in again.');};
    document.head.appendChild(script);
    activeTimeout=setTimeout(function(){var loading=byId('organizerLoading');if(loading&&!loading.hidden)showAccess('The organizer service took too long to respond. Please sign in again.');},20000);
  }
  function handleGoogleCredential(response){var credential=response&&response.credential?String(response.credential):'';if(!credential){showAccess('Google did not return a sign-in credential. Please try again.');return;}saveCredential(credential);loadDashboard(credential);}
  function renderGoogleButton(){var target=byId('googleSignInButton');if(!target||target.dataset.rendered==='true')return;if(!clientId){text('organizerAccessMessage','The Google sign-in client has not been configured.');return;}if(!(window.google&&google.accounts&&google.accounts.id)){setTimeout(renderGoogleButton,150);return;}google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential,auto_select:false,cancel_on_tap_outside:true});google.accounts.id.renderButton(target,{theme:'outline',size:'large',shape:'pill',text:'signin_with',width:300});target.dataset.rendered='true';}

  var existing=savedCredential();if(existing)loadDashboard(existing);else showAccess();
})();
