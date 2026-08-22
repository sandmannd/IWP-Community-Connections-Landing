(function(){
'use strict';
var cfg=window.IWP_SITE_CONFIG||{},appUrl=String(cfg.appUrl||''),sessionKey='iwpOrganizerSessionV1',request=0,timer=0,eventId=new URLSearchParams(location.search).get('id')||'',pendingUpload=null,isDirty=false,isSaving=false,currentEventStatus='draft',saveMode='draft';
function clearPublicAdventureCache(id){try{if(id)localStorage.removeItem('iwpAdventureDetailCacheV1:'+String(id));localStorage.removeItem('iwpLandingDataCacheV1')}catch(e){}}
function byId(id){return document.getElementById(id)} function text(id,v){var e=byId(id);if(e)e.textContent=v==null?'':String(v)}
function areas(){var a=[];try{a.push(sessionStorage)}catch(e){}try{a.push(localStorage)}catch(e){}return a}
function readSession(){for(var i=0;i<areas().length;i++){try{var raw=areas()[i].getItem(sessionKey)||'',s=raw?JSON.parse(raw):null;if(s&&s.token&&s.expiresAt&&Date.parse(s.expiresAt)>Date.now())return s;areas()[i].removeItem(sessionKey)}catch(e){}}return null}
function clearTimer(){if(timer){clearTimeout(timer);timer=0}} function remove(prefix){document.querySelectorAll('script[id^="'+prefix+'"]').forEach(function(n){n.remove()})}
function state(name){byId('builderLoading').hidden=name!=='loading';byId('builderAccess').hidden=name!=='access';byId('builderForm').hidden=name!=='form';byId('organizerSignOutTop').hidden=name!=='form'}
function markDirty(){if(isSaving)return;isDirty=true;text('builderStatus','Unsaved changes');text('builderMessage','Save this draft before leaving so your changes are not lost.')}
function leaveBuilder(){if(isDirty&&!window.confirm('You have unsaved changes. Leave without saving?'))return;isDirty=false;window.location.href='/organizer-adventures.html'}
function fail(msg){clearTimer();state('access');text('builderAccessMessage',msg||'Open the Organizer Command Center and sign in first.')}
function showValidationPopup(title,message,focusId){text('validationDialogTitle',title||'Check the adventure details');text('validationDialogMessage',message||'Please correct the highlighted information and try again.');var dialog=byId('validationDialog');if(dialog&&typeof dialog.showModal==='function')dialog.showModal();else window.alert(message);if(focusId){var target=byId(focusId);if(target)window.setTimeout(function(){target.focus()},50)}}
function jsonp(route,callback,params,prefix){clearTimer();remove(prefix);var s=document.createElement('script');s.id=prefix+(++request);var q='api='+encodeURIComponent(route)+'&callback='+encodeURIComponent(callback);Object.keys(params||{}).forEach(function(k){q+='&'+encodeURIComponent(k)+'='+encodeURIComponent(params[k])});s.src=appUrl+(appUrl.indexOf('?')<0?'?':'&')+q+'&_='+Date.now();s.onerror=function(){fail('Unable to reach the organizer service. Please sign in again.')};document.head.appendChild(s);timer=setTimeout(function(){fail('The organizer service took too long to respond.')},20000)}
function bool(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1'}
function apiDateToDisplay(v){var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[2]+'/'+m[3]+'/'+m[1]:String(v||'')}
function displayDateToApi(v){var m=String(v||'').trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);if(!m)return '';var y=m[3].length===2?'20'+m[3]:m[3],mo=('0'+m[1]).slice(-2),d=('0'+m[2]).slice(-2);return y+'-'+mo+'-'+d}
function normalizeDateInput(e){var v=e.value.replace(/[^0-9]/g,'').slice(0,8);if(v.length>=5)e.value=v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);else if(v.length>=3)e.value=v.slice(0,2)+'/'+v.slice(2);else e.value=v}
function finishDateInput(e){var raw=e.value.trim();if(!raw)return;var parts=raw.split(/[\/-]/);if(parts.length===3){var y=parts[2];if(y.length===2)y='20'+y;e.value=('0'+parts[0]).slice(-2)+'/'+('0'+parts[1]).slice(-2)+'/'+y}}
function makeTime(field){var host=document.querySelector('[data-time-field="'+field+'"]'),h=document.createElement('select'),m=document.createElement('select'),a=document.createElement('select');h.setAttribute('aria-label','Hour');m.setAttribute('aria-label','Minute');a.setAttribute('aria-label','AM or PM');h.innerHTML='<option value="">Hour</option>'+Array.from({length:12},function(_,i){return '<option value="'+(i+1)+'">'+(i+1)+'</option>'}).join('');m.innerHTML='<option value="">Minute</option>'+Array.from({length:60},function(_,i){return '<option value="'+('0'+i).slice(-2)+'">'+('0'+i).slice(-2)+'</option>'}).join('');a.innerHTML='<option value="AM">AM</option><option value="PM">PM</option>';host.append(h,m,a);function currentValue(){if(!h.value||!m.value)return '';var hour=Number(h.value)%12;if(a.value==='PM')hour+=12;return ('0'+hour).slice(-2)+':'+m.value}function sync(){byId(field).value=currentValue()}[h,m,a].forEach(function(x){x.addEventListener('change',sync)});host._get=function(){sync();return currentValue()};host._set=function(v){var match=String(v||'').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);if(!match){h.value='';m.value='';a.value='AM';sync();return}var hour=Number(match[1]),suffix=match[3]?match[3].toUpperCase():'';if(suffix){a.value=suffix;h.value=String(hour%12||12)}else{a.value=hour>=12?'PM':'AM';h.value=String(hour%12||12)}m.value=match[2];sync()}}
makeTime('StartTime');makeTime('EndTime');
function setValue(id,v){var e=byId(id);if(!e)return;if(e.type==='checkbox')e.checked=bool(v);else if(id==='StartDate'||id==='EndDate')e.value=apiDateToDisplay(v);else e.value=v==null?'':String(v)}
function showImage(url){var box=byId('ImagePreview'),img=byId('ImagePreviewImg');if(url){img.src=url;box.hidden=false}else{img.removeAttribute('src');box.hidden=true}}
function fill(event){event=event||{};['Title','EventType','ImageUrl','StartDate','EndDate','LocationName','Address','Description','WhatToExpect','WhatToBring','Provided','SpecialNotes','AdultCost','ChildCost','TicketPurchaseLink','MaxParticipants','OrganizerName','OrganizerEmail','OrganizerPhone','RegistrationRequired','ChildrenAllowed','WaitlistEnabled','FreeEvent','BuyOwnTicketsEnabled'].forEach(function(k){setValue(k,event[k])});document.querySelector('[data-time-field="StartTime"]')._set(event.StartTime);document.querySelector('[data-time-field="EndTime"]')._set(event.EndTime);showImage(event.ImageUrl);if(!eventId){byId('RegistrationRequired').checked=true;byId('FreeEvent').checked=true}updatePaidOptions()}
function types(list,event){var select=byId('EventType'),values=(list||[]).map(function(x){return typeof x==='string'?x:(x.Name||x.EventType||x.Type||'')}).filter(Boolean),current=event&&event.EventType||'';if(current&&values.indexOf(current)<0)values.unshift(current);select.innerHTML='<option value="">Choose a type</option>'+values.map(function(v){return '<option value="'+String(v).replace(/"/g,'&quot;')+'">'+v+'</option>'}).join('')}
window.iwpOrganizerBuilderCallback=function(p){clearTimer();remove('builderLoad');if(!p||!p.success){fail(p&&p.error);return}types(p.eventTypes,p.event);fill(p.event);currentEventStatus=String(p.event&&(p.event.Status||p.event.status)||'draft').toLowerCase();text('builderHeading',p.event?'Edit Adventure':'Create Adventure');var danger=byId('adventureDangerZone');if(danger)danger.hidden=!(p.event&&eventId);var pub=byId('publishAdventureButton'),save=byId('saveAdventureButton');if(pub)pub.hidden=currentEventStatus==='published';if(save)save.textContent=currentEventStatus==='published'?'Update Adventure':'Save Draft';if(currentEventStatus==='published'){text('builderStatus','Published adventure');text('builderMessage','Save changes to update the live adventure.')}state('form');isDirty=false};
async function publishSavedAdventure(){
  var session=readSession();
  if(!session||!eventId)throw new Error('The saved adventure or organizer session is missing.');
  var response=await fetch('/api/organizer-event-action',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({appUrl:appUrl,session:(session.legacyToken||session.token),eventId:eventId,eventAction:'publish'})
  });
  var result=await response.json();
  if(!response.ok||!result||!result.success)throw new Error(result&&result.error||'Adventure could not be published.');
  return result;
}
window.iwpOrganizerSaveAdventureCallback=async function(p){clearTimer();remove('builderSave');var b=byId('saveAdventureButton'),pub=byId('publishAdventureButton');if(!p||!p.success){isSaving=false;b.disabled=false;if(pub)pub.disabled=false;b.textContent=currentEventStatus==='published'?'Update Adventure':'Save Draft';if(pub)pub.textContent='Publish Adventure';text('builderStatus',saveMode==='published'?'Publish failed':'Save failed');text('builderMessage',p&&p.error||'Unable to save the adventure.');return}eventId=p.eventId||eventId;clearPublicAdventureCache(eventId);isDirty=false;if(saveMode==='published'){try{text('builderStatus','Publishing adventure');text('builderMessage','Making the saved adventure live in Community Connections…');var result=await publishSavedAdventure();currentEventStatus='published';clearPublicAdventureCache(eventId);text('builderStatus','Adventure published');text('builderMessage','Adventure is live. Returning to Manage Adventures…');window.setTimeout(function(){window.location.replace('/organizer-adventures.html?published='+encodeURIComponent(eventId)+'&v=m6.21.3')},300);return}catch(err){isSaving=false;b.disabled=false;if(pub){pub.disabled=false;pub.textContent='Publish Adventure'}b.textContent='Save Draft';text('builderStatus','Publish failed');text('builderMessage',err&&err.message||'The draft saved, but it could not be published. Try Publish Adventure again.');return}}isSaving=false;b.disabled=false;if(pub)pub.disabled=false;b.textContent=currentEventStatus==='published'?'Update Adventure':'Save Draft';text('builderStatus',p.created?'Draft created':'Draft updated');text('builderMessage','Adventure saved. Returning to Manage Adventures…');window.setTimeout(function(){window.location.replace('/organizer-adventures.html?saved='+encodeURIComponent(eventId)+'&v=m6.21.3')},250)};
function payload(){var out={};['Title','EventType','ImageUrl','LocationName','Address','Description','WhatToExpect','WhatToBring','Provided','SpecialNotes','AdultCost','ChildCost','TicketPurchaseLink','MaxParticipants','OrganizerName','OrganizerEmail','OrganizerPhone'].forEach(function(k){out[k]=byId(k).value.trim()});out.StartDate=displayDateToApi(byId('StartDate').value);out.EndDate=displayDateToApi(byId('EndDate').value);out.StartTime=document.querySelector('[data-time-field="StartTime"]')._get();out.EndTime=document.querySelector('[data-time-field="EndTime"]')._get();['RegistrationRequired','ChildrenAllowed','WaitlistEnabled','FreeEvent','BuyOwnTicketsEnabled'].forEach(function(k){out[k]=byId(k).checked});out.PaidEvent=!out.FreeEvent;if(out.FreeEvent){out.AdultCost='';out.ChildCost='';out.BuyOwnTicketsEnabled=false;out.TicketPurchaseLink=''}else if(out.BuyOwnTicketsEnabled){out.AdultCost='';out.ChildCost=''}out.Status=currentEventStatus==='published'?'Published':'Draft';return out}

function updatePaidOptions(){var free=byId('FreeEvent').checked,buyOwn=byId('BuyOwnTicketsEnabled').checked,children=byId('ChildrenAllowed').checked;byId('paidEventOptions').hidden=free;byId('setCostFields').hidden=free||buyOwn;byId('ticketPurchaseFields').hidden=free||!buyOwn;byId('childCostField').hidden=!children;if(free){byId('BuyOwnTicketsEnabled').checked=false;buyOwn=false}}
function normalizeMoneyInput(e){var value=String(e.value||'').replace(/[^0-9.]/g,''),parts=value.split('.');if(parts.length>2)value=parts.shift()+'.'+parts.join('');e.value=value}
function timeToMinutes(value){var match=String(value||'').match(/^(\d{1,2}):(\d{2})/);return match?(Number(match[1])*60+Number(match[2])):null}
function validateSaveData(data){var title=byId('Title').value.trim(),type=byId('EventType').value;if(!title){showValidationPopup('Adventure name required','Enter an adventure name before saving.','Title');return false}if(!type){showValidationPopup('Adventure type required','Choose an adventure type before saving.','EventType');return false}if(!data.StartDate||!data.EndDate){showValidationPopup('Check the dates','Enter both dates as MM/DD/YYYY.','StartDate');return false}if(data.EndDate<data.StartDate){showValidationPopup('Check the dates','The end date and time cannot be before the start date and time.','EndDate');return false}var startMinutes=timeToMinutes(data.StartTime),endMinutes=timeToMinutes(data.EndTime);if(data.StartDate===data.EndDate&&startMinutes!==null&&endMinutes!==null&&endMinutes<=startMinutes){showValidationPopup('Check the times','For a one-day adventure, the end time must be later than the start time.','EndTime');return false}if(saveMode==='published'){var organizerEmail=String(data.OrganizerEmail||'').trim();if(!organizerEmail){showValidationPopup('Organizer email required','Enter the organizer email before publishing so registration notices and participant replies have somewhere to go.','OrganizerEmail');return false}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizerEmail)){showValidationPopup('Check organizer email','Enter a valid organizer email before publishing.','OrganizerEmail');return false}}return true}
async function submitSave(){var session=readSession();if(!session){fail();return}var data=payload();if(!validateSaveData(data))return;var b=byId('saveAdventureButton'),pub=byId('publishAdventureButton');isSaving=true;b.disabled=true;if(pub)pub.disabled=true;if(saveMode==='published'){if(pub)pub.textContent='Publishing…';text('builderStatus','Publishing adventure');text('builderMessage','Making this adventure live in Community Connections.')}else{b.textContent='Saving…';text('builderStatus',currentEventStatus==='published'?'Updating adventure':'Saving draft');text('builderMessage',currentEventStatus==='published'?'Updating the live Community Connections adventure.':'Writing the adventure to the Community Connections database.')}try{var response=await fetch('/api/organizer-save-adventure',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({session:session.token,eventId:eventId,data:data})});var result=await response.json();if(!response.ok||!result.success)throw new Error(result.error||'Unable to save the adventure.');window.iwpOrganizerSaveAdventureCallback(result)}catch(err){window.iwpOrganizerSaveAdventureCallback({success:false,error:err&&err.message||'Unable to save the adventure.'})}}
byId('builderForm').addEventListener('submit',function(e){e.preventDefault();saveMode=currentEventStatus==='published'?'published':'draft';if(pendingUpload)uploadImage(pendingUpload);else submitSave()});
byId('publishAdventureButton').addEventListener('click',function(){saveMode='published';if(!window.confirm('Publish this adventure now? It will become visible to Community Connections members.'))return;if(pendingUpload)uploadImage(pendingUpload);else submitSave()});

