(function(){'use strict';
const $=id=>document.getElementById(id),eventId=new URLSearchParams(location.search).get('id');
const card=$('recurrenceCard');if(!card)return;
const session=()=>{for(const storage of [sessionStorage,localStorage]){try{const v=JSON.parse(storage.getItem('iwpOrganizerSessionV1')||'null');if(v?.token)return v.token;}catch(_){}}return '';};
async function api(action,more={}){const r=await fetch('/api/recurring-adventures',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:session(),action,...more})});const d=await r.json();if(!d.success)throw Error(d.error||'Request failed');return d;}
const msg=(s)=>{$('recMessage').textContent=s};
function update(){const f=$('recFrequency').value;$('recWeekWrap').hidden=f!=='monthly';$('recDay').parentElement.hidden=f==='none';$('recCount').parentElement.hidden=f==='none';$('recPreviewButton').disabled=f==='none'||!eventId;$('recGenerateButton').disabled=f==='none'||!eventId;}
$('recFrequency').addEventListener('change',update);update();
function params(){return {eventId,frequency:$('recFrequency').value,ordinal:Number($('recWeek').value),weekday:Number($('recDay').value),count:Number($('recCount').value),skipHolidays:$('recSkipHolidays').checked,allowHolidays:$('recOverride').checked};}
$('recPreviewButton').onclick=async()=>{try{msg('Checking dates…');const d=await api('preview',params());$('recPreview').textContent='Upcoming: '+(d.dates.join(', ')||'none')+(d.skipped.length?' | Holiday/blackout dates skipped: '+d.skipped.join(', '):'');msg('Preview only — nothing created.');}catch(e){msg(e.message)}};
$('recGenerateButton').onclick=async()=>{if(!eventId)return msg('Save the adventure first.');if(!confirm('Create separate adventures for the selected dates? Each will have its own registration list. Existing adventures will not be changed.'))return;try{msg('Creating occurrences…');const d=await api('generate',params());msg('Created '+d.created+' adventures. Open Manage Adventures to review them.');try{localStorage.removeItem('iwpLandingDataCacheV1')}catch(_){}}catch(e){msg(e.message)}};
async function blackouts(){try{const d=await api('blackouts');const el=$('blackoutList');el.replaceChildren();for(const b of d.blackouts){const p=document.createElement('p');p.textContent=b.start_date+' to '+b.end_date+' — '+b.reason+' ';const btn=document.createElement('button');btn.type='button';btn.textContent='Remove';btn.onclick=async()=>{if(!confirm('Remove this blackout? Existing adventures are not changed.'))return;try{await api('remove-blackout',{id:b.blackout_id});await blackouts()}catch(e){msg(e.message)}};p.append(btn);el.append(p);}}catch(e){msg(e.message)}}
$('blackoutAdd').onclick=async()=>{try{await api('add-blackout',{startDate:$('blackoutStart').value,endDate:$('blackoutEnd').value,reason:$('blackoutReason').value});msg('Blackout saved.');await blackouts()}catch(e){msg(e.message)}};
card.querySelector('details').addEventListener('toggle',e=>{if(e.target.open)blackouts()});
if(!eventId)msg('Save this adventure first, then reopen it to generate recurring dates.');
})();
