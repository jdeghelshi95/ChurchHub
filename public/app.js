const app=document.getElementById('app');
const APP_NAME='Church Hub';
const ROLES=['FOH','Lyrics','Livestream','Camera 1','Camera 2','Camera 3','Camera 4','Camera 5','Photos / Editing'];
const GROUP={FOH:'FOH',Lyrics:'Lyrics',Livestream:'Livestream','Camera 1':'CamSteady','Camera 2':'CamSteady','Camera 3':'CamSteady','Camera 4':'CamWireless','Camera 5':'CamWireless','Photos / Editing':'Photos'};
const GROUPS={FOH:'FOH',Lyrics:'Lyrics',Livestream:'Livestream',CamSteady:'Cameras 1–3',CamWireless:'Cameras 4–5',Photos:'Photos / Editing'};
const SIZES=['XS','S','M','L','XL','2XL','3XL','4XL'];
const RC={FOH:'c-foh',Lyrics:'c-lyr',Livestream:'c-liv',CamSteady:'c-cam',CamWireless:'c-wir',Photos:'c-pho'};
const ARW='<svg class="arw" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h11M8.5 3.5 13 8l-4.5 4.5"/></svg>';
const CHK='<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5"/></svg>';
const XIC='<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
const tag=(r,mine)=>`<span class="rt ${RC[GROUP[r]]}${mine?' on':''}">${mine?ARW:''}${esc(r)}</span>`;
const gtag=g=>`<span class="rt ${RC[g]}">${esc(GROUPS[g])}</span>`;
const legend=()=>`<div class="legend">${Object.keys(GROUPS).map(g=>gtag(g)).join('')}</div>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const now=new Date();const today=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
const dt=d=>new Date(d+'T12:00:00');
const dayName=d=>dt(d).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
const monthName=m=>dt(m+'-01').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const bitOf=d=>({5:0,6:1,0:2,1:3})[dt(d).getDay()];
const SETUP={5:'6:30 PM',6:'6:00 PM',0:'7:00 AM',1:'6:00 PM'};
const setupAt=d=>SETUP[dt(d).getDay()];
const setupTag=d=>`<span class="setup">Setup ${setupAt(d)}</span>`;
const key=(d,r)=>d+'|'+r;
const store={get(k,o=localStorage){try{return o.getItem(k)}catch{return null}},set(k,v,o=localStorage){try{o.setItem(k,v)}catch{}},del(k,o=localStorage){try{o.removeItem(k)}catch{}}};
// Colour themes. The choice is kept on this device, and on the person's profile when they are signed in.
const THEMES=[['teal','Teal'],['blue','Blue'],['indigo','Indigo'],['purple','Purple'],['pink','Pink'],['red','Red'],['orange','Orange'],['green','Green']];
function applyTheme(t){if(!THEMES.some(x=>x[0]===t))t='teal';document.documentElement.dataset.theme=t;store.set('theme',t);
  document.querySelectorAll('[data-theme-pick]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themePick===t)))}
function pickTheme(t){applyTheme(t);
  const saved=location.hash==='#parent'&&P.token?api('/api/kids',{action:'setTheme',theme:t},pHdr()):V.token?api('/api/member',{token:V.token,action:'setTheme',theme:t}):null;
  if(saved)saved.then(()=>toast('Colour saved to your profile.'),()=>toast('Colour saved on this device.'));else toast('Colour saved on this device.')}
function setupThemes(){const box=document.getElementById('themes'),btn=document.getElementById('themebtn');if(!box)return;
  box.innerHTML=`<div class="small muted">Colour theme</div><div class="swatches">${THEMES.map(([k,l])=>`<button data-theme-pick="${k}" data-theme="${k}" aria-pressed="false" aria-label="${l}" title="${l}"></button>`).join('')}</div>`;
  const shut=()=>{box.hidden=true;btn.setAttribute('aria-expanded','false')};
  btn.onclick=e=>{e.stopPropagation();box.hidden=!box.hidden;btn.setAttribute('aria-expanded',String(!box.hidden))};
  box.querySelectorAll('[data-theme-pick]').forEach(b=>b.onclick=()=>pickTheme(b.dataset.themePick));
  addEventListener('click',e=>{if(!e.target.closest('#themes,#themebtn'))shut()});addEventListener('keydown',e=>{if(e.key==='Escape')shut()});
  applyTheme(store.get('theme'))}
// Moving to another page or tab fades the new content in. Saving something on the same page doesn't.
function enter(){app.dataset.enter='1';clearTimeout(enter.t);enter.t=setTimeout(()=>{delete app.dataset.enter},600)}
addEventListener('click',e=>{if(e.target.closest?.('[data-t],[data-kt],[data-bt],[data-pt],[data-v],[data-min],#dash,#mine,#kidsbtn,#bandbtn,#lead,#parents,#kleave,#bleave'))enter()},true);
const ICON_REFRESH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4M4 4v4h4M4 13a8 8 0 0 0 14.3 4M20 20v-4h-4"/></svg>';
const ICON_OUT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/></svg>';
const barBtn=(id,label,icon)=>`<button id="${id}" class="baract" aria-label="${label}" title="${label}">${icon}</button>`;
// Refresh and Sign out live in the top bar. Each page still creates them, and they are moved up there once it has drawn.
function dockBarButtons(){const dock=document.getElementById('baract');if(!dock)return;dock.replaceChildren(...app.querySelectorAll('.baract'))}
new MutationObserver(dockBarButtons).observe(app,{childList:true});
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,3000)}
async function api(path,body,headers={}){
  let r;try{r=await fetch(path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)})}
  catch{throw new Error('Could not reach the site. Check your connection and try again.')}
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(j.error||'Something went wrong. Try again.');e.status=r.status;throw e}
  return j}
function keep(fn){const y=scrollY;const had=!!app.querySelector('details');const o=[...app.querySelectorAll('details[open] summary')].map(s=>s.firstChild?.textContent);fn();
  if(had)app.querySelectorAll('details').forEach(d=>{d.open=o.includes(d.querySelector('summary')?.firstChild?.textContent)});scrollTo(0,y)}
const pickMonth=list=>{const m=today.slice(0,7);return (list.find(x=>x>=m))||list[list.length-1]};

/* ---------- Volunteer ---------- */
store.del('memberNumber');
const V={token:store.get('memberToken'),number:null,data:null,month:null,noteFor:null,offMonth:null,view:'schedule'};
// The logo: HUB as the body of a house under a roof with a cross in the gable, and CHURCH beneath.
const LOGO=`<svg class="logo" viewBox="-14 -26 268 270" role="img" aria-label="Church Hub">
<path d="M-6 68 120 -14l126 82" fill="none" stroke="var(--accent)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M120 14v40M107 27h26" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round"/>
<text x="120" y="182" text-anchor="middle" textLength="218" lengthAdjust="spacingAndGlyphs" fill="currentColor" style="font:700 160px 'Barlow Condensed','Arial Narrow',sans-serif">HUB</text>
<text x="13" y="234" textLength="214" lengthAdjust="spacing" fill="currentColor" style="font:600 44px 'Barlow Condensed','Arial Narrow',sans-serif">CHURCH</text></svg>`;
function memberLogin(msg,num=''){
  app.innerHTML=`<div class="land">${LOGO}<p class="muted">Every team’s schedule in one place.</p></div>
  <form class="panel" id="f"><label class="lbl" for="num">Username</label>
  <input id="num" class="field" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" required value="${esc(num)}">
  <label class="lbl" for="pin">Password</label>
  <input id="pin" class="field" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6">
  <p class="small muted">Your password is your 4 to 6 digit PIN. First time here? Enter your username or member number, leave the password blank, and you’ll create one.</p>
  ${msg?`<p class="err">${esc(msg)}</p>`:''}<button class="primary">Sign in</button></form>
  <button id="parents" style="justify-self:stretch">Parents: check in my kids</button>
  <button class="link small" id="lead" style="justify-self:center">Leader sign-in</button>`;
  document.getElementById('parents').onclick=()=>{location.hash='parent'};
  document.getElementById('lead').onclick=()=>{location.hash='leader'};
  document.getElementById('f').onsubmit=async e=>{e.preventDefault();V.number=document.getElementById('num').value.trim();const pin=document.getElementById('pin').value;
    try{const r=await api('/api/member',{action:'start',number:V.number});if(!r.hasPin)return pinCreate();if(!pin)return memberLogin('Enter your password to sign in.',V.number);
      signedIn(await api('/api/member',{action:'login',number:V.number,pin}))}catch(er){memberLogin(er.message,V.number)}};
  document.getElementById(num?'pin':'num').focus()}
function pinCreate(msg){
  app.innerHTML=`<div><h1>Create your PIN</h1><p class="muted">Choose 4 to 6 digits. You will use this PIN with your member number each time you sign in.</p></div>
  <form class="panel" id="f"><label for="p1"><h2>New PIN</h2></label><input id="p1" class="code" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" required>
  <label for="p2"><h2>Enter it again</h2></label><input id="p2" class="code" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" required>
  ${msg?`<p class="err">${esc(msg)}</p>`:''}<button class="primary">Create PIN</button></form>
  <button class="link small" id="back" style="justify-self:start">Use a different member number</button>`;
  document.getElementById('back').onclick=()=>memberLogin();
  document.getElementById('f').onsubmit=async e=>{e.preventDefault();const a=document.getElementById('p1').value,b=document.getElementById('p2').value;
    if(a!==b)return pinCreate('Those PINs don\u2019t match. Try again.');
    try{signedIn(await api('/api/member',{action:'setPin',number:V.number,pin:a}))}catch(er){pinCreate(er.message)}};
  document.getElementById('p1').focus()}
function pinEnter(msg){
  app.innerHTML=`<div><h1>Enter your PIN</h1><p class="muted">Forgot it? Ask your leader to reset it.</p></div>
  <form class="panel" id="f"><label for="pin"><h2>PIN</h2></label><input id="pin" class="code" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" required>
  ${msg?`<p class="err">${esc(msg)}</p>`:''}<button class="primary">Sign in</button></form>
  <button class="link small" id="back" style="justify-self:start">Use a different member number</button>`;
  document.getElementById('back').onclick=()=>memberLogin();
  document.getElementById('f').onsubmit=async e=>{e.preventDefault();
    try{signedIn(await api('/api/member',{action:'login',number:V.number,pin:document.getElementById('pin').value}))}catch(er){pinEnter(er.message)}};
  document.getElementById('pin').focus()}
function show(r){V.data=r;if(r.theme)applyTheme(r.theme);const ms=r.months.map(x=>x.month);V.month=ms.includes(V.month)?V.month:pickMonth(ms);keep(memberView)}
function signedIn(r){V.token=r.token;store.set('memberToken',r.token);show(r)}
async function memberLoad(){
  try{show(await api('/api/member',{token:V.token,action:'load'}))}
  catch(e){if(e.status===401){store.del('memberToken');V.token=null;memberLogin('Please sign in again.')}else memberLogin(e.message)}}
function memberView(){
  const {me,months,answers}=V.data;const mo=months.find(x=>x.month===V.month);
  const mine=[];for(const m of months)for(const s of m.services)for(const [r,v] of Object.entries(s.slots))if(v.me)mine.push({date:s.date,role:r});
  const upcoming=mine.filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date));const replied=upcoming.filter(x=>answers[key(x.date,x.role)]||V.data.off[x.date]).length;
  app.innerHTML=`${V.data.username?'':`<div class="alert" role="alert"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.5 20h19zM12 10v4.5M12 17.5v.01"/></svg><span>You don\u2019t have a username yet. Create one to sign in more easily.</span><button id="goname">Create username</button></div>`}<div class="top"><div><p class="muted">${APP_NAME}</p><h1>${esc(me.name)}</h1></div><div class="row">${V.data.kids?'<button id="kidsbtn">Kids Ministry</button>':''}${V.data.band?'<button id="bandbtn">Band</button>':''}${V.data.access?'<button class="primary" id="dash">Team dashboard</button>':''}${barBtn('out','Sign out',ICON_OUT)}</div></div>
  <div class="tabs"><button data-v="schedule" aria-pressed="${V.view!=='guides'}">My schedule</button><button data-v="guides" aria-pressed="${V.view==='guides'}">Guides</button></div>
  ${V.view==='guides'?myGuides():`${V.data.shirt?'':shirtBox()}
  ${V.data.other?.length?`<section class="panel"><h2>My other ministries</h2><p class="small muted">Dates you serve outside Production. You won\u2019t be scheduled in two places on the same day.</p>${V.data.other.map(x=>`<div class="row"><span class="grow"><b>${dayName(x.date)}</b></span><span class="pill yes">${esc(x.what)}</span></div>`).join('')}</section>`:''}
  ${!months.length?`<section class="panel"><h2>No schedule posted yet</h2><p class="muted">Check back once your leader posts the next month.</p></section>`:`
  <section class="panel"><div class="top"><h2>My dates</h2>${upcoming.length?`<span class="pill ${replied===upcoming.length?'yes':'wait'}">${replied} of ${upcoming.length} answered</span>`:''}</div>
  ${upcoming.length?upcoming.map(cue).join(''):`<p class="muted">You have no upcoming dates.</p>`}</section>
  <section class="panel"><h2>Full lineup</h2>${months.length>1?`<div class="tabs">${months.map(x=>`<button data-m="${x.month}" aria-pressed="${x.month===V.month}">${monthName(x.month)}</button>`).join('')}</div>`:''}${legend()}<div>${mo.services.filter(s=>s.date>=today).map(s=>`<details class="date"><summary>${dayName(s.date)}${setupTag(s.date)}${Object.keys(s.slots).filter(r=>s.slots[r].me).map(r=>tag(r,true)).join('')}</summary>
  ${ROLES.filter(r=>s.slots[r]).map(r=>`<div class="slot line ${RC[GROUP[r]]}${s.slots[r].me?' mine':''}" style="grid-template-columns:118px 1fr">${tag(r,s.slots[r].me)}<span class="${s.slots[r].me?'me':''}">${esc(s.slots[r].name||'Open')}</span></div>`).join('')}</details>`).join('')||'<p class="muted">This month is finished.</p>'}</div></section>`}${offPanel()}${V.data.shirt?shirtBox():''}${nameBox()}`}`;
  app.querySelector('#out').onclick=()=>{store.del('memberToken');V.token=null;V.number=null;V.data=null;memberLogin()};
  const su=document.getElementById('saveuser');if(su)su.onclick=saveUser;
  const gn=document.getElementById('goname');if(gn)gn.onclick=()=>{if(V.view==='guides'){V.view='schedule';memberView()}document.getElementById('namebox').scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('uname').focus({preventScroll:true})};
  app.querySelectorAll('[data-shirt]').forEach(b=>b.onclick=()=>saveShirt(b));
  app.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{V.view=b.dataset.v;memberView();scrollTo(0,0)});
  const da=document.getElementById('dash');if(da)da.onclick=()=>{location.hash='leader'};
  const kb=document.getElementById('kidsbtn');if(kb)kb.onclick=()=>{location.hash='kids'};
  const bb=document.getElementById('bandbtn');if(bb)bb.onclick=()=>{location.hash='band'};
  app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{V.month=b.dataset.m;memberView()});
  app.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>answer(b));
  app.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveNote(b));
  app.querySelectorAll('[data-om]').forEach(b=>b.onclick=()=>{V.offMonth=b.dataset.om;memberView()});
  app.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>toggleOff(b.dataset.day))}
function guideCard(x,g){return `<article class="guide"><div class="top"><h3>${esc(x.title)}</h3>${g?`<button class="link small" data-dg="${g}" data-id="${esc(x.id)}">Remove</button>`:''}</div>
  ${x.video?`<iframe class="vid" src="https://www.youtube-nocookie.com/embed/${esc(x.video)}" title="${esc(x.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`:''}
  ${x.note?`<p class="note">${esc(x.note)}</p>`:''}</article>`}
function myGuides(){const {myGroups=[],guides={}}=V.data;
  return myGroups.map(g=>`<section class="panel"><div>${gtag(g)}</div>${(guides[g]||[]).map(x=>guideCard(x)).join('')||'<p class="muted">No guide for this role yet.</p>'}</section>`).join('')||'<section class="panel"><p class="muted">Guides appear here once you have a role.</p></section>'}
function shirtBox(){if(!V.data.shirtOpen)return '';const s=V.data.shirt;
  return `<section class="panel"><h2>Team shirt size</h2><p class="small muted">${s?`You picked ${esc(s)}. Tap another size to change it.`:'Pick one size.'}</p>
  <div class="sizes">${SIZES.map(x=>`<button data-shirt="${x}" aria-pressed="${x===s}">${x}</button>`).join('')}</div></section>`}
async function saveShirt(b){const size=b.dataset.shirt;if(size===V.data.shirt)return;app.querySelectorAll('[data-shirt]').forEach(x=>x.disabled=true);
  try{const r=await api('/api/member',{token:V.token,action:'setShirt',size});V.data.shirt=r.shirt;toast(`Size ${r.shirt} saved.`);keep(memberView)}
  catch(e){toast(e.message);memberLoad()}}
function nameBox(){const u=V.data.username;return `<section class="panel" id="namebox"><h2>${u?'Your username':'Choose a username'}</h2><p class="small muted">Sign in with this and your PIN from now on. Your PIN stays the same, and your member number still works.</p>
  <div class="row"><input id="uname" class="grow" value="${esc(u)}" maxlength="20" autocapitalize="none" spellcheck="false" placeholder="3 to 20 letters or numbers" aria-label="Username"><button class="primary" id="saveuser">Save username</button></div></section>`}
async function saveUser(){const b=document.getElementById('saveuser');b.disabled=true;
  try{const r=await api('/api/member',{token:V.token,action:'setUsername',username:document.getElementById('uname').value});V.data.username=r.username;toast('Username saved.');memberView()}
  catch(e){toast(e.message);b.disabled=false}}
function nextMonths(){const x=dt(today.slice(0,7)+'-01');return [0,1,2].map(i=>{const y=new Date(x.getFullYear(),x.getMonth()+i,1);return `${y.getFullYear()}-${pad(y.getMonth()+1)}`})}
function serviceDates(m){
  const [y,mo]=m.split('-').map(Number);const n=new Date(y,mo,0).getDate();const out=[];
  for(let d=1;d<=n;d++){const s=`${m}-${pad(d)}`;const b=bitOf(s);if(b===undefined||s<today||(b===3&&!V.data.canMon))continue;out.push(s)}
  return out}
function offPanel(){
  const ms=nextMonths();if(!ms.includes(V.offMonth))V.offMonth=ms[0];const open=serviceDates(V.offMonth);const D=V.data;
  const mine=new Set(D.months.flatMap(m=>m.services).filter(s=>Object.values(s.slots).some(v=>v.me)).map(s=>s.date));
  const [y,mo]=V.offMonth.split('-').map(Number);const n=new Date(y,mo,0).getDate();const lead=new Date(y,mo-1,1).getDay();
  const cells=[];for(let i=0;i<lead;i++)cells.push('<span></span>');
  for(let d=1;d<=n;d++){const s=`${V.offMonth}-${pad(d)}`;if(!open.includes(s)){cells.push(`<span class="c">${d}</span>`);continue}
    const o=!!D.off[s],e=!!D.on[s],u=D.days[bitOf(s)]==='1',shut=closed(s)&&u&&!o;
    const [cls,ic,label]=o?['cant',XIC,'Can’t serve']:shut?['shut','<i></i>','Closed']:u?['ok',CHK,'Can serve']:e?['ok',CHK,'Offered']:['','<i></i>','Not my usual day'];
    cells.push(`<button class="c ${cls}${mine.has(s)?' sch':''}" data-day="${s}" aria-pressed="${o||e}" aria-label="${dayName(s)}: ${label}${mine.has(s)?', you are scheduled':''}"${shut?' disabled':''}>${d}${ic}</button>`)}
  return `<section class="panel" id="avail"><h2>Days I can serve</h2><p class="small muted">Tap a green day if you can’t serve it. Tap a blank service day to offer it. You can mark can’t serve until 12 hours before setup.</p>
  <div class="tabs">${ms.map(m=>`<button data-om="${m}" aria-pressed="${m===V.offMonth}">${monthName(m).split(' ')[0]}</button>`).join('')}</div>
  <div class="cal">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w=>`<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>
  <div class="key small"><span><span class="sw yes">${CHK}</span>Can serve</span><span><span class="sw no">${XIC}</span>Can’t serve</span><span><span class="sw" style="border:1px dashed var(--line)"></span>Not my usual day</span><span><span class="sw" style="box-shadow:inset 0 0 0 2px var(--accent)"></span>I’m scheduled</span></div></section>`}