byId('FreeEvent').addEventListener('change',updatePaidOptions);byId('BuyOwnTicketsEnabled').addEventListener('change',updatePaidOptions);byId('ChildrenAllowed').addEventListener('change',updatePaidOptions);['AdultCost','ChildCost'].forEach(function(id){byId(id).addEventListener('input',function(){normalizeMoneyInput(this)})});
byId('builderForm').addEventListener('input',markDirty);byId('builderForm').addEventListener('change',markDirty);byId('cancelAdventureButton').addEventListener('click',leaveBuilder);window.addEventListener('beforeunload',function(e){if(!isDirty||isSaving)return;e.preventDefault();e.returnValue='' });
['StartDate','EndDate'].forEach(function(id){var e=byId(id);e.addEventListener('input',function(){normalizeDateInput(e)});e.addEventListener('blur',function(){finishDateInput(e)})});
function resizeImage(file,done,failCb){var reader=new FileReader();reader.onerror=function(){failCb('The selected image could not be read.')};reader.onload=function(){var img=new Image();img.onerror=function(){failCb('The selected file is not a usable image.')};img.onload=function(){var max=1000,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);done(canvas.toDataURL('image/jpeg',.68))};img.src=reader.result};reader.readAsDataURL(file)}
byId('ImageFile').addEventListener('change',function(){var file=this.files&&this.files[0];if(!file)return;resizeImage(file,function(data){pendingUpload={file:file,dataUrl:data};markDirty();showImage(data);text('builderStatus','Image ready');text('builderMessage','The image will upload when you save the draft.')},function(msg){text('builderStatus','Image error');text('builderMessage',msg)})});
byId('RemoveImage').addEventListener('click',function(){markDirty();pendingUpload=null;byId('ImageFile').value='';byId('ImageUrl').value='';showImage('')});
function uploadImage(item){
  var session=readSession();if(!session){fail();return}
  var data=payload();if(!validateSaveData(data))return;
  var b=byId('saveAdventureButton');
  isSaving=true;b.disabled=true;b.textContent='Uploading image…';
  text('builderStatus','Uploading image');
  text('builderMessage','Uploading the image securely through Community Connections.');
  fetch('/api/organizer-image-upload',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'same-origin',
    body:JSON.stringify({
      session:session.token,
      fileName:item.file.name||'adventure-image.jpg',
      mimeType:'image/jpeg',
      dataUrl:item.dataUrl
    })
  }).then(function(response){
    return response.json().catch(function(){throw new Error('The image service returned an invalid response.')}).then(function(result){
      if(!response.ok||!result||!result.success)throw new Error(result&&(result.error||result.message)||'The image could not be uploaded.');
      return result;
    });
  }).then(function(result){
    byId('ImageUrl').value=result.imageUrl||'';
    byId('ImageFile').value='';
    pendingUpload=null;
    showImage(result.imageUrl||'');
    text('builderStatus','Image uploaded');
    text('builderMessage','Saving the adventure draft now…');
    isSaving=false;
    submitSave();
  }).catch(function(error){
    isSaving=false;b.disabled=false;b.textContent='Save Draft';
    text('builderStatus','Image upload failed');
    text('builderMessage',error&&error.message?error.message:'The image could not be uploaded.');
  });
}
function setLifecycleBusy(busy,label){
  ['confirmCancelAdventure','confirmDeleteAdventure','openCancelAdventureDialog','openDeleteAdventureDialog'].forEach(function(id){var button=byId(id);if(button)button.disabled=!!busy});
  if(label){text('builderStatus',label);text('builderMessage','Please wait while Community Connections updates this adventure.');}
}
function lifecycleAction(action){
  var session=readSession();if(!session){fail();return}
  if(!eventId){showValidationPopup('Save the adventure first','Create the adventure before trying to cancel or delete it.');return}
  setLifecycleBusy(true,action==='delete'?'Deleting adventure':'Cancelling adventure');
  fetch('/api/organizer-event-action',{
    method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
    body:JSON.stringify({appUrl:appUrl,session:(session.legacyToken||session.token),eventId:eventId,eventAction:action})
  }).then(function(response){return response.json().catch(function(){throw new Error('The adventure service returned an invalid response.')}).then(function(result){if(!response.ok||!result||!result.success)throw new Error(result&&(result.error||result.message)||'The adventure could not be updated.');return result})})
  .then(function(result){
    isDirty=false;isSaving=false;
    var cancelDialog=byId('cancelAdventureDialog'),deleteDialog=byId('deleteAdventureDialog');
    if(cancelDialog&&cancelDialog.open)cancelDialog.close();if(deleteDialog&&deleteDialog.open)deleteDialog.close();
    text('builderStatus',action==='delete'?'Adventure deleted':'Adventure cancelled');text('builderMessage',result.message||'The adventure was updated. Returning to Manage Adventures…');
    window.setTimeout(function(){window.location.replace('/organizer-adventures.html?'+(action==='delete'?'deleted':'cancelled')+'='+encodeURIComponent(eventId))},250);
  }).catch(function(error){
    setLifecycleBusy(false);var deleteConfirm=byId('deleteAdventureConfirmation');if(byId('confirmDeleteAdventure'))byId('confirmDeleteAdventure').disabled=!deleteConfirm||deleteConfirm.value.trim().toUpperCase()!=='DELETE';
    text('builderStatus','Adventure action failed');text('builderMessage',error&&error.message?error.message:'The adventure could not be updated.');
    showValidationPopup('Adventure action failed',error&&error.message?error.message:'The adventure could not be updated.');
  });
}
function aiDraft(target,keepOpen){var title=byId('Title').value.trim()||'this Community Connections adventure',type=byId('EventType').value||'community adventure',location=byId('LocationName').value.trim(),date=byId('StartDate').value.trim(),base='Join fellow Veterans, First Responders, Front-Line Workers, and their families for '+title+', a member-organized '+type.toLowerCase()+(location?' at '+location:'')+(date?' on '+date:'')+'. This adventure is about getting out, connecting with great people, sharing some laughs, and taking a well-earned break from everyday life.';var drafts={Description:base+' Whether this is your first time joining us or you have been part of Community Connections before, you are welcome to come be part of it.',WhatToExpect:'Expect a relaxed, welcoming atmosphere with plenty of time to connect, have fun, and enjoy the adventure at your own pace. Final meetup instructions and any important updates will be shared with registered participants.',WhatToBring:'Bring weather-appropriate clothing, any personal items you need for the day, water, and a good attitude. Check the special notes for adventure-specific equipment or requirements.',SpecialNotes:'This is a member-organized Community Connections adventure and is not facilitated, monitored, or organized by IWP staff. Please watch for organizer updates before the event.'};byId(target).value=drafts[target]||base;markDirty();if(!keepOpen)byId('aiHelpDialog').close();text('builderStatus','AI draft added');text('builderMessage','Review and personalize the wording before saving.')}
function selectedAiTargets(){return Array.prototype.slice.call(document.querySelectorAll('[data-ai-select]:checked')).map(function(x){return x.value})}
function updateAiSelection(){var boxes=Array.prototype.slice.call(document.querySelectorAll('[data-ai-select]')),selected=boxes.filter(function(x){return x.checked}).length,all=byId('aiSelectAll');if(all){all.checked=selected===boxes.length&&boxes.length>0;all.indeterminate=selected>0&&selected<boxes.length}var run=byId('aiGenerateSelected');if(run)run.disabled=selected===0;text('aiHelpStatus',selected?selected+' section'+(selected===1?'':'s')+' selected.':'Choose one or more sections.')}
byId('aiHelpButton').addEventListener('click',function(){updateAiSelection();byId('aiHelpDialog').showModal()});document.querySelectorAll('[data-ai-target]').forEach(function(b){b.addEventListener('click',function(){aiDraft(b.dataset.aiTarget)})});document.querySelectorAll('[data-ai-select]').forEach(function(c){c.addEventListener('change',updateAiSelection)});byId('aiSelectAll').addEventListener('change',function(){var checked=this.checked;document.querySelectorAll('[data-ai-select]').forEach(function(c){c.checked=checked});updateAiSelection()});byId('aiGenerateSelected').addEventListener('click',function(){var targets=selectedAiTargets();if(!targets.length){updateAiSelection();return}targets.forEach(function(target){aiDraft(target,true)});byId('aiHelpDialog').close();text('builderStatus','AI drafts added');text('builderMessage',targets.length+' selected sections were filled in. Review and personalize the wording before saving.')});
var openCancel=byId('openCancelAdventureDialog'),openDelete=byId('openDeleteAdventureDialog'),cancelDialog=byId('cancelAdventureDialog'),deleteDialog=byId('deleteAdventureDialog'),deleteConfirmation=byId('deleteAdventureConfirmation');
if(openCancel)openCancel.addEventListener('click',function(){if(isDirty&&!window.confirm('You have unsaved changes. Cancel the saved version of this adventure anyway?'))return;cancelDialog.showModal()});
if(byId('closeCancelAdventureDialog'))byId('closeCancelAdventureDialog').addEventListener('click',function(){cancelDialog.close()});
if(byId('confirmCancelAdventure'))byId('confirmCancelAdventure').addEventListener('click',function(){lifecycleAction('cancel')});
if(openDelete)openDelete.addEventListener('click',function(){if(isDirty&&!window.confirm('You have unsaved changes. Permanently delete the saved adventure anyway?'))return;deleteConfirmation.value='';byId('confirmDeleteAdventure').disabled=true;deleteDialog.showModal();window.setTimeout(function(){deleteConfirmation.focus()},50)});
if(byId('closeDeleteAdventureDialog'))byId('closeDeleteAdventureDialog').addEventListener('click',function(){deleteDialog.close()});
if(deleteConfirmation)deleteConfirmation.addEventListener('input',function(){byId('confirmDeleteAdventure').disabled=this.value.trim().toUpperCase()!=='DELETE'});
if(byId('confirmDeleteAdventure'))byId('confirmDeleteAdventure').addEventListener('click',function(){if(deleteConfirmation.value.trim().toUpperCase()!=='DELETE')return;lifecycleAction('delete')});
byId('validationDialogClose').addEventListener('click',function(){byId('validationDialog').close()});
byId('organizerSignOutTop').addEventListener('click',function(){areas().forEach(function(a){try{a.removeItem(sessionKey)}catch(e){}});location.href='/organizer.html'});
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='s'){e.preventDefault();var button=byId('saveAdventureButton');if(button&&!button.disabled){window.IWPToast&&window.IWPToast('Saving adventure draft…','info','Save Draft');button.click()}}});
async function loadBuilder(){var session=readSession();if(!session){fail();return}try{var response=await fetch('/api/organizer-builder-data',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({session:session.token,eventId:eventId})});var result=await response.json();if(!response.ok||!result.success)throw new Error(result.error||'Unable to load Adventure Builder.');window.iwpOrganizerBuilderCallback(result)}catch(err){fail(err&&err.message||'Unable to load Adventure Builder.')}}
var session=readSession();if(!session){fail()}else loadBuilder();
})();
