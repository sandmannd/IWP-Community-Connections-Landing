const DAY=86400000;
function parse(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))throw Error('Invalid event start date.');const ms=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==s)throw Error('Invalid event date.');return ms;}
const iso=ms=>new Date(ms).toISOString().slice(0,10);
function nthWeekday(y,m,weekday,ordinal){const first=new Date(Date.UTC(y,m,1)).getUTCDay();const day=ordinal===-1?new Date(Date.UTC(y,m+1,0)).getUTCDate()-((new Date(Date.UTC(y,m+1,0)).getUTCDay()-weekday+7)%7):1+(weekday-first+7)%7+7*(ordinal-1);const max=new Date(Date.UTC(y,m+1,0)).getUTCDate();return day>=1&&day<=max?Date.UTC(y,m,day):null;}
function easter(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return iso(Date.UTC(year,month-1,day));}
function observed(y,m,d){const ms=Date.UTC(y,m-1,d),dow=new Date(ms).getUTCDay();return iso(ms+(dow===6?-DAY:dow===0?DAY:0));}
function holidaySet(year){const set=new Set();const add=s=>set.add(s);const fixed=[[1,1],[6,19],[7,4],[11,11],[12,25]];for(const [m,d] of fixed){add(iso(Date.UTC(year,m-1,d)));add(observed(year,m,d));}
 // Adjacent-year New Year's observed days may land in December.
 add(observed(year+1,1,1));
 const nth=(m,w,n)=>iso(nthWeekday(year,m-1,w,n));
 add(nth(1,1,3));add(nth(2,1,3));add(nth(5,1,-1));add(nth(9,1,1));add(nth(10,1,2));add(nth(11,4,4));
 add(easter(year));add(nth(5,0,2));add(nth(6,0,3));add(iso(Date.UTC(year,9,31)));
 // Blackouts: Dec 24–31 and Jan 1–7 inclusive.
 for(let d=24;d<=31;d++)add(iso(Date.UTC(year,11,d)));
 for(let d=1;d<=7;d++)add(iso(Date.UTC(year,0,d)));
 return set;
}
export function generateDates({start,frequency,weekday,ordinal,count,skipHolidays=true,allowHolidays=false,blackouts=[],existing=[]}){
 const startMs=parse(start),today=Date.now(),floor=Math.max(startMs,Date.UTC(new Date(today).getUTCFullYear(),new Date(today).getUTCMonth(),new Date(today).getUTCDate()));const dates=[],skipped=[],seen=new Set(existing),cache=new Map();
 function blocked(s){const y=Number(s.slice(0,4));if(!cache.has(y))cache.set(y,holidaySet(y));return cache.get(y).has(s)||blackouts.some(b=>s>=b.start_date&&s<=b.end_date);}
 for(let step=0;step<2600&&dates.length<count;step++){
  let ms;
  if(frequency==='weekly'||frequency==='biweekly'){
   const period=frequency==='biweekly'?14:7;
   // Anchor the two-week cycle to the template event's start week, not today's week.
   const first=startMs+((weekday-new Date(startMs).getUTCDay()+7)%7)*DAY;
   const offset=Math.max(0,Math.ceil((floor-first)/(period*DAY)));
   ms=first+(offset+step)*period*DAY;
  }
  else{const dt=new Date(floor),month=dt.getUTCMonth()+step,year=dt.getUTCFullYear()+Math.floor(month/12);ms=nthWeekday(year,month%12,weekday,ordinal);}
  if(ms===null||ms<floor)continue;const s=iso(ms);if(seen.has(s))continue;
  if(skipHolidays&&!allowHolidays&&blocked(s)){skipped.push(s);continue;}
  dates.push(s);
 }
 return {dates,skipped};
}