let offQ=Promise.resolve();
function toggleOff(d){
  const D=V.data,usual=D.days[bitOf(d)]==='1';
  if(D.off[d])delete D.off[d];else if(usual)D.off[d]=1;else if(D.on[d])delete D.on[d];else D.on[d]=1;
  memberView();document.getElementById('avail').scrollIntoView({block:'nearest'});const off={...D.off},on={...D.on};
  offQ=offQ.then(()=>api('/api/member',{token:V.token,action:'setOff',off,on})).then(r=>{toast(r.swapped?'Saved. Someone else has been asked to cover your spot.':'Saved.');if(r.swapped)memberLoad()}).catch(e=>{toast(e.message);memberLoad()})}
const closed=d=>{const t=V.data.closeAt?.[d];return !!t&&Date.now()>=t};
const VERSES=[['Each of you should use whatever gift you have received to serve others, as faithful stewards of God\u2019s grace in its various forms.','1 Peter 4:10'],
  ['Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.','Colossians 3:23'],
  ['Serve one another humbly in love.','Galatians 5:13'],
  ['God is not unjust; he will not forget your work and the love you have shown him as you have helped his people and continue to help them.','Hebrews 6:10'],
  ['For even the Son of Man did not come to be served, but to serve, and to give his life as a ransom for many.','Mark 10:45'],
  ['Always give yourselves fully to the work of the Lord, because you know that your labor in the Lord is not in vain.','1 Corinthians 15:58'],
  ['Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.','Galatians 6:9']];
