(function(){'use strict';
function ensureRegion(){var r=document.getElementById('iwpToastRegion');if(r)return r;r=document.createElement('div');r.id='iwpToastRegion';r.className='iwp-toast-region';r.setAttribute('aria-live','polite');r.setAttribute('aria-atomic','true');document.body.appendChild(r);return r}
window.IWPToast=function(message,type,title,timeout){var region=ensureRegion(),toast=document.createElement('div');toast.className='iwp-toast '+(type||'info');var strong=document.createElement('strong');strong.textContent=title||(type==='success'?'Success':type==='error'?'Something went wrong':type==='warning'?'Heads up':'Community Connections');var p=document.createElement('p');p.textContent=String(message||'');var close=document.createElement('button');close.type='button';close.setAttribute('aria-label','Dismiss notification');close.textContent='×';close.addEventListener('click',function(){toast.remove()});toast.append(strong,p,close);region.appendChild(toast);setTimeout(function(){if(toast.isConnected)toast.remove()},Number(timeout||5000));return toast};
var bar=document.createElement('div');bar.className='iwp-route-progress';document.body.appendChild(bar);
document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;var u;try{u=new URL(a.href,location.href)}catch(_){return}if(u.origin!==location.origin||u.pathname===location.pathname&&u.search===location.search||a.target==='_blank'||a.hasAttribute('download'))return;bar.classList.add('is-active');document.body.classList.add('iwp-page-leaving')});
window.addEventListener('pageshow',function(){bar.classList.remove('is-active');document.body.classList.remove('iwp-page-leaving')});
var q=new URLSearchParams(location.search),message='';
if(q.get('saved'))message='Adventure saved successfully.';
else if(q.get('emailSent'))message='Participant email sent successfully.';
else if(q.get('cancelled'))message='Adventure cancelled.';
else if(q.get('deleted'))message='Adventure deleted.';
if(message){window.IWPToast(message,'success');['saved','emailSent','cancelled','deleted'].forEach(function(k){q.delete(k)});history.replaceState(null,'',location.pathname+(q.toString()?'?'+q.toString():'')+location.hash)}

function bindOrganizerMenu(){
  var menu=document.querySelector('.mobile-menu-button'),nav=document.getElementById('mainNavigation');
  if(!menu||!nav||menu.dataset.iwpMenuBound==='1')return;
  menu.dataset.iwpMenuBound='1';
  menu.addEventListener('click',function(){
    var open=menu.getAttribute('aria-expanded')==='true';
    menu.setAttribute('aria-expanded',String(!open));
    nav.classList.toggle('is-open',!open);
    menu.textContent=open?'Menu':'Close';
  });
  function closeMenu(returnFocus){
    if(menu.getAttribute('aria-expanded')!=='true')return;
    menu.setAttribute('aria-expanded','false');
    nav.classList.remove('is-open');
    menu.textContent='Menu';
    if(returnFocus)menu.focus();
  }
  nav.addEventListener('click',function(e){
    if(e.target.closest('a'))closeMenu(false);
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')closeMenu(true);
  });
  document.addEventListener('click',function(e){
    if(menu.getAttribute('aria-expanded')!=='true')return;
    if(menu.contains(e.target)||nav.contains(e.target))return;
    closeMenu(false);
  });
}
bindOrganizerMenu();
})();