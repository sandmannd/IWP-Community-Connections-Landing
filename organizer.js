(function(){
  'use strict';
  var config=window.IWP_SITE_CONFIG||{};
  var appUrl=String(config.appUrl||'');
  ['openBuilderTop','openBuilderBottom','organizerSignIn'].forEach(function(id){var el=document.getElementById(id);if(el)el.href=appUrl||'#';});

  var menu=document.querySelector('.mobile-menu-button');var nav=document.getElementById('mainNavigation');
  if(menu&&nav){menu.addEventListener('click',function(){var open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));nav.classList.toggle('is-open',!open);menu.textContent=open?'Menu':'Close';});}

  function text(id,value){var el=document.getElementById(id);if(el)el.textContent=value==null?'':String(value);}
  function esc(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];});}
  function plural(n,one,many){return Number(n)===1?one:many;}
  function eventUrl(id){return '/adventure.html?id='+encodeURIComponent(id||'');}
  function showAccess(message){document.getElementById('organizerLoading').hidden=true;var card=document.getElementById('organizerAccess');card.hidden=false;text('organizerAccessMessage',message||'Open the Adventure Builder and sign in with your approved Google account.');}

  window.iwpOrganizerDashboardCallback=function(payload){
    document.getElementById('organizerLoading').hidden=true;
    if(!payload||!payload.success||!payload.authorized){showAccess(payload&&payload.error);return;}
    var data=payload.dashboard||{};
    document.getElementById('organizerDashboard').hidden=false;
    if(data.greetingName)text('organizerGreeting','Welcome back, '+data.greetingName);
    text('healthTitle',data.health&&data.health.title);text('healthMessage',data.health&&data.health.message);text('dashboardUpdated','Updated '+(data.updatedAt||'just now'));
    document.getElementById('organizerHealth').classList.toggle('is-warning',!(data.health&&data.health.ok));
    text('statUpcoming',data.upcomingEvents||0);text('statWeek',(data.eventsThisWeek||0)+' '+plural(data.eventsThisWeek,'adventure','adventures')+' this week');
    text('statPeople',data.totalParticipants||0);text('statAttention',data.attentionCount||0);text('attentionBadge',data.attentionCount||0);
    text('statPayments',data.pendingPayments||0);text('statPaymentEvents','Across '+(data.paymentEventCount||0)+' '+plural(data.paymentEventCount,'adventure','adventures'));
    text('statWaitlist',data.waitlistedPeople||0);text('statWaitlistEvents','Across '+(data.waitlistEventCount||0)+' '+plural(data.waitlistEventCount,'adventure','adventures'));
    text('statDrafts',data.draftCount||0);
    renderNext(data.nextEvent);renderAlerts(data.alerts||[]);renderTasks(data.todayTasks||[]);renderRegistrations(data.recentRegistrations||[]);
  };

  function renderNext(event){var el=document.getElementById('nextAdventure');if(!event){el.className='organizer-empty';el.textContent='No upcoming adventures.';return;}var id=event.eventId||event.EventId||'';var title=event.title||event.Title||'Adventure';var date=event.dateDisplay||event.startDateDisplay||event.StartDate||'';var location=event.location||event.Location||'';el.className='organizer-next-card';el.innerHTML='<h3>'+esc(title)+'</h3><p>'+esc(date)+(location?' · '+esc(location):'')+'</p><a href="'+eventUrl(id)+'">View public adventure →</a>';}
  function renderAlerts(items){var el=document.getElementById('attentionList');if(!items.length){el.innerHTML='<div class="organizer-empty">No current alerts.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.title||'Adventure')+'</strong><p>'+esc(item.message||'Needs attention')+'</p><small>'+esc(item.startDate||'')+'</small></div>';}).join('');}
  function renderTasks(items){var el=document.getElementById('taskList');if(!items.length){el.innerHTML='<div class="organizer-empty">No tasks are due.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.label||'Organizer task')+'</strong><p>'+esc(item.eventTitle||'Adventure')+'</p><small>'+(item.overdue?'Overdue · ':'Due ')+esc(item.dueDate||'')+'</small></div>';}).join('');}
  function renderRegistrations(items){var el=document.getElementById('registrationList');if(!items.length){el.innerHTML='<div class="organizer-empty">No recent registrations.</div>';return;}el.innerHTML=items.slice(0,8).map(function(item){return '<div class="organizer-list-item"><strong>'+esc(item.name||'Community member')+'</strong><p>'+esc(item.eventTitle||'Adventure')+' · '+esc(item.people||1)+' '+plural(item.people,'person','people')+'</p><small>'+esc(item.createdAt||'')+' · '+esc(item.status||'Registered')+'</small></div>';}).join('');}

  function load(){if(!appUrl){showAccess('The Adventure Builder URL has not been configured.');return;}var script=document.createElement('script');script.async=true;script.src=appUrl+(appUrl.indexOf('?')===-1?'?':'&')+'api=organizer-dashboard&callback=iwpOrganizerDashboardCallback&_='+Date.now();script.onerror=function(){showAccess('Unable to reach the organizer service. Open Adventure Builder and confirm you are signed in.');};document.head.appendChild(script);setTimeout(function(){if(!document.getElementById('organizerLoading').hidden)showAccess('The organizer service took too long to respond. Open Adventure Builder and sign in, then return here.');},15000);}
  load();
})();