// Each date keeps the same verse, and neighbouring dates get different ones.
const verseFor=d=>{const n=Math.round(dt(d)/864e5);return VERSES[(n+2*Math.floor(n/7))%VERSES.length]};
function lockLeft(d){const t=V.data.closeAt?.[d];const m=t?Math.floor((t-Date.now())/6e4):0;if(m<=0)return '';
  const dd=Math.floor(m/1440),h=Math.floor(m%1440/60);return dd?`${dd} day${dd===1?'':'s'} ${h} hr`:h?`${h} hr ${m%60} min`:`${m} min`}
function cue(x){
  const k=key(x.date,x.role);const a=V.data.off[x.date]?{a:'no',note:V.data.answers[k]?.note}:V.data.answers[k];const open=V.noteFor===k;const late=closed(x.date)&&a?.a!=='no';const left=a?'':lockLeft(x.date);const d=dt(x.date);
  return `<div class="mydate"><div class="dblock"><small>${d.toLocaleDateString('en-US',{weekday:'short'})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-US',{month:'short'})}</small></div>
  <div class="info">${tag(x.role)}${setupTag(x.date)}
  ${a?`<span class="pill ${a.a==='yes'?'yes':'no'}">${a.a==='yes'?CHK+'Confirmed':XIC+'Unable to serve'}</span>`:left?`<span class="pill wait" data-lock="${x.date}">Locks in ${left}</span>`:'<span class="pill wait">Please confirm</span>'}</div>
  ${a?.a==='yes'?(([v,ref])=>`<div class="thanks"><div class="done">${CHK}Confirmed</div><p><b>\ud83d\ude0a Thank you for serving!</b></p><blockquote>\u201c${v}\u201d<cite>${ref} (NIV)</cite></blockquote>
  ${late?'':`<button class="link small" style="justify-self:start" data-a="no" data-d="${x.date}" data-r="${esc(x.role)}">My plans changed and I can\u2019t serve</button>`}</div>`)(verseFor(x.date)):`  <div class="choices"><button class="y" data-a="yes" data-d="${x.date}" data-r="${esc(x.role)}" aria-pressed="${a?.a==='yes'}">${CHK}Confirm</button>
  <button class="n" data-a="no" data-d="${x.date}" data-r="${esc(x.role)}" aria-pressed="${a?.a==='no'}"${late?' disabled':''}>${XIC}Unable to serve</button></div>`}
  ${late&&a?.a!=='yes'?'<p class="small muted">It’s less than 12 hours before setup, so this date is locked in. If you can’t make it, please contact your leader.</p>':''}
  ${a?.a==='no'||open?`<div class="row"><input class="grow" id="note-${esc(k).replace(/[^a-z0-9]/gi,'')}" maxlength="200" placeholder="Add a note for your leader (optional)" value="${esc(a?.note)}" aria-label="Note for your leader">
  <button data-save data-d="${x.date}" data-r="${esc(x.role)}">Save note</button></div>`:''}</div>`}
// Keeps the countdowns current, and redraws once a date locks.
setInterval(()=>{const l=app.querySelectorAll('[data-lock]');if(!l.length||!V.data)return;let gone=false;l.forEach(e=>{const t=lockLeft(e.dataset.lock);if(t)e.textContent='Locks in '+t;else gone=true});if(gone)keep(memberView)},30000);
async function sendAnswer(date,role,ans,note){
  const r=await api('/api/member',{token:V.token,action:'answer',date,role,answer:ans,note});V.data.answers=r.answers;V.data.off=r.off;return r}
async function answer(b){
  const {d,r}=b.dataset;const ans=b.dataset.a;b.disabled=true;
  try{const x=await sendAnswer(d,r,ans,'');
    if(x.swapped){toast(x.cover?`Thanks for letting us know. ${x.cover} has been asked to cover.`:'Thanks for letting us know. Your leader will find someone.');memberLoad();return}
    toast(ans==='yes'?'Thanks. You\u2019re confirmed.':'Saved. Your leader can see this.');memberView()}
  catch(e){toast(e.message);if(e.status===409)memberLoad();else memberView()}}
async function saveNote(b){
  const {d,r}=b.dataset;const note=b.previousElementSibling.value;b.disabled=true;
  try{await sendAnswer(d,r,'no',note);toast('Note saved.');memberView()}catch(e){toast(e.message);memberView()}}

/* ---------- Leader ---------- */
const L={code:null,data:null,month:null,tab:'schedule',q:'',who:null};
const hdr=()=>L.code?{'x-leader-code':L.code}:{'x-member-token':V.token};
function leaderLogin(msg){
  app.innerHTML=`<div><h1>Leader sign-in</h1><p class="muted">Post a month and see who can serve.</p></div>
  <form class="panel" id="f"><label for="code"><h2>Leader code</h2></label><input id="code" type="password" autocomplete="off" required style="width:100%">
  ${msg?`<p class="err">${esc(msg)}</p>`:''}<button class="primary">Sign in</button></form>
  <button class="link small" id="back" style="justify-self:start">Back to volunteer sign-in</button>`;
  document.getElementById('f').onsubmit=e=>{e.preventDefault();L.code=document.getElementById('code').value;leaderCall({action:'load'})};
  document.getElementById('back').onclick=()=>{location.hash=''}}
async function leaderCall(body,done){
  try{L.data=await api('/api/leader',body,hdr());if(L.code)store.set('leaderCode',L.code,sessionStorage);if(L.data.level!=='admin'&&NAV.some(g=>g[2].some(x=>x[0]===L.tab&&x[2])))L.tab='schedule';
    if(!L.data.months[L.month])L.month=pickMonth(Object.keys(L.data.months).sort());keep(leaderView);if(done)toast(done)}
  catch(e){if(e.status===401){store.del('leaderCode',sessionStorage);L.code=null;leaderLogin(e.message)}else{toast(e.message);if(L.data)leaderView();else leaderLogin(e.message)}}}
const nameOf=id=>L.data.people.find(p=>p.id===id)?.name||'';
const can=()=>L.data.level==='admin';
const isMe=id=>!!id&&id===String(V.token||'').split('.')[0];
const slotCell=(s,r)=>can()?slotSelect(s,r):`<span>${esc(nameOf(s.slots[r])||'Open')}</span>`;
const answerOf=(id,date,role)=>{if(!id)return null;const a=L.data.answers[id]?.[key(date,role)];return L.data.off?.[id]?.[date]?{a:'no',note:a?.note||'Marked this day as can\u2019t serve'}:a};
function saidNo(id,date){if(L.data.off?.[id]?.[date])return true;const a=L.data.answers[id]||{};return Object.entries(a).some(([k,v])=>k.startsWith(date+'|')&&v.a==='no')}
const person=id=>L.data.people.find(p=>p.id===id);
const weekday=d=>dt(d).toLocaleDateString('en-US',{weekday:'long'});
const offered=(id,d)=>!!L.data.on?.[id]?.[d];
const saidYes=(id,d)=>Object.entries(L.data.answers[id]||{}).some(([k,v])=>k.startsWith(d+'|')&&v.a==='yes');
// True when this person picked this weekday for the role, or offered this date.
const picked=(p,g,d)=>p.roles[g]?.[bitOf(d)]==='1'||offered(p.id,d);
// Someone scheduled on a day they didn't pick, who hasn't confirmed they can serve.
function wrongDay(id,date,role){const p=id&&person(id);return !!p&&!picked(p,GROUP[role],date)&&!saidNo(id,date)&&L.data.answers[id]?.[key(date,role)]?.a!=='yes'}
function candidates(s,role){
  const g=GROUP[role],cur=s.slots[role];const on=Object.values(s.slots);const counts={};
  for(const x of L.data.months[L.month].services)for(const id of Object.values(x.slots))if(id)counts[id]=(counts[id]||0)+1;
  const free=[],other=[],cant=[],busy=[],away=[];const gone=L.data.busy?.[s.date]||{};
  for(const p of L.data.people){if(!p.roles[g])continue;
    (gone[p.id]&&p.id!==cur?away:saidNo(p.id,s.date)?cant:p.id!==cur&&on.includes(p.id)?busy:picked(p,g,s.date)?free:other).push(p)}
  free.sort((a,b)=>(counts[a.id]||0)-(counts[b.id]||0));
  return {free,other,cant,busy,away,gone,counts}}
function slotSelect(s,role){
  const cur=s.slots[role];const {free,other,cant,busy,away,gone,counts}=candidates(s,role);
  const opt=(p,mark,tag)=>`<option value="${p.id}"${p.id===cur?' selected':''}>${mark} ${esc(p.name)}${tag?' '+tag:''}</option>`;
  const grp=(label,list,mark,n)=>list.length?`<optgroup label="${label}">${list.map(p=>opt(p,mark,n?`(${counts[p.id]||0} this month)`:'')).join('')}</optgroup>`:'';
  return `<select data-slot data-d="${s.date}" data-r="${esc(role)}" aria-label="${esc(role)} on ${dayName(s.date)}"><option value="">Open</option>
  ${grp('Available this day',free,'\u2705',1)}${grp('Didn\u2019t pick '+weekday(s.date)+'s (last resort)',other,'\u26a0\ufe0f')}${grp('Can\u2019t serve this day',cant,'\u274c')}${grp('Already serving this day',busy,'\u2796')}${away.length?`<optgroup label="Serving in another ministry that day">${away.map(p=>`<option disabled>\u26d4 ${esc(p.name)} (${esc(gone[p.id])})</option>`).join('')}</optgroup>`:''}</select>`}
function statusPill(a,open,wrong){if(open)return '<span class="pill no">Open</span>';if(a?.a==='no')return `<span class="pill no">${XIC}Can’t</span>`;
  if(wrong)return '<span class="pill wait">Not their day</span>';
  return a?`<span class="pill yes">${CHK}Serving</span>`:'<span class="pill wait">No reply</span>'}
const chip=(p,cls,ic,extra='')=>`<span class="pill ${cls}">${ic}${esc(p.name)}${extra}</span>`;
// Everyone who marked this date: can't serve, or offered or confirmed it.
function dayMarks(d){const cant=[],ok=[];for(const p of L.data.people){if(saidNo(p.id,d))cant.push(p);else if(offered(p.id,d)||saidYes(p.id,d))ok.push(p)}return {cant,ok}}
function markStrip(d){const {cant,ok}=dayMarks(d);if(!cant.length&&!ok.length)return '';
  return `<div class="marks">${cant.length?`<div><div class="small muted">Marked can\u2019t serve</div><div class="chips">${cant.map(p=>chip(p,'no',XIC)).join('')}</div></div>`:''}
  ${ok.length?`<div><div class="small muted">Marked available</div><div class="chips">${ok.map(p=>chip(p,'yes',CHK)).join('')}</div></div>`:''}</div>`}
const NAV=[['Scheduling',0,[['schedule','Schedule'],['avail','Availability'],['remind','Reminder',1]]],['Supervisor tools',0,[['att','Attendance'],['stats','Attendance stats',1],['profile','Volunteer profiles',1],['guides','Guides']]],['Admin tools',0,[['days','Volunteers',1],['roles','Roles',1],['people','People & numbers',1],['shirts','Shirts',1]]]];
function navBar(){const gs=NAV.map(([l,,t])=>[l,t.filter(x=>can()||!x[2])]).filter(g=>g[1].length);const cur=gs.find(g=>g[1].some(x=>x[0]===L.tab))||gs[0];
  return `<nav class="nav" aria-label="Dashboard sections"><div class="groups">${gs.map(([l,t])=>`<button data-t="${t[0][0]}" aria-pressed="${l===cur[0]}">${l}</button>`).join('')}</div>
  <div class="subs">${cur[1].map(([t,l])=>`<button data-t="${t}" aria-pressed="${t===L.tab}">${l}</button>`).join('')}</div></nav>`}
function leaderView(){
  const {months,people}=L.data;const mo=months[L.month];const list=Object.keys(months).sort();
  let yes=0,no=0,wait=0,open=0;const issues=[];
  for(const s of mo.services)for(const r of ROLES){if(!(r in s.slots)||s.date<today)continue;const id=s.slots[r];const a=answerOf(id,s.date,r);
    if(!id)open++;else if(!a)wait++;else if(a.a==='yes')yes++;else no++;
    if(!id||a?.a==='no')issues.push({s,r,a,id});else if(wrongDay(id,s.date,r))issues.push({s,r,a,id,wrong:1})}
  app.innerHTML=`<div class="top"><div><p class="muted">Team dashboard${can()?'':' \u00b7 Supervisor view'}</p><h1>${APP_NAME}</h1></div><div class="row">${V.token?'<button id="mine">My schedule</button>':''}${!can()&&L.data.kidsRole?'<button id="kidsbtn">Kids Ministry</button>':''}${barBtn('refresh','Refresh',ICON_REFRESH)}${barBtn('out','Sign out',ICON_OUT)}</div></div>
  ${can()?ministryBar('leader'):''}${navBar()}
  ${L.tab==='stats'?statsView():L.tab==='profile'?profileView():L.tab==='avail'?availView():L.tab==='remind'?remindView():L.tab==='shirts'?shirtsView():L.tab==='guides'?guidesView():L.tab==='people'?peopleView():L.tab==='roles'?rolesView():L.tab==='days'?offView():L.tab==='att'?attView():`
  <section class="panel"><div class="row"><select id="month" class="grow" aria-label="Month">${list.map(m=>`<option value="${m}"${m===L.month?' selected':''}>${monthName(m)}${months[m].live?' (live)':''}</option>`).join('')}</select>
  <span class="pill ${mo.live?'yes':'wait'}">${mo.live?'Live':'Not posted'}</span></div>
  ${can()?`<div class="row"><button class="primary" id="post">${mo.live?'Take this month down':'Post this month'}</button>${mo.live?'<button id="share">Copy message for volunteers</button>':''}</div>
  <div class="row"><label class="small muted" for="newm">Add a new month</label><input id="newm" type="month" class="grow"><button id="create">Create and fill</button></div>
  <p class="small muted">Create and fill only schedules people on the days they picked. If nobody who picked that day is free, it uses someone else in that role and flags them as Not their day.</p>`:''}</section>
  <p class="small muted">Totals below count upcoming dates only.</p>
  <section class="panel stats"><div><b>${yes}</b><span class="small muted">Serving</span></div><div><b>${no}</b><span class="small muted">Can’t serve</span></div><div><b>${wait}</b><span class="small muted">No reply</span></div><div><b>${open}</b><span class="small muted">Open</span></div></section>
  ${issues.length?`<section class="panel"><div class="top"><h2>Needs a replacement</h2>${can()&&mo.live?'<button id="autofill">Reassign automatically</button>':''}</div>${issues.map(({s,r,a,id,wrong})=>`<div class="cue"><div class="top"><div>${tag(r)}<div class="muted">${dayName(s.date)}${!id?'':wrong?' · '+esc(nameOf(id))+' didn’t pick '+weekday(s.date)+'s':' · '+esc(nameOf(id))+' can’t serve'}</div>${a?.note?`<div class="small">“${esc(a.note)}”</div>`:''}</div></div>${slotCell(s,r)}</div>`).join('')}</section>`:''}
  ${swapList()}
  <section class="panel"><h2>Lineup</h2>${legend()}${can()?'<p class="small muted">Change a name and only that slot changes.</p>':''}<div>${mo.services.map(s=>{const unsure=ROLES.some(r=>r in s.slots&&(!s.slots[r]||answerOf(s.slots[r],s.date,r)?.a==='no'||wrongDay(s.slots[r],s.date,r)));const dm=s.date>=today?dayMarks(s.date):{cant:[],ok:[]};
  return `<details class="date"${s.date>=today&&s.date<=addDays(today,10)?' open':''}><summary>${dayName(s.date)}${setupTag(s.date)}<span class="row">${dm.ok.length?`<span class="pill yes">${CHK}${dm.ok.length} available</span>`:''}${dm.cant.length?`<span class="pill no">${XIC}${dm.cant.length} can’t</span>`:''}${unsure?'<span class="pill wait">Needs attention</span>':''}</span></summary>
  ${ROLES.filter(r=>r in s.slots).map(r=>`<div class="slot line ${RC[GROUP[r]]}${isMe(s.slots[r])?' mine':''}">${tag(r,isMe(s.slots[r]))}${slotCell(s,r)}${statusPill(answerOf(s.slots[r],s.date,r),!s.slots[r],wrongDay(s.slots[r],s.date,r))}</div>`).join('')}${s.date>=today?markStrip(s.date):''}</details>`}).join('')}</div></section>`}`;
  app.querySelector('#out').onclick=()=>{store.del('leaderCode',sessionStorage);store.del('memberToken');L.code=null;V.token=null;V.data=null;L.data=null;location.hash=''};
  const mi=document.getElementById('mine');if(mi)mi.onclick=()=>{location.hash=''};
  const kb=document.getElementById('kidsbtn');if(kb)kb.onclick=()=>{location.hash='kids'};
  app.querySelector('#refresh').onclick=()=>leaderCall({action:'load'},'Up to date.');bindMinistryBar();
  app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{L.tab=b.dataset.t;leaderView()});
  if(L.tab==='stats')return bindStats();
  if(L.tab==='profile')return bindProfile();
  if(L.tab==='avail')return bindAvail();
  if(L.tab==='remind')return bindRemind();
  if(L.tab==='shirts')return bindShirts();
  if(L.tab==='guides')return bindGuides();
  if(L.tab==='people')return bindPeople();
  if(L.tab==='roles')return bindRoles();
  if(L.tab==='days')return bindDays();
  if(L.tab==='att')return bindAtt();
  document.getElementById('month').onchange=e=>{L.month=e.target.value;leaderView()};
  if(!can())return;
  document.getElementById('post').onclick=()=>leaderCall({action:'setLive',month:L.month,live:!mo.live},mo.live?'Taken down.':`${monthName(L.month)} is live.`);
  const sh=document.getElementById('share');if(sh)sh.onclick=async()=>{const t=`The Media Team schedule for ${monthName(L.month)} is up. Open ${location.origin}, enter your member number, and tell us if you can serve each date.`;
    try{await navigator.clipboard.writeText(t);toast('Copied.')}catch{toast(t)}};
  const af=document.getElementById('autofill');if(af)af.onclick=()=>{if(af.dataset.sure)return leaderCall({action:'autoFill',month:L.month},'Reassigned everyone it could.');af.dataset.sure='1';af.textContent='Tap again to confirm'};
  document.getElementById('create').onclick=()=>{const m=document.getElementById('newm').value;if(!m)return toast('Pick a month first.');L.month=m;leaderCall({action:'createMonth',month:m},`${monthName(m)} is filled in. Review it, then post it.`)};
  app.querySelectorAll('[data-slot]').forEach(el=>el.onchange=()=>leaderCall({action:'setSlot',month:L.month,date:el.dataset.d,role:el.dataset.r,personId:el.value},'Saved. Only that slot changed.'))}
function swapList(){const l=(L.data.swaps||[]).filter(s=>s.date>=today).slice(0,12);if(!l.length)return '';
  return `<section class="panel"><h2>Automatic swaps</h2><p class="small muted">Who the site moved after someone couldn\u2019t serve. Change any of these in the lineup below.</p>${l.map(s=>`<div class="cue">${tag(s.role)}<div class="muted">${dayName(s.date)} \u00b7 ${esc(nameOf(s.from)||'Former volunteer')} \u2192 ${s.to?esc(nameOf(s.to)):'<span class="err">Nobody available</span>'}${s.lastResort?' \u00b7 last resort, not their usual day':''}</div></div>`).join('')}</section>`}
function addDays(d,n){const x=dt(d);x.setDate(x.getDate()+n);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`}
function offView(){
  const who=L.data.people.find(p=>p.id===L.who)||L.data.people[0];L.who=who.id;
  const mine=Object.keys(L.data.off?.[who.id]||{}).filter(d=>d>=today).sort();
  const names=['Fri','Sat','Sun','Mon'];
  const grid=Object.entries(who.roles).map(([g,bits])=>`<div class="cue"><div class="top">${gtag(g)}<button class="link small" data-droprole="${g}">Remove role</button></div><div class="row">${names.map((n,i)=>g==='Photos'||g==='CamWireless'?(i<3?dayCheck(g,bits,i,n):''):dayCheck(g,bits,i,n)).join('')}</div></div>`).join('');
  return `<section class="panel"><h2>Edit a volunteer</h2><p class="small muted">Pick someone to change their name, roles or days. Checked means they can serve that weekday. Swaps and new months only use someone on the days checked here, unless nobody else is free. A schedule you already made doesn\u2019t change, but anyone now on a day they didn\u2019t pick is flagged on the Schedule page.</p>
  <select id="who" aria-label="Volunteer">${L.data.people.map(p=>`<option value="${p.id}"${p.id===who.id?' selected':''}>${esc(p.name)}</option>`).join('')}</select>
  <div class="row"><input id="ename" class="grow" value="${esc(who.name)}" maxlength="60" aria-label="Name"><button id="savename">Save name</button></div>
  <div>${grid}</div>
  ${Object.keys(GROUPS).some(g=>!who.roles[g])?`<div class="row small"><span class="muted">Add a serving role:</span>${Object.keys(GROUPS).filter(g=>!who.roles[g]).map(g=>`<button class="link small" data-addrole="${g}">${esc(GROUPS[g])}</button>`).join('')}</div>`:''}
  ${whoCal(who)}
  <h3>Dates they can\u2019t serve</h3>
  <div class="row"><input id="offdate" type="date" class="grow" aria-label="Date they can\u2019t serve"><button id="addoff">Add date</button></div>
  ${mine.map(d=>`<div class="row"><span class="grow">${dayName(d)}</span><button class="link small" data-unoff="${d}">Remove</button></div>`).join('')||'<p class="small muted">No dates marked.</p>'}
  <button class="link small" id="delperson" style="justify-self:start">Remove this volunteer</button></section>`}
// One volunteer's month: days assigned, days blocked, and service days they are available.
function whoCal(p){
  const m=L.cm||today.slice(0,7);const [y,mo]=m.split('-').map(Number);const n=new Date(y,mo,0).getDate();const lead=new Date(y,mo-1,1).getDay();
  const step=k=>{const x=new Date(y,mo-1+k,1);return `${x.getFullYear()}-${pad(x.getMonth()+1)}`};
  const asg={};for(const s of Object.values(L.data.months).flatMap(x=>x.services))for(const [r,id] of Object.entries(s.slots))if(id===p.id)(asg[s.date]=asg[s.date]||[]).push(r);
  const cells=[];for(let i=0;i<lead;i++)cells.push('<span></span>');const list=[];
  for(let d=1;d<=n;d++){const s=`${m}-${pad(d)}`;const b=bitOf(s);const no=saidNo(p.id,s),on=asg[s],free=b!==undefined&&(Object.values(p.roles).some(r=>r[b]==='1')||offered(p.id,s));
    const [cls,ic,label]=no?['cant',XIC,'Blocked']:on?['asg',CHK,'Assigned, '+on.join(' and ')]:free?['free','<i></i>','Available']:['','<i></i>',''];
    if(on)list.push(`<div class="hist"><div>${dayName(s)}</div>${no?`<span class="pill no">${XIC}Blocked</span>`:statusPill(answerOf(p.id,s,on[0]),false,wrongDay(p.id,s,on[0]))}<div>${on.map(r=>tag(r)).join(' ')}</div></div>`);
    cells.push(`<span class="c ${cls}"${label?` title="${label}" aria-label="${dayName(s)}: ${label}"`:''}>${d}${ic}</span>`)}
  return `<h3>Their calendar</h3><div class="calnav"><button data-cm="${step(-1)}" aria-label="Previous month">←</button><b>${monthName(m)}</b><button data-cm="${step(1)}" aria-label="Next month">→</button></div>
  <div class="cal">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w=>`<span class="wd">${w}</span>`).join('')}${cells.join('')}</div>
  <div class="key small"><span><span class="sw" style="background:var(--yes);color:var(--panel)">${CHK}</span>Assigned</span><span><span class="sw no">${XIC}</span>Blocked</span><span><span class="sw" style="background:var(--foh-bg)"></span>Available</span></div>
  <div>${list.join('')||'<p class="small muted">Not assigned this month.</p>'}</div>`}
function dayCheck(g,bits,i,n){return `<label class="check"><input type="checkbox" data-wg="${g}" data-wi="${i}"${bits[i]==='1'?' checked':''}>${n}</label>`}
function bindDays(){
  document.getElementById('who').onchange=e=>{L.who=e.target.value;leaderView()};
  app.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{L.cm=b.dataset.cm;leaderView()});
  app.querySelectorAll('[data-wg]').forEach(c=>c.onchange=()=>{const g=c.dataset.wg,i=+c.dataset.wi;const b=L.data.people.find(p=>p.id===L.who).roles[g].split('');b[i]=c.checked?'1':'0';
    leaderCall({action:'setWeekdays',personId:L.who,group:g,bits:b.join('')},'Saved.')});
  document.getElementById('savename').onclick=()=>leaderCall({action:'setPerson',personId:L.who,name:document.getElementById('ename').value},'Name saved.');
  const dp=document.getElementById('delperson');dp.onclick=()=>{if(dp.dataset.sure)return leaderCall({action:'removePerson',personId:L.who},'Removed. Their upcoming dates were reassigned.');dp.dataset.sure='1';dp.textContent='Tap again to remove '+nameOf(L.who)};
  app.querySelectorAll('[data-droprole]').forEach(b=>b.onclick=()=>{if(b.dataset.sure)return leaderCall({action:'removeRole',personId:L.who,group:b.dataset.droprole},'Role removed.');b.dataset.sure='1';b.textContent='Tap again to confirm'});
  app.querySelectorAll('[data-addrole]').forEach(b=>b.onclick=()=>leaderCall({action:'setWeekdays',personId:L.who,group:b.dataset.addrole,bits:'1111'},'Role added. Uncheck any days they can\u2019t serve.'));
  document.getElementById('addoff').onclick=()=>{const d=document.getElementById('offdate').value;if(!d)return toast('Pick a date first.');leaderCall({action:'setPersonOff',personId:L.who,date:d,off:true},'Date added.')};
  app.querySelectorAll('[data-unoff]').forEach(b=>b.onclick=()=>leaderCall({action:'setPersonOff',personId:L.who,date:b.dataset.unoff,off:false},'Date removed.'))}
function shirtsView(){const {people,shirts={},shirtsOff}=L.data;const need=people.filter(p=>!shirts[p.id]);const picked=people.length-need.length;
  return `<section class="panel"><div class="top"><h2>Team shirts</h2><span class="pill ${shirtsOff?'wait':'yes'}">${shirtsOff?'Off':'On'}</span></div>
  <p class="small muted">${shirtsOff?'Volunteers can\u2019t see this right now. Saved sizes are kept.':'Volunteers see this on their schedule and pick one size.'}</p>
  <div class="row"><button class="primary" id="shirtsw">${shirtsOff?'Turn on for volunteers':'Turn off for volunteers'}</button><button id="copyshirts">Copy list</button></div></section>
  <section class="panel"><div class="top"><h2>Sizes</h2><span class="muted small">${picked} of ${people.length} picked</span></div>
  <div class="sizes">${SIZES.map(s=>`<div><b>${people.filter(p=>shirts[p.id]===s).length}</b> <span class="small muted">${s}</span></div>`).join('')}</div></section>
  <section class="panel"><h2>Still need a size</h2><p class="${need.length?'':'muted'}">${need.map(p=>esc(p.name)).join(', ')||'Everyone has picked.'}</p></section>
  <section class="panel"><h2>Everyone</h2><div class="scroll"><table><thead><tr><th>Name</th><th>Size</th></tr></thead><tbody>${people.map(p=>`<tr><td>${esc(p.name)}</td><td><select data-ps="${p.id}" aria-label="Shirt size for ${esc(p.name)}"><option value="">Not picked</option>${SIZES.map(s=>`<option${shirts[p.id]===s?' selected':''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></section>`}
function bindShirts(){const {people,shirts={},shirtsOff}=L.data;
  document.getElementById('shirtsw').onclick=()=>leaderCall({action:'setShirtsOff',off:!shirtsOff},shirtsOff?'Shirt sizes are on.':'Shirt sizes are off.');
  document.getElementById('copyshirts').onclick=async()=>{const t=SIZES.map(s=>[s,people.filter(p=>shirts[p.id]===s)]).filter(([,l])=>l.length).map(([s,l])=>`${s} (${l.length}): ${l.map(p=>p.name).join(', ')}`).join('\n');try{await navigator.clipboard.writeText(t||'No sizes yet.');toast('Copied.')}catch{toast('Copying was blocked by this browser.')}};
  app.querySelectorAll('[data-ps]').forEach(s=>s.onchange=()=>leaderCall({action:'setPersonShirt',personId:s.dataset.ps,size:s.value},'Size saved.'))}
function guidesView(){const g=L.data.guides||{},d=L.gd||{};
  return `${can()?`<form class="panel" id="gform"><h2>Add a guide</h2><p class="small muted">Only volunteers with that role see it. Use a Public or Unlisted YouTube video, because Private videos won\u2019t play here.</p>
  <select id="ggroup" aria-label="Role">${Object.entries(GROUPS).map(([k,l])=>`<option value="${k}"${d.group===k?' selected':''}>${esc(l)}</option>`).join('')}</select>
  <input id="gtitle" maxlength="100" placeholder="Title, like Setting up the soundboard" aria-label="Title" value="${esc(d.title)}">
  <input id="gurl" placeholder="YouTube link" aria-label="YouTube link" value="${esc(d.url)}">
  <textarea id="gnote" maxlength="2000" placeholder="Written steps (optional)" aria-label="Written steps">${esc(d.note)}</textarea>
  <button class="primary">Add guide</button></form>`:''}
  ${Object.keys(GROUPS).map(k=>`<section class="panel"><div>${gtag(k)}</div>${(g[k]||[]).map(x=>guideCard(x,can()?k:'')).join('')||'<p class="muted">No guide for this role yet.</p>'}</section>`).join('')}`}
function bindGuides(){
  const total=()=>Object.values(L.data.guides||{}).reduce((n,l)=>n+l.length,0);const val=i=>document.getElementById(i).value;
  const f=document.getElementById('gform');if(f)f.onsubmit=async e=>{e.preventDefault();L.gd={group:val('ggroup'),title:val('gtitle'),url:val('gurl'),note:val('gnote')};const n=total();
    await leaderCall({action:'addGuide',...L.gd},'Guide added.');if(total()>n){L.gd={group:L.gd.group};leaderView()}};
  app.querySelectorAll('[data-dg]').forEach(b=>b.onclick=()=>{if(b.dataset.sure)return leaderCall({action:'removeGuide',group:b.dataset.dg,id:b.dataset.id},'Guide removed.');b.dataset.sure='1';b.textContent='Tap again to remove'})}
function streaks(){const rec={};for(const [k,v] of Object.entries(L.data.attendance||{}))(rec[v.id]=rec[v.id]||[]).push([k.split('|')[0],v.s]);
  const out={};for(const [id,l] of Object.entries(rec)){let n=0;l.sort((a,b)=>a[0].localeCompare(b[0]));for(const [,s] of l){if(s==='M')n++;else if(s==='P'||s==='T')n=0}out[id]=n}return out}
function attCell(s,r){
  const v=L.data.attendance?.[key(s.date,r)]?.s||'';
  return `<div class="att">${[['P','Present'],['T','Tardy'],['M','Missed'],['E','Excused']].map(([c,l])=>`<button class="a${c}" data-att="${c}" data-d="${s.date}" data-r="${esc(r)}" aria-pressed="${v===c}" aria-label="${l}: ${esc(nameOf(s.slots[r]))}, ${esc(r)}">${v===c?CHK:''}${l}</button>`).join('')}</div>`}
function attView(){
  const list=Object.keys(L.data.months).sort();const mo=L.data.months[L.month];const st=streaks();const flagged=L.data.people.filter(p=>st[p.id]>=3);
  const past=mo.services.filter(s=>s.date<=today).reverse();if(!past.some(s=>s.date===L.openAtt))L.openAtt=past[0]?.date;
  return `<section class="panel"><h2>Attendance</h2><p class="small muted">Tap one mark for each person. Tap it again to clear it.</p>
  <select id="amonth" aria-label="Month">${list.map(m=>`<option value="${m}"${m===L.month?' selected':''}>${monthName(m)}</option>`).join('')}</select>
  ${flagged.length?`<p class="err">3 or more misses in a row: ${flagged.map(p=>esc(p.name)).join(', ')}</p>`:''}
  <div>${past.map(s=>`<details class="date"${s.date===L.openAtt?' open':''}><summary>${dayName(s.date)}${(l=>{const n=l.filter(r=>L.data.attendance?.[key(s.date,r)]).length;return `<span class="pill ${n===l.length?'yes':'wait'}">${n===l.length?CHK:''}${n} of ${l.length} marked</span>`})(ROLES.filter(r=>s.slots[r]))}</summary>${ROLES.filter(r=>s.slots[r]).map(r=>`<div class="slot line aslot ${RC[GROUP[r]]}">${tag(r)}<span class="who">${esc(nameOf(s.slots[r]))}</span>${attCell(s,r)}</div>`).join('')}</details>`).join('')||'<p class="muted">No services have happened yet this month.</p>'}</div></section>`}
function bindAtt(){
  document.getElementById('amonth').onchange=e=>{L.month=e.target.value;leaderView()};
  app.querySelectorAll('[data-att]').forEach(b=>b.onclick=()=>{L.openAtt=b.dataset.d;const on=b.getAttribute('aria-pressed')==='true';
    leaderCall({action:'setAttendance',month:L.month,date:b.dataset.d,role:b.dataset.r,status:on?'':b.dataset.att})})}
const MARK={P:['yes','Present'],T:['wait','Tardy'],M:['no','Missed'],E:['','Excused'],'':['','Not marked']};
// Each view ranks everyone by one number. cls sets its colour; low means a smaller number ranks first.
const VIEWS=[['M','Most missed','vM','Missed'],['T','Most tardy','vT','Tardy'],['P','Most present','vP','Present'],['E','Most excused','vE','Excused'],['show','Best show-up rate','vP','Show-up rate'],['row','Misses in a row','vM','In a row']];
function statsView(){
  const since=L.sr?addDays(today,-L.sr):'';const rec={};const st=streaks();
  for(const [k,v] of Object.entries(L.data.attendance||{})){const d=k.split('|')[0];if(d<since||d>today)continue;
    const r=rec[v.id]=rec[v.id]||{P:0,T:0,M:0,E:0,last:''};r[v.s]++;if(v.s==='M'&&d>r.last)r.last=d}
  const view=VIEWS.find(v=>v[0]===L.sv)||VIEWS[0];const [vk,vl,vc,vn]=view;
  const rows=L.data.people.map(p=>{const r=rec[p.id]||{P:0,T:0,M:0,E:0,last:''};const n=r.P+r.T+r.M;return {p,r,n,show:n?Math.round((r.P+r.T)/n*100):-1,row:st[p.id]||0}});
  const val=x=>vk==='show'?x.show:vk==='row'?x.row:x.r[vk];
  rows.sort((a,b)=>val(b)-val(a)||(vk==='show'?b.n-a.n:0)||b.r.M-a.r.M||a.p.name.localeCompare(b.p.name));
  const sum=k=>rows.reduce((n,x)=>n+x.r[k],0);const total=sum('P')+sum('T')+sum('M');
  const fmt=x=>vk==='show'?(x.show<0?'—':x.show+'%'):val(x);const top=rows.filter(x=>val(x)>0).slice(0,3);
  const cols=[['M','Missed'],['T','Tardy'],['P','Present'],['E','Excused'],['show','Show-up rate'],['row','In a row']];
  const cell=(x,k)=>k==='show'?(x.show<0?'—':x.show+'%'):k==='row'?x.row:x.r[k];
  return `<section class="panel"><h2>Attendance stats</h2><p class="small muted">From the marks on the Attendance page. Show-up rate is present and tardy out of present, tardy and missed. Excused doesn’t count against anyone. Tap a name to open their profile.</p>
  <div class="tabs">${[[0,'All time'],[90,'Last 90 days'],[30,'Last 30 days']].map(([d,l])=>`<button data-sr="${d}" aria-pressed="${(L.sr||0)===d}">${l}</button>`).join('')}</div></section>
  <section class="panel stats"><div><b>${sum('P')}</b><span class="small muted">Present</span></div><div><b>${sum('T')}</b><span class="small muted">Tardy</span></div><div><b>${sum('M')}</b><span class="small muted">Missed</span></div><div><b>${total?Math.round((sum('P')+sum('T'))/total*100)+'%':'—'}</b><span class="small muted">Show-up rate</span></div></section>
  <section class="panel"><h2>Rank by</h2><div class="tabs">${VIEWS.map(([k,l,c])=>`<button class="${c}" data-sv="${k}" aria-pressed="${k===vk}">${l}</button>`).join('')}</div>
  ${top.length?`<div class="top3 ${vc}">${top.map((x,i)=>`<div><b>${i+1}</b><button class="link" style="text-align:left" data-prof="${x.p.id}">${esc(x.p.name)}</button><b>${fmt(x)}</b></div>`).join('')}</div>`:`<p class="small muted">No ${vn.toLowerCase()} numbers ${L.sr?'in this period':'yet'}. They fill in as marks are added on the Attendance page.</p>`}</section>
  <section class="panel"><h2>Everyone, ${vl.toLowerCase()} first</h2><div class="scroll"><table class="st ${vc}"><thead><tr><th></th><th>Name</th>${[cols.find(c=>c[0]===vk),...cols.filter(c=>c[0]!==vk)].map(([k,l])=>`<th>${l}</th>`).join('')}<th>Last missed</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td class="rank">${i+1}</td><td><button class="link" data-prof="${x.p.id}">${esc(x.p.name)}</button></td><td class="hot">${fmt(x)}</td>${cols.filter(c=>c[0]!==vk).map(([k])=>`<td${k==='row'&&x.row>=3?' class="err"':''}>${cell(x,k)}</td>`).join('')}<td>${x.r.last?dt(x.r.last).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'—'}</td></tr>`).join('')}</tbody></table></div></section>`}
function bindStats(){app.querySelectorAll('[data-sr]').forEach(b=>b.onclick=()=>{L.sr=+b.dataset.sr;leaderView()});
  app.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{L.sv=b.dataset.sv;keep(leaderView)});
  app.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>{L.pid=b.dataset.prof;L.tab='profile';leaderView();scrollTo(0,0)})}
// Every date this person was scheduled, newest first, with its attendance mark if one was given.
function historyOf(id){const att=L.data.attendance||{};const out=[];
  for(const [k,v] of Object.entries(att))if(v.id===id){const [date,role]=k.split('|');out.push({date,role,s:v.s})}
  for(const m of Object.values(L.data.months))for(const s of m.services)for(const [r,pid] of Object.entries(s.slots))if(pid===id&&!att[key(s.date,r)])out.push({date:s.date,role:r,s:''});
  return out.sort((a,b)=>b.date.localeCompare(a.date))}
function profileView(){
  const p=person(L.pid)||L.data.people[0];L.pid=p.id;const all=historyOf(p.id);const past=all.filter(x=>x.date<=today&&(x.s||x.date<today)),next=all.filter(x=>!past.includes(x)).reverse();
  const n={P:0,T:0,M:0,E:0,'':0};for(const x of past)n[x.s]++;const served=n.P+n.T,counted=served+n.M;
  const byMonth={};for(const x of past){const m=byMonth[x.date.slice(0,7)]=byMonth[x.date.slice(0,7)]||{P:0,T:0,M:0,E:0,'':0};m[x.s]++}
  const ms=Object.keys(byMonth).sort();const tot=m=>Object.values(byMonth[m]).reduce((a,b)=>a+b,0);const max=Math.max(1,...ms.map(tot));
  const order=['P','T','M','E',''];const cls=k=>'s'+(k||'U');const days=['Fri','Sat','Sun','Mon'];
  const mark=x=>{const [c,l]=MARK[x.s];return `<span class="pill ${c}"${c?'':' style="border:1px solid var(--line)"'}>${x.s==='P'?CHK:x.s==='M'?XIC:''}${l}</span>`};
  return `<section class="panel"><h2>Volunteer profile</h2>
  <select id="pwho" aria-label="Volunteer">${L.data.people.map(x=>`<option value="${x.id}"${x.id===p.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select>
  <div>${Object.entries(p.roles).map(([g,bits])=>`<div class="row" style="padding-block:3px">${gtag(g)}<span class="small muted">${days.filter((d,i)=>bits[i]==='1').join(', ')||'No days picked'}</span></div>`).join('')||'<p class="muted">No roles yet.</p>'}</div>
  <button class="link small" id="pedit" style="justify-self:start">Edit this volunteer</button></section>
  <section class="panel stats"><div><b>${served}</b><span class="small muted">Times served</span></div><div><b>${n.M}</b><span class="small muted">Missed</span></div><div><b>${n.T}</b><span class="small muted">Tardy</span></div><div><b>${counted?Math.round(served/counted*100)+'%':'—'}</b><span class="small muted">Showed up</span></div></section>
  <section class="panel"><h2>Attendance chart</h2>${ms.length?`<p class="small muted">Dates scheduled each month, split by how they went.${n.E?` ${n.E} excused.`:''}${n['']?` ${n['']} not marked yet.`:''}</p>
  <div class="key small">${order.filter(k=>n[k]).map(k=>`<span><i class="${cls(k)}"></i>${k==='P'?'Present':MARK[k][1]}</span>`).join('')}</div>
  <div class="bars">${ms.map(m=>{const t=tot(m),label=order.filter(k=>byMonth[m][k]).map(k=>`${byMonth[m][k]} ${MARK[k][1].toLowerCase()}`).join(', ');
    return `<div class="bar" title="${monthName(m)}: ${label}"><span class="small muted">${dt(m+'-01').toLocaleDateString('en-US',{month:'short'})}</span><div class="track" role="img" aria-label="${monthName(m)}: ${label}" style="width:${t/max*100}%">${order.filter(k=>byMonth[m][k]).map(k=>`<span class="seg ${cls(k)}" style="flex:${byMonth[m][k]} 0 0" title="${byMonth[m][k]} ${MARK[k][1].toLowerCase()}"></span>`).join('')}</div><b>${t}</b></div>`}).join('')}</div>`:'<p class="muted">Nothing to chart yet. This fills in after their first scheduled date.</p>'}</section>
  <section class="panel"><div class="top"><h2>Every date so far</h2><span class="muted small">${past.length} scheduled</span></div>
  <div>${past.map(x=>`<div class="hist"><div>${dayName(x.date)}, ${x.date.slice(0,4)}</div>${mark(x)}<div>${tag(x.role)}</div></div>`).join('')||'<p class="muted">No past dates yet.</p>'}</div></section>
  <section class="panel"><div class="top"><h2>Coming up</h2><span class="muted small">${next.length} scheduled</span></div>
  <div>${next.map(x=>`<div class="hist"><div>${dayName(x.date)}</div>${statusPill(answerOf(p.id,x.date,x.role),false,wrongDay(p.id,x.date,x.role))}<div>${tag(x.role)}</div></div>`).join('')||'<p class="muted">Not on any upcoming dates.</p>'}</div></section>`}
function bindProfile(){document.getElementById('pwho').onchange=e=>{L.pid=e.target.value;leaderView()};
  document.getElementById('pedit').onclick=()=>{L.who=L.pid;L.tab='days';leaderView();scrollTo(0,0)}}
function availView(){
  const list=Object.keys(L.data.months).sort();const mo=L.data.months[L.month];const up=mo.services.filter(s=>s.date>=today);if(!up.some(s=>s.date===L.ad))L.ad=up[0]?.date;const s=up.find(x=>x.date===L.ad);
  const byDate={};for(const p of L.data.people)for(const d of Object.keys(L.data.off?.[p.id]||{}))if(d>=today)(byDate[d]=byDate[d]||[]).push(p);
  const extra={};for(const p of L.data.people)for(const d of Object.keys(L.data.on?.[p.id]||{}))if(d>=today)(extra[d]=extra[d]||[]).push(p);
  const gs=s?Object.keys(GROUPS).filter(g=>Object.keys(s.slots).some(r=>GROUP[r]===g)):[];const serving=s?Object.values(s.slots):[];
  return `<section class="panel"><h2>Who can serve</h2><p class="small muted">Pick a date to see each role. A green check means they picked that weekday or offered the date. A red cross means they marked it can’t serve. A filled green name is already scheduled that day.</p>
  <div class="row"><select id="vmonth" aria-label="Month">${list.map(m=>`<option value="${m}"${m===L.month?' selected':''}>${monthName(m)}</option>`).join('')}</select>
  <select id="adate" class="grow" aria-label="Service date">${up.map(x=>`<option value="${x.date}"${x.date===L.ad?' selected':''}>${dayName(x.date)}</option>`).join('')}</select></div>
  ${s?gs.map(g=>{const ps=L.data.people.filter(p=>p.roles[g]);const no=ps.filter(p=>saidNo(p.id,s.date)),ok=ps.filter(p=>!no.includes(p)&&picked(p,g,s.date)),rest=ps.length-no.length-ok.length;
    return `<div class="cue"><div class="top">${gtag(g)}<span class="small muted">${ok.length} available · ${no.length} can’t${rest?` · ${rest} didn’t pick ${weekday(s.date)}s`:''}</span></div>
    <div class="chips">${ok.map(p=>chip(p,serving.includes(p.id)?'yes solid':'yes',CHK,offered(p.id,s.date)?' (offered)':'')).join('')}${no.map(p=>chip(p,'no',XIC)).join('')}${ok.length+no.length?'':'<span class="small muted">Nobody picked this day.</span>'}</div></div>`}).join(''):'<p class="muted">No upcoming services in this month.</p>'}</section>
  <section class="panel"><h2>Who’s off</h2><p class="small muted">Every upcoming date someone marked can’t serve, set by them or by an admin. Create and fill skips them, and they are never picked for a swap.</p>
  ${Object.keys(byDate).sort().map(d=>`<div class="cue"><div class="top"><div class="role">${dayName(d)}</div><span class="pill no">${XIC}${byDate[d].length} off</span></div><div class="chips">${byDate[d].map(p=>chip(p,'no',XIC)).join('')}</div></div>`).join('')||'<p class="muted">Nobody has marked a day off yet.</p>'}</section>
  <section class="panel"><h2>Extra days offered</h2><p class="small muted">Days outside someone’s usual schedule that they offered to serve. They count as available for swaps and Create and fill.</p>
  ${Object.keys(extra).sort().map(d=>`<div class="cue"><div class="top"><div class="role">${dayName(d)}</div><span class="pill yes">${CHK}${extra[d].length} offered</span></div><div class="chips">${extra[d].map(p=>chip(p,'yes',CHK)).join('')}</div></div>`).join('')||'<p class="muted">Nobody has offered an extra day yet.</p>'}</section>`}
function bindAvail(){document.getElementById('vmonth').onchange=e=>{L.month=e.target.value;leaderView()};const a=document.getElementById('adate');if(a)a.onchange=()=>{L.ad=a.value;leaderView()}}
const REM={FOH:['#1d4ed8','#dbe7ff'],Lyrics:['#b91c1c','#fde2e2'],Livestream:['#a8420a','#ffe6d2'],CamSteady:['#15703d','#d6f2e0'],CamWireless:['#6227c9','#ece3ff'],Photos:['#ad1668','#ffdfef']};
const remindDates=()=>Object.values(L.data.months).flatMap(m=>m.services).filter(s=>s.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,10);
const remindFile=()=>new File([L.rb],`media-team-${L.rd}.png`,{type:'image/png'});
function remindView(){const l=remindDates();if(!l.some(s=>s.date===L.rd))L.rd=l[0]?.date;
  if(!l.length)return '<section class="panel"><p class="muted">No upcoming services yet. Add a month on the Schedule tab first.</p></section>';
  const share=navigator.canShare?.({files:[new File(['x'],'x.png',{type:'image/png'})]});
  return `<section class="panel"><h2>Reminder image</h2><p class="small muted">Starts on today, or the next service if there’s none today. Anyone who said they can’t serve shows as Needs cover instead of their name.</p>
  <select id="rdate" aria-label="Service date">${l.map(s=>`<option value="${s.date}"${s.date===L.rd?' selected':''}>${s.date===today?'Today, ':''}${dayName(s.date)}</option>`).join('')}</select>
  <canvas id="rcv" class="shot" role="img" aria-label="Schedule picture for ${dayName(L.rd)}"></canvas>
  <div class="row">${share?'<button class="primary" id="rshare">Share</button>':''}<button${share?'':' class="primary"'} id="rsave">Save image</button>${window.ClipboardItem?'<button id="rcopy">Copy image</button>':''}</div></section>`}
function drawReminder(c,date){
  const s=remindDates().find(x=>x.date===date);const list=ROLES.filter(r=>r in s.slots);
  const W=1080,P=48,HEAD=216,ROW=92,GAP=12,FOOT=76;c.width=W;c.height=HEAD+list.length*(ROW+GAP)+FOOT;
  const x=c.getContext('2d');const box=(a,b,w,h,r,f)=>{x.fillStyle=f;x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h);x.fill()};
  x.fillStyle='#f4f6f9';x.fillRect(0,0,W,c.height);x.fillStyle='#10243e';x.fillRect(0,0,W,HEAD-24);
  x.textBaseline='middle';x.fillStyle='#b7c7dc';x.font='600 34px Barlow,sans-serif';x.fillText(APP_NAME,P,62);
  x.fillStyle='#fff';x.font='700 76px "Barlow Condensed",sans-serif';x.fillText(dayName(date),P,126);x.textAlign='right';x.fillStyle='#ffd27a';x.font='700 60px "Barlow Condensed",sans-serif';x.fillText(`Setup ${setupAt(date)}`,W-P,126);x.textAlign='left';
  list.forEach((r,i)=>{const y=HEAD+i*(ROW+GAP),[ink,tint]=REM[GROUP[r]],id=s.slots[r],gone=id&&answerOf(id,date,r)?.a==='no',miss=!id||gone;
    box(P,y,W-P*2,ROW,14,tint);box(P,y,10,ROW,5,ink);
    x.fillStyle=ink;x.font='600 32px Barlow,sans-serif';x.fillText(r,P+36,y+ROW/2);
    let name=miss?(gone?'Needs cover':'Open'):nameOf(id),fs=40;const room=W-P*2-340-28;
    do{x.font=`600 ${fs}px Barlow,sans-serif`;fs-=2}while(x.measureText(name).width>room&&fs>=24);
    while(x.measureText(name).width>room&&name.length>1)name=name.slice(0,-2)+'…';
    x.fillStyle=miss?'#b91c1c':'#111827';x.fillText(name,P+340,y+ROW/2)});
  x.fillStyle='#4b5563';x.font='500 28px Barlow,sans-serif';x.fillText(`Can’t make it? Please contact your leader.`,P,c.height-FOOT/2)}
function bindRemind(){
  const sel=document.getElementById('rdate');if(!sel)return;sel.onchange=()=>{L.rd=sel.value;leaderView()};
  const c=document.getElementById('rcv');L.rb=null;
  const paint=()=>{if(!c.isConnected)return;drawReminder(c,L.rd);c.toBlob(b=>{L.rb=b},'image/png')};paint();
  if(document.fonts)Promise.all(['700 76px "Barlow Condensed"','600 32px Barlow','500 28px Barlow'].map(f=>document.fonts.load(f))).then(paint,()=>{});
  const on=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=()=>L.rb?fn():toast('The image is still loading. Try again.')};
  on('rshare',async()=>{try{await navigator.share({files:[remindFile()]})}catch(e){if(e.name!=='AbortError')toast('Sharing didn’t work. Try Save image.')}});
  on('rsave',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(L.rb);a.download=remindFile().name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)});
  on('rcopy',async()=>{try{await navigator.clipboard.write([new ClipboardItem({'image/png':L.rb})]);toast('Copied. Paste it into your message.')}catch{toast('Copying was blocked by this browser. Try Save image.')}})}
function rolesView(){
  const rows=L.data.people.filter(p=>p.name.toLowerCase().includes(L.q.toLowerCase()));const gs=Object.keys(GROUPS);
  return `<section class="panel"><h2>Roles</h2><p class="small muted">Tap a box to add or remove a role. It saves right away. New roles start with every day checked, and you can change days under Volunteers. Someone on upcoming dates in a role has to be moved off before that role can be removed.</p>
  <input id="q" placeholder="Search names" value="${esc(L.q)}" aria-label="Search names">
  <div class="scroll"><table id="rt"><thead><tr><th>Name</th>${gs.map(g=>`<th>${gtag(g)}</th>`).join('')}</tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.name)}</td>${gs.map(g=>`<td><input type="checkbox" data-rp="${p.id}" data-rg="${g}"${p.roles[g]?' checked':''} aria-label="${esc(GROUPS[g])}: ${esc(p.name)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`}
let roleQ=Promise.resolve(),rolePending=0;
function bindRoles(){
  const q=document.getElementById('q');q.oninput=()=>{L.q=q.value;leaderView();const n=document.getElementById('q');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
  app.querySelectorAll('[data-rp]').forEach(c=>c.onchange=()=>{
    const id=c.dataset.rp,g=c.dataset.rg,on=c.checked,p=L.data.people.find(x=>x.id===id),was=p.roles[g];
    if(on)p.roles[g]='1111';else delete p.roles[g];rolePending++;
    const body=on?{action:'setWeekdays',personId:id,group:g,bits:'1111'}:{action:'removeRole',personId:id,group:g};
    roleQ=roleQ.then(()=>api('/api/leader',body,hdr())).then(d=>{if(--rolePending===0){L.data=d;toast('Saved.')}},e=>{rolePending--;c.checked=!on;if(was)p.roles[g]=was;else delete p.roles[g];toast(e.message)})})}
function peopleView(){
  const rows=L.data.people.filter(p=>p.name.toLowerCase().includes(L.q.toLowerCase()));
  return `<section class="panel"><div class="top"><h2>People &amp; member numbers</h2><span class="muted small">${L.data.people.length} volunteers</span></div>
  <div class="row"><input id="q" class="grow" placeholder="Search names" value="${esc(L.q)}" aria-label="Search names"><button id="copyall">Copy full list</button></div>
  <div class="scroll"><table><thead><tr><th>Name</th><th>Username</th><th>Number</th><th>PIN</th><th>Access</th><th>Roles</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.username?`${esc(p.username)} <button class="link small" data-clearu="${p.id}">Clear</button>`:'<span class="small muted">Not set</span>'}</td><td class="num">${esc(p.number)}</td><td>${L.data.pinSet?.[p.id]?`<button class="link small" data-reset="${p.id}">Reset</button>`:'<span class="small muted">Not set</span>'}</td><td><select data-access="${p.id}" aria-label="Access for ${esc(p.name)}">${[['','Volunteer'],['supervisor','Supervisor'],['admin','Admin']].map(([v,l])=>`<option value="${v}"${(p.access||'')===v?' selected':''}>${l}</option>`).join('')}</select></td><td class="small muted">${Object.keys(p.roles).map(gtag).join(' ')}</td><td><button class="link small" data-remove="${p.id}">Remove</button></td></tr>`).join('')}</tbody></table></div></section>
  <form class="panel" id="add"><h2>Add a volunteer</h2><input id="pname" placeholder="Full name" aria-label="Full name" required maxlength="60">
  <div>${Object.entries(GROUPS).map(([g,l])=>`<label class="check"><input type="checkbox" data-g="${g}">${esc(l)}</label>`).join('')}</div>
  <p class="small muted">They start as available Friday through Monday and get a number automatically.</p><button class="primary">Add volunteer</button></form>`}
function bindPeople(){
  const q=document.getElementById('q');q.oninput=()=>{L.q=q.value;leaderView();const n=document.getElementById('q');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
  app.querySelectorAll('[data-clearu]').forEach(b=>b.onclick=()=>leaderCall({action:'setPerson',personId:b.dataset.clearu,clearUsername:true},'Username cleared.'));
  app.querySelectorAll('[data-access]').forEach(s=>s.onchange=()=>leaderCall({action:'setPerson',personId:s.dataset.access,access:s.value},'Access updated.'));
  app.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
    if(b.dataset.sure)return leaderCall({action:'removePerson',personId:b.dataset.remove},'Removed. Their upcoming dates were reassigned.');
    b.dataset.sure='1';b.textContent='Tap again to remove'});
  app.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>{
    if(b.dataset.sure)return leaderCall({action:'resetPin',personId:b.dataset.reset},'PIN reset. They can create a new one at next sign-in.');
    b.dataset.sure='1';b.textContent='Tap again to confirm'});
  document.getElementById('copyall').onclick=async()=>{const t=L.data.people.map(p=>p.name+': '+p.number).join('\n');try{await navigator.clipboard.writeText(t);toast('Copied.')}catch{toast('Copying was blocked by this browser.')}};
  document.getElementById('add').onsubmit=e=>{e.preventDefault();const roles={};app.querySelectorAll('[data-g]:checked').forEach(c=>roles[c.dataset.g]='1111');
    leaderCall({action:'addPerson',name:document.getElementById('pname').value,roles},'Volunteer added.')}}

let liveV=null,touched=Date.now();
['click','keydown','touchstart'].forEach(e=>addEventListener(e,()=>{touched=Date.now()},{passive:true}));
function refresh(){if(rolePending||['#parent','#kids','#band','#diaconado'].includes(location.hash))return false;if(location.hash==='#leader'?L.tab==='guides':V.view==='guides')return false;const a=document.activeElement;if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)&&a.type!=='checkbox')return false;
  if(location.hash==='#leader'&&L.data)leaderCall({action:'load'});else if(V.data&&V.token)api('/api/member',{token:V.token,action:'load'}).then(show).catch(()=>{});return true}
async function tick(){if(document.hidden||Date.now()-touched>9e5||!(L.data||V.data))return;
  try{const {v}=await (await fetch('/api/ping',{cache:'no-store'})).json();if(v===null)return;if(liveV===null){liveV=v;return}if(v!==liveV&&refresh())liveV=v}catch{}}
setInterval(tick,15000);addEventListener('visibilitychange',tick);
L.code=store.get('leaderCode',sessionStorage);
function start(){
  if(location.hash==='#parent')return parentStart();if(location.hash==='#kids')return kidsStart();if(location.hash==='#band')return bandStart();if(location.hash==='#diaconado')return diaconadoStart();
  if(location.hash==='#leader'){if(L.code||V.token)leaderCall({action:'load'});else leaderLogin()}
  else if(V.token)memberLoad();else memberLogin()}
addEventListener('hashchange',()=>{enter();start()});setupThemes();enter();start();
