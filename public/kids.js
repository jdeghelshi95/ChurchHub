/* Kids Ministry screens. Loaded before app.js, and uses its helpers (app, esc, api, toast, store, dt, dayName, CHK, XIC, LOGO) when called. */
const DIAPER_LABEL = { no: 'No', diapers: 'Diapers', pullups: 'Pull-ups', training: 'Potty training' };
const ROLE_LABEL = { lead: 'Kids Ministry lead', teacher: 'Teacher', assistant: 'Assistant teacher', checkin: 'Check-in desk', admin: 'Admin' };
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const roomName = (rooms, id) => rooms.find((r) => r.id === id)?.name || 'Room';
const kval = (id) => document.getElementById(id)?.value ?? '';
const fmtPhone = (p) => p ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : '';

// The row of ministries at the top of every leader page. Band and Diaconado are being built out.
const MINISTRIES = [['leader', 'Production'], ['kids', 'Kids'], ['band', 'Band'], ['diaconado', 'Diaconado']];
const MIN_SVG = (inner) => `<svg class="mico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
// Production: a computer. Kids: a teacher with two children. Band: a piano keyboard. Diaconado: a person in a suit.
const MIN_ICON = {
  leader: MIN_SVG('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  kids: MIN_SVG('<circle cx="12" cy="5.500" r="2.500"/><path d="M7.500 20v-5a4.500 4.500 0 0 1 9 0v5"/><circle cx="4.500" cy="13" r="1.700"/><path d="M2 20v-1.500a2.600 2.600 0 0 1 3.500-2.400"/><circle cx="19.500" cy="13" r="1.700"/><path d="M22 20v-1.500a2.600 2.600 0 0 0-3.500-2.400"/>'),
  band: MIN_SVG('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7.500 18v-5M12 18v-5M16.500 18v-5"/><path d="M6.500 6v7h2V6M11 6v7h2V6M15.500 6v7h2V6" fill="currentColor" stroke-width="1"/>'),
  diaconado: MIN_SVG('<circle cx="12" cy="6" r="3"/><path d="M5 21v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v2"/><path d="M12 13.500l-1.300 2 1.300 3.500 1.300-3.500z" fill="currentColor" stroke-width="1"/><path d="M9.300 13.300 12 16l2.700-2.700"/>'),
};
function ministryBar(active) {
  const cur = MINISTRIES.find((m) => m[0] === active);
  return `<div class="mswitch"><button class="mbtn" id="mbtn" aria-haspopup="true" aria-expanded="false" aria-controls="mmenu">${MIN_ICON[cur[0]]}<span>${cur[1]}</span><svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg></button>
  <div class="mmenu" id="mmenu" role="menu" aria-label="Switch ministry" hidden>${MINISTRIES.map(([h, l]) => `<button role="menuitem" data-min="${h}"${h === active ? ' aria-current="true"' : ''}>${MIN_ICON[h]}<span class="grow">${l}</span>${h === active ? CHK : ''}</button>`).join('')}</div></div>`;
}
function closeMinistryMenu() {
  const m = document.getElementById('mmenu'), b = document.getElementById('mbtn');
  if (m && !m.hidden) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); }
}
function bindMinistryBar() {
  const b = document.getElementById('mbtn'), m = document.getElementById('mmenu');
  if (b) b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) m.querySelector('[aria-current]')?.focus(); };
  app.querySelectorAll('[data-min]').forEach((x) => x.onclick = () => { location.hash = x.dataset.min === 'leader' && !(L.code || V.data?.access) ? '' : x.dataset.min; });
}
addEventListener('click', (e) => { if (!e.target.closest?.('.mswitch')) closeMinistryMenu(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMinistryMenu(); document.getElementById('mbtn')?.focus(); } });
// Signs out of everything on this device, from any ministry page.
function signOutAll() {
  store.del('leaderCode', sessionStorage); store.del('memberToken');
  L.code = null; L.data = null; V.token = null; V.data = null; K.data = null; if (typeof B !== 'undefined') B.data = null;
  if (location.hash) location.hash = ''; else start();
}
const barActions = (refreshId) => `<span hidden>${barBtn(refreshId, 'Refresh', ICON_REFRESH)}${barBtn('allout', 'Sign out', ICON_OUT)}</span>`;
function diaconadoStart() {
  app.innerHTML = `<div class="top"><div><p class="muted">Ministries</p><h1>Diaconado</h1></div><div class="row">${ministryBar('diaconado')}</div></div>
  <section class="panel"><h2>Coming soon</h2><p class="muted">This ministry has a place saved. Scheduling and tools for Diaconado will be added here.</p></section><span hidden>${barBtn('allout', 'Sign out', ICON_OUT)}</span>`;
  app.querySelector('#allout').onclick = signOutAll;
  bindMinistryBar();
}

// The other adults in a family, with a form to add one. Used on the parent page and on the staff family profile.
function adultsPanel(f) {
  return `<section class="panel"><h2>Other adults</h2><p class="small muted">Adults in this family who may also drop off and pick up.</p>
  ${(f.adults || []).map((a) => `<div class="row"><span class="grow"><b>${esc(a.name)}</b><br><span class="small muted">${esc([a.relation, fmtPhone(a.phone)].filter(Boolean).join(' · ') || 'Adult')}</span></span><button class="link small" data-deladult="${a.id}">Remove</button></div>`).join('') || '<p class="muted">No other adults yet.</p>'}
  <form id="adultform" style="display:grid;gap:8px"><input id="aname" placeholder="Adult’s name" maxlength="60" aria-label="Adult’s name" required>
  <div class="row"><input id="arel" class="grow" placeholder="Relation, like Grandma" maxlength="40" aria-label="Relation"><input id="aphone" class="grow" type="tel" placeholder="Phone (optional)" maxlength="20" aria-label="Phone"></div><button>Add adult</button></form></section>`;
}
function bindAdults(call) {
  const f = document.getElementById('adultform');
  if (f) f.onsubmit = (e) => { e.preventDefault(); call({ action: 'addAdult', name: kval('aname'), relation: kval('arel'), phone: kval('aphone') }, 'Adult added.'); };
  app.querySelectorAll('[data-deladult]').forEach((b) => b.onclick = () => { if (b.dataset.sure) return call({ action: 'removeAdult', adultId: b.dataset.deladult }, 'Removed.'); b.dataset.sure = '1'; b.textContent = 'Tap again to remove'; });
}

// A QR code as an SVG picture, or nothing if the QR library didn't load. The code is always printed as digits too.
function qrSvg(textValue, cell = 5) {
  if (!window.qrcode) return '';
  const q = window.qrcode(0, 'M');
  q.addData(textValue);
  q.make();
  return q.createSvgTag({ cellSize: cell, margin: 0, scalable: true });
}
const passText = (date, code) => `CHURCHHUB:${date}:${code}`;

function chatBox(messages, mine, sendId) {
  return `<div class="chat" id="chatlog">${messages.map((m) => `<div class="msg ${m.from === mine ? 'me' : ''}"><div class="small muted">${esc(m.name)} · ${dt(m.at.slice(0, 10)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeOf(m.at)}</div><div>${esc(m.text)}</div></div>`).join('') || '<p class="muted">No messages yet.</p>'}</div>
  <form class="row" id="${sendId}"><input id="chattext" class="grow" maxlength="500" placeholder="Write a message" aria-label="Message" autocomplete="off"><button class="primary">Send</button></form>`;
}
const scrollChat = () => { const c = document.getElementById('chatlog'); if (c) c.scrollTop = c.scrollHeight; };

/* ---------- Parents ---------- */
const P = { token: null, data: null, tab: 'checkin', edit: null, mode: 'login' };
const pHdr = () => ({ 'x-parent-token': P.token });

function parentStart() {
  P.token = store.get('parentToken');
  if (P.token) parentCall({ action: 'pload' }); else parentLogin();
}
function parentLogin(msg) {
  const reg = P.mode === 'register', claim = P.mode === 'claim';
  app.innerHTML = `<div class="land">${LOGO}<p class="muted">Kids Ministry check-in for parents.</p></div>
  <form class="panel" id="f"><h2>${reg ? 'Register your family' : claim ? 'Choose your PIN' : 'Parent sign-in'}</h2>
  ${reg ? '<label class="lbl" for="pname">Your name</label><input id="pname" class="field" maxlength="60" autocomplete="name" required>' : ''}
  <label class="lbl" for="pphone">Mobile number</label><input id="pphone" class="field" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required value="${esc(P.phone || '')}">
  <label class="lbl" for="ppin">${reg || claim ? 'Choose a PIN (4 to 6 digits)' : 'PIN'}</label><input id="ppin" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="${reg || claim ? 'new-password' : 'current-password'}" ${claim ? '' : 'required'}>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ''}<button class="primary">${reg ? 'Register' : claim ? 'Save PIN and sign in' : 'Sign in'}</button></form>
  <button class="link small" id="swap" style="justify-self:center">${reg || claim ? 'Back to sign in' : 'New here? Register your family.'}</button>
  <button class="link small" id="home" style="justify-self:center">Volunteer sign-in</button>`;
  document.getElementById('swap').onclick = () => { P.mode = reg || claim ? 'login' : 'register'; parentLogin(); };
  document.getElementById('home').onclick = () => { location.hash = ''; };
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    P.phone = kval('pphone');
    const body = reg ? { action: 'register', parent: kval('pname'), phone: P.phone, pin: kval('ppin') } : { action: 'plogin', phone: P.phone, pin: kval('ppin'), claim };
    try { const r = await api('/api/kids', body); P.token = r.token; store.set('parentToken', r.token); P.data = r; P.mode = 'login'; P.tab = r.family.kids.length ? 'checkin' : 'kids'; parentView(); }
    catch (er) { if (er.status === 409 && !reg) P.mode = 'claim'; parentLogin(er.message); }
  };
}
async function parentCall(body, done) {
  try { P.data = await api('/api/kids', body, pHdr()); if (P.data.family.theme) applyTheme(P.data.family.theme); keep(parentView); if (done) toast(done); return true; }
  catch (e) {
    if (e.status === 401) { store.del('parentToken'); P.token = null; parentLogin(e.message); }
    else { toast(e.message); if (!P.data) parentLogin(e.message); }
    return false;
  }
}
function kidForm(k = {}) {
  const f = (id, label, value, extra = '') => `<label class="lbl" for="${id}">${label}</label><input id="${id}" class="field" value="${esc(value)}" ${extra}>`;
  return `<form class="panel" id="kidform"><h2>${k.id ? 'Edit ' + esc(k.name) : 'Add a child'}</h2>
  ${f('kname', 'Child’s name', k.name, 'maxlength="60" required')}
  ${f('kbirth', 'Birthday', k.birth, 'type="date" required')}
  ${f('kallergy', 'Allergies', k.allergies, 'maxlength="200" placeholder="Leave blank if none"')}
  ${f('kmedical', 'Medical needs or medication', k.medical, 'maxlength="300" placeholder="Leave blank if none"')}
  <label class="lbl" for="kdiaper">Diapers</label><select id="kdiaper" class="field">${Object.entries(DIAPER_LABEL).map(([v, l]) => `<option value="${v}"${(k.diapers || 'no') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
  ${f('kbottle', 'Bottle or feeding instructions', k.bottle, 'maxlength="200" placeholder="For example: 4 oz at 10:30"')}
  ${f('kfood', 'Food and snack preferences', k.food, 'maxlength="200" placeholder="For example: no dairy, vegetarian"')}
  ${f('knotes', 'Anything else teachers should know', k.notes, 'maxlength="300"')}
  <div class="row"><button class="primary">Save</button><button type="button" id="kcancel">Cancel</button>${k.id ? '<button type="button" class="link small" id="kdel">Remove this child</button>' : ''}</div></form>`;
}
function parentView() {
  const { family, entries, code, date, rooms, reminder, chat, unread, history, kidRooms } = P.data;
  const inNow = entries.filter((e) => !e.outAt);
  const inIds = new Set(inNow.map((e) => e.kidId));
  const waiting = family.kids.filter((k) => !inIds.has(k.id));
  const tabs = [['checkin', 'Check-in'], ['kids', 'My kids'], ['chat', 'Messages' + (unread ? ' •' : '')]];
  let body = '';
  if (P.tab === 'kids') {
    body = P.edit ? kidForm(P.edit === 'new' ? {} : family.kids.find((k) => k.id === P.edit)) : `
    <section class="panel"><div class="top"><h2>My kids</h2><button class="primary" id="addkid">Add a child</button></div>
    ${family.kids.map((k) => `<div class="cue"><div class="top"><div><div class="role">${esc(k.name)}</div><div class="muted small">${roomName(rooms, kidRooms[k.id])} · ${history[k.id] || 0} visit${history[k.id] === 1 ? '' : 's'}</div></div><button data-editkid="${k.id}">Edit</button></div>
    <div class="chips">${k.allergies ? `<span class="pill no">Allergy: ${esc(k.allergies)}</span>` : ''}${k.diapers !== 'no' ? `<span class="pill wait">${DIAPER_LABEL[k.diapers]}</span>` : ''}${k.bottle ? '<span class="pill wait">Bottle</span>' : ''}</div></div>`).join('') || '<p class="muted">Add your children so you can check them in.</p>'}</section>
    <form class="panel" id="famform"><h2>Family details</h2><label class="lbl" for="fparent">Your name</label><input id="fparent" class="field" maxlength="60" value="${esc(family.parent)}" required>
    <button class="primary">Save</button></form>${adultsPanel(family)}`;
  } else if (P.tab === 'chat') {
    body = `<section class="panel"><h2>Messages with the teachers</h2><p class="small muted">Ask how your child is doing, or reply to a teacher. Teachers see this during service.</p>${chatBox(chat, 'parent', 'psend')}</section>`;
  } else {
    body = `${inNow.length ? `<section class="panel pass"><h2>Your pickup pass</h2><p class="small muted">Show this at the check-in desk to get your labels, and again at pickup. The code is for today only.</p>
    <div class="qr">${qrSvg(passText(date, code))}</div><div class="bigcode">${esc(code)}</div>
    ${inNow.map((e) => `<div class="row"><span class="grow"><b>${esc(e.name)}</b></span><span class="pill yes">${CHK}${esc(roomName(rooms, e.roomId))} · in at ${timeOf(e.inAt)}</span></div>`).join('')}</section>` : ''}
    <section class="panel"><h2>Check in for today</h2><p class="muted small">${dayName(date)}</p>
    ${!family.kids.length ? '<p class="muted">Add your children under My kids first.</p>' : waiting.length ? `${waiting.map((k) => `<label class="check kidpick"><input type="checkbox" data-ck="${k.id}" checked><span class="grow"><b>${esc(k.name)}</b><br><span class="small muted">${esc(roomName(rooms, kidRooms[k.id]))}${k.allergies ? ' · Allergy: ' + esc(k.allergies) : ''}</span></span></label>`).join('')}
    <button class="primary" id="docheckin">Check in</button>` : '<p class="muted">Everyone is checked in.</p>'}
    ${entries.filter((e) => e.outAt).map((e) => `<div class="row small muted"><span class="grow">${esc(e.name)}</span><span>Picked up at ${timeOf(e.outAt)}</span></div>`).join('')}</section>`;
  }
  app.innerHTML = `${reminder && inNow.length ? `<div class="alert pick" role="alert"><span>Service has ended. Please come pick up ${esc(inNow.map((e) => e.name).join(' and '))}.</span></div>` : ''}
  <div class="top"><div><p class="muted">Kids Ministry</p><h1>${esc(family.parent)}</h1></div>${barBtn('pout', 'Sign out', ICON_OUT)}</div>
  <div class="tabs">${tabs.map(([t, l]) => `<button data-pt="${t}" aria-pressed="${P.tab === t}">${l}</button>`).join('')}</div>${body}`;
  app.querySelector('#pout').onclick = () => { store.del('parentToken'); P.token = null; P.data = null; parentLogin(); };
  app.querySelectorAll('[data-pt]').forEach((b) => b.onclick = () => { P.tab = b.dataset.pt; P.edit = null; parentView(); if (P.tab === 'chat') { scrollChat(); if (unread) { P.data.unread = false; api('/api/kids', { action: 'pseen' }, pHdr()).catch(() => {}); } } });
  if (P.tab === 'chat') scrollChat();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el[el.tagName === 'FORM' ? 'onsubmit' : 'onclick'] = fn; };
  on('addkid', () => { P.edit = 'new'; parentView(); });
  app.querySelectorAll('[data-editkid]').forEach((b) => b.onclick = () => { P.edit = b.dataset.editkid; parentView(); });
  on('kcancel', () => { P.edit = null; parentView(); });
  on('kdel', (e) => { const b = e.target; if (b.dataset.sure) { const id = P.edit; P.edit = null; return parentCall({ action: 'removeKid', kidId: id }, 'Removed.'); } b.dataset.sure = '1'; b.textContent = 'Tap again to remove'; });
  on('kidform', async (e) => {
    e.preventDefault();
    const kid = { id: P.edit === 'new' ? undefined : P.edit, name: kval('kname'), birth: kval('kbirth'), allergies: kval('kallergy'), medical: kval('kmedical'), diapers: kval('kdiaper'), bottle: kval('kbottle'), food: kval('kfood'), notes: kval('knotes') };
    const was = P.edit; P.edit = null;
    if (!(await parentCall({ action: 'saveKid', kid }, 'Saved.'))) { P.edit = was; }
  });
  on('famform', (e) => { e.preventDefault(); parentCall({ action: 'saveFamily', parent: kval('fparent') }, 'Saved.'); });
  bindAdults(parentCall);
  on('docheckin', () => { const kidIds = [...app.querySelectorAll('[data-ck]:checked')].map((c) => c.dataset.ck); if (!kidIds.length) return toast('Pick at least one child.'); parentCall({ action: 'checkin', kidIds }, 'Checked in. Show your pass at the desk.'); });
  on('psend', async (e) => { e.preventDefault(); const t = kval('chattext'); if (!t.trim()) return; await parentCall({ action: 'psend', text: t }); scrollChat(); });
}

/* ---------- Kids Team staff ---------- */
const K = { data: null, tab: 'today', q: '', fam: null, thread: null, code: '', print: null, prof: null, kidEdit: null, fq: '', station: false, printing: false, deskNew: false };
const isLead = () => ['admin', 'lead'].includes(K.data.me.level);
const canTeach = () => isLead() || K.data.me.level === 'teacher';

function kidsStart() {
  if (!L.code) L.code = store.get('leaderCode', sessionStorage);
  if (!L.code && !V.token) { location.hash = ''; return; }
  // A print station left running picks up where it was after a reload.
  if (store.get('printStation') === '1') { K.station = true; K.tab = 'station'; }
  kidsCall({ action: 'sload' });
}
async function kidsCall(body, done) {
  try { K.data = await api('/api/kids', body, hdr()); keep(kidsView); if (done) toast(done); return true; }
  catch (e) { toast(e.message); if (!K.data) { app.innerHTML = `<section class="panel"><h2>Kids Ministry</h2><p class="err">${esc(e.message)}</p><button id="kback">Back</button></section>`; document.getElementById('kback').onclick = () => { location.hash = ''; }; } return false; }
}
function kidBadges(i) {
  if (!i) return '';
  return `${i.allergies ? `<span class="pill no">Allergy: ${esc(i.allergies)}</span>` : ''}${i.medical ? `<span class="pill no">Medical: ${esc(i.medical)}</span>` : ''}${i.diapers && i.diapers !== 'no' ? `<span class="pill wait">${DIAPER_LABEL[i.diapers]}</span>` : ''}${i.bottle ? `<span class="pill wait">Bottle: ${esc(i.bottle)}</span>` : ''}${i.food ? `<span class="pill wait">Food: ${esc(i.food)}</span>` : ''}`;
}
function todayTab() {
  const { rooms, entries, reminders } = K.data;
  const here = entries.filter((e) => !e.outAt);
  const match = K.code.length === 4 ? here.filter((e) => e.code === K.code) : [];
  return `<section class="panel"><h2>Pickup</h2><p class="small muted">Type or scan the 4-digit code on the parent’s pass. Only release a child when the code matches.</p>
  <div class="row"><input id="pcode" class="grow code" inputmode="numeric" maxlength="4" placeholder="Code" value="${esc(K.code)}" aria-label="Pickup code">${'BarcodeDetector' in window ? '<button id="scan">Scan</button>' : ''}</div>
  ${K.code.length === 4 ? (match.length ? `<div class="thanks"><div class="done">${CHK}Code ${esc(K.code)} matches</div>${match.map((e) => `<div class="row"><span class="grow"><b>${esc(e.name)}</b><br><span class="small">${esc(roomName(rooms, e.roomId))} · Parent: ${esc(e.info?.parent || '')}</span></span><button class="primary" data-out="${e.kidId}">Release</button></div>`).join('')}</div>` : `<p class="err">No child here has code ${esc(K.code)}. Do not release. Get a Kids Ministry leader.</p>`) : ''}</section>
  <section class="panel stats"><div><b>${here.length}</b><span class="small muted">Here now</span></div><div><b>${entries.length - here.length}</b><span class="small muted">Picked up</span></div><div><b>${here.filter((e) => e.info?.allergies).length}</b><span class="small muted">Allergies</span></div><div><b>${rooms.filter((r) => here.some((e) => e.roomId === r.id)).length}</b><span class="small muted">Rooms open</span></div></section>
  ${rooms.map((r) => { const list = here.filter((e) => e.roomId === r.id); return `<section class="panel"><div class="top"><h2>${esc(r.name)}</h2><span class="muted small">Ages ${r.min}–${r.max} · ${list.length} here</span></div>
    ${list.map((e) => `<div class="cue"><div class="top"><div><div class="role">${esc(e.name)}</div><div class="small muted">${e.info ? `Age ${e.info.age} · ` : ''}Parent: ${esc(e.info?.parent || '')} · in at ${timeOf(e.inAt)}</div></div>${reminders[e.fid] ? '<span class="pill wait">Parent reminded</span>' : ''}</div>
    <div class="chips">${kidBadges(e.info)}</div>${e.info?.notes ? `<div class="small">Note: ${esc(e.info.notes)}</div>` : ''}${e.info?.pickup ? `<div class="small muted">May also pick up: ${esc(e.info.pickup)}</div>` : ''}
    <div class="row"><button data-remind="${e.fid}">Remind parent</button><button data-msg="${e.fid}">Message parent</button><select data-move="${e.kidId}" aria-label="Room for ${esc(e.name)}">${rooms.map((x) => `<option value="${x.id}"${x.id === e.roomId ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div></div>`).join('') || '<p class="muted">Nobody checked in yet.</p>'}
    ${list.length ? `<button data-remindroom="${r.id}">Remind all ${esc(r.name)} parents to pick up</button>` : ''}</section>`; }).join('')}`;
}
// One printed label. What it shows comes from the label settings on the Rooms and labels page.
function childLabel(o, d) {
  return `<div class="label${o.big ? ' big' : ''}">${o.header ? `<div class="lhead">${esc(o.header)}</div>` : ''}<div class="ltext"><div class="lname">${esc(d.name.split(' ')[0].toUpperCase())}</div>
  <div>${esc(d.name)}${o.age && d.age != null ? ' · Age ' + d.age : ''}</div>${o.room ? `<div><b>${esc(d.room)}</b></div>` : ''}
  ${o.allergy && d.allergies ? `<div class="lwarn">ALLERGY: ${esc(d.allergies.toUpperCase())}</div>` : ''}${o.medical && d.medical ? `<div class="lwarn">MEDICAL: ${esc(d.medical.toUpperCase())}</div>` : ''}
  ${o.parent ? `<div class="lsmall">Parent: ${esc(d.parent)}</div>` : ''}${o.date ? `<div class="lsmall">${esc(d.day)}</div>` : ''}${o.footer ? `<div class="lsmall">${esc(o.footer)}</div>` : ''}</div>
  <div class="lcode">${d.qr}<b>${esc(d.code)}</b></div></div>`;
}
function labelSheet(f, only, withPass = true) {
  const { date, rooms, entries, label } = K.data;
  const all = entries.filter((e) => e.fid === f.id && !e.outAt);
  const mine = only ? all.filter((e) => only.includes(e.kidId)) : all;
  const qr = qrSvg(passText(date, f.code), 4);
  const day = dayName(date);
  return `${mine.map((e) => childLabel(label, { name: e.name, age: e.info?.age, room: roomName(rooms, e.roomId), allergies: e.info?.allergies, medical: e.info?.medical, parent: f.parent, day, code: f.code, qr })).join('')}
  ${withPass ? `<div class="label${label.big ? ' big' : ''}">${label.header ? `<div class="lhead">${esc(label.header)}</div>` : ''}<div class="ltext"><div class="lname" style="font-size:16pt">PICKUP PASS</div><div><b>${esc(f.parent)}</b></div>${all.map((e) => `<div>${esc(e.name)} · ${esc(roomName(rooms, e.roomId))}</div>`).join('')}<div class="lsmall">${day} · Show this to pick up</div></div><div class="lcode">${qr}<b>${esc(f.code)}</b></div></div>` : ''}`;
}
// Families with labels still to print. A family gets its pickup pass the first time any of its labels print.
function printQueue() {
  const { families, entries } = K.data;
  const live = entries.filter((e) => !e.outAt);
  return families.map((f) => {
    const mine = live.filter((e) => e.fid === f.id);
    const waiting = mine.filter((e) => !e.printedAt);
    return { f, waiting, printed: mine.filter((e) => e.printedAt), withPass: waiting.length === mine.length };
  }).filter((x) => x.waiting.length || x.printed.length);
}
function stationTab() {
  const q = printQueue();
  const waiting = q.filter((x) => x.waiting.length), done = q.filter((x) => x.printed.length);
  const names = (list) => list.map((e) => esc(e.name)).join(', ');
  return `<section class="panel${K.station ? ' pass' : ''}"><div class="top"><h2>Print station</h2><span class="pill ${K.station ? 'yes' : 'wait'}">${K.station ? CHK + 'On' : 'Off'}</span></div>
  <p class="small muted" style="text-align:left">Leave this page open on the computer connected to the label printer. When a family checks in, on their own phone or at the desk, their labels and pickup pass print here on their own. Keep this tab in front; it pauses if the page is hidden.</p>
  <button class="primary" id="stationtoggle">${K.station ? 'Stop the print station' : 'Start the print station'}</button>
  ${K.station ? `<p class="small" style="text-align:left">${waiting.length ? 'Printing…' : 'Waiting for the next check-in.'}</p>` : ''}</section>
  <section class="panel"><div class="top"><h2>Waiting to print</h2><span class="muted small">${waiting.length}</span></div>
  ${waiting.map((x) => `<div class="row"><span class="grow"><b>${esc(x.f.parent)}</b><br><span class="small muted">Code ${esc(x.f.code)} · ${names(x.waiting)}</span></span>${K.station ? '' : `<button data-printnow="${x.f.id}">Print now</button>`}</div>`).join('') || '<p class="muted">Nothing is waiting.</p>'}</section>
  <section class="panel"><div class="top"><h2>Printed today</h2><span class="muted small">${done.length}</span></div>
  ${done.map((x) => `<div class="row"><span class="grow"><b>${esc(x.f.parent)}</b><br><span class="small muted">Code ${esc(x.f.code)} · ${names(x.printed)}</span></span><button data-print="${x.f.id}">Print again</button></div>`).join('') || '<p class="muted">Nothing has printed yet.</p>'}</section>
  <section class="panel"><h2>Printing without a pop-up</h2><p class="small muted">Browsers ask before each print unless told otherwise. On the station computer, set the Brother label printer as the default printer and open Chrome with kiosk printing turned on (the <b>--kiosk-printing</b> option on its shortcut). Labels then print with no window to click.</p></section>`;
}
// Prints whatever is waiting, then records it as printed. Runs each time the station page redraws.
function stationRun(only) {
  if (K.printing || (!only && !(K.station && K.tab === 'station'))) return;
  const jobs = printQueue().filter((x) => x.waiting.length && (!only || x.f.id === only));
  if (!jobs.length) return;
  K.printing = true;
  const area = document.getElementById('printarea');
  area.className = 'labels';
  area.innerHTML = jobs.map((x) => labelSheet(x.f, x.waiting.map((e) => e.kidId), x.withPass)).join('');
  const kidIds = jobs.flatMap((x) => x.waiting.map((e) => e.kidId));
  setTimeout(async () => {
    window.print();
    try { K.data = await api('/api/kids', { action: 'markPrinted', kidIds }, hdr()); }
    catch (e) { K.station = false; store.del('printStation'); toast('The print station stopped: ' + e.message); }
    K.printing = false;
    kidsView();
  }, 60);
}
function deskTab() {
  const { families, rooms, entries } = K.data;
  const q = K.q.trim().toLowerCase();
  const found = q ? families.filter((f) => f.parent.toLowerCase().includes(q) || f.phone.includes(q.replace(/\D/g, '') || '\u0000') || f.kids.some((k) => k.name.toLowerCase().includes(q))).slice(0, 8) : [];
  const fam = families.find((f) => f.id === K.fam);
  const inIds = new Set(entries.filter((e) => !e.outAt).map((e) => e.kidId));
  const ready = families.filter((f) => f.code && entries.some((e) => e.fid === f.id && !e.outAt));
  return `<section class="panel"><h2>Find a family</h2><input id="kq" placeholder="Parent name, phone or child’s name" value="${esc(K.q)}" aria-label="Search families">
  ${found.map((f) => `<button class="day" data-fam="${f.id}" aria-pressed="${f.id === K.fam}"><span>${esc(f.parent)}<br><span class="small muted">${esc(f.kids.map((k) => k.name).join(', ') || 'No children added')}</span></span><span class="small muted">…${f.phone.slice(-4)}</span></button>`).join('') || (q ? '<p class="muted">No family matches. Create a profile for them below.</p>' : '<p class="small muted">Parents can also check in on their own phone. Their labels appear below, or print on their own at the print station.</p>')}
  ${K.deskNew ? `<form id="desknewform" style="display:grid;gap:8px"><h3>New family profile</h3><input id="dparent" placeholder="Parent’s name" maxlength="60" aria-label="Parent’s name" required><input id="dphone" type="tel" placeholder="Mobile number" maxlength="20" aria-label="Mobile number" required>
  <div class="row"><button class="primary">Create and add children</button><button type="button" id="desknewcancel">Cancel</button></div></form>` : '<button id="desknew">Create a profile for a new family</button>'}</section>
  ${fam ? `<section class="panel"><h2>${esc(fam.parent)}</h2>${fam.kids.map((k) => `<label class="check kidpick"><input type="checkbox" data-sk="${k.id}"${inIds.has(k.id) ? ' disabled' : ' checked'}><span class="grow"><b>${esc(k.name)}</b><br><span class="small muted">Age ${k.age} · ${esc(roomName(rooms, k.roomId))}${k.allergies ? ' · Allergy: ' + esc(k.allergies) : ''}${inIds.has(k.id) ? ' · Checked in' : ''}</span></span></label>`).join('') || '<p class="muted">This family hasn’t added any children yet.</p>'}
  ${fam.kids.some((k) => !inIds.has(k.id)) ? '<button class="primary" id="sdo">Check in and print labels</button>' : ''}</section>` : ''}
  <section class="panel"><h2>Labels</h2><p class="small muted">One label per child and one pickup pass per family, all with the same code. Choose the Brother label printer in the print window.</p>
  ${ready.map((f) => `<div class="row"><span class="grow"><b>${esc(f.parent)}</b><br><span class="small muted">Code ${esc(f.code)} · ${entries.filter((e) => e.fid === f.id && !e.outAt).map((e) => esc(e.name)).join(', ')}</span></span><span class="pill ${entries.some((e) => e.fid === f.id && !e.outAt && !e.printedAt) ? 'wait' : 'yes'}">${entries.some((e) => e.fid === f.id && !e.outAt && !e.printedAt) ? 'Not printed' : CHK + 'Printed'}</span><button data-print="${f.id}">Print labels</button></div>`).join('') || '<p class="muted">Nobody is checked in yet.</p>'}</section>`;
}
function chatTab() {
  const { chats } = K.data;
  const list = [...chats].sort((a, b) => (b.unread - a.unread) || b.last.localeCompare(a.last));
  const t = chats.find((c) => c.fid === K.thread);
  if (t) return `<section class="panel"><div class="top"><div><h2>${esc(t.parent)}</h2><div class="small muted">${esc(t.kids)}</div></div><button id="tback">All messages</button></div>
  <div class="row small"><span class="muted">Quick questions:</span>${['Does your child have a food preference today?', 'We need more diapers, can you bring some?', 'What time was the last bottle?'].map((q) => `<button class="link small" data-quick="${esc(q)}">${esc(q)}</button>`).join('')}</div>${chatBox(t.messages, 'staff', 'ssend')}</section>`;
  return `<section class="panel"><h2>Messages</h2><p class="small muted">Families checked in today, and anyone who has written.</p>${list.map((c) => `<button class="day" data-thread="${c.fid}"><span>${esc(c.parent)}<br><span class="small muted">${esc(c.kids)}</span></span>${c.unread ? '<span class="pill no">New</span>' : `<span class="small muted">${c.messages.length || 'No'} message${c.messages.length === 1 ? '' : 's'}</span>`}</button>`).join('') || '<p class="muted">No conversations yet.</p>'}</section>`;
}
function materialsTab() {
  const { rooms, materials } = K.data;
  return `${canTeach() ? `<form class="panel" id="mform"><h2>Add teaching material</h2><select id="mroom" aria-label="Room">${rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
  <input id="mtitle" maxlength="100" placeholder="Title, like Week 3: David and Goliath" aria-label="Title"><input id="murl" placeholder="YouTube link or a link to a document (https://)" aria-label="Link">
  <textarea id="mnote" maxlength="2000" placeholder="Lesson notes, supply list or steps (optional)" aria-label="Notes"></textarea><button class="primary">Add material</button></form>` : ''}
  ${rooms.map((r) => `<section class="panel"><h2>${esc(r.name)}</h2>${(materials[r.id] || []).map((m) => `<article class="guide"><div class="top"><h3>${esc(m.title)}</h3>${canTeach() ? `<button class="link small" data-delm="${m.id}" data-room="${r.id}">Remove</button>` : ''}</div>
  ${m.video ? `<iframe class="vid" src="https://www.youtube-nocookie.com/embed/${esc(m.video)}" title="${esc(m.title)}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>` : ''}
  ${m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener">Open document</a>` : ''}${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}</article>`).join('') || '<p class="muted">No material for this room yet.</p>'}</section>`).join('')}`;
}
function attendanceTab() {
  const { attendance, families } = K.data;
  const kids = families.flatMap((f) => f.kids.map((k) => ({ ...k, parent: f.parent, ...(attendance.perKid[k.id] || { n: 0, last: '' }) }))).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const short = (d) => d ? dt(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  return `<section class="panel"><h2>By service</h2>${attendance.perDate.map((d) => `<div class="row"><span class="grow">${dayName(d.date)}</span><b>${d.count}</b></div>`).join('') || '<p class="muted">No check-ins yet.</p>'}</section>
  <section class="panel"><h2>By child</h2><div class="scroll"><table class="st"><thead><tr><th></th><th>Child</th><th>Visits</th><th>Last here</th><th>Parent</th></tr></thead><tbody>${kids.map((k, i) => `<tr><td class="rank">${i + 1}</td><td>${esc(k.name)}</td><td class="hot vP">${k.n}</td><td>${short(k.last)}</td><td>${esc(k.parent)}</td></tr>`).join('')}</tbody></table></div>${kids.length ? '' : '<p class="muted">No children registered yet.</p>'}</section>`;
}
// The Kids volunteer schedule. Leaders fill it under Admin; everyone on the team reads it under Teachers.
function schedTab(edit) {
  const { schedule, team, busy, date, me } = K.data;
  const up = schedule.filter((x) => x.date >= date);
  const nameOf = (id) => team.find((p) => p.id === id)?.name || 'Former volunteer';
  const short = { lead: 'Lead', teacher: 'Teacher', assistant: 'Assistant', checkin: 'Check-in' };
  const picker = (svc, slot) => {
    const away = busy[svc.date] || {};
    const here = (p) => svc.slots.some((x) => x !== slot && x.personId === p.id);
    const free = team.filter((p) => !away[p.id] || p.id === slot.personId);
    const gone = team.filter((p) => away[p.id] && p.id !== slot.personId);
    return `<select data-svc="${svc.id}" data-slot="${slot.id}" aria-label="${esc(slot.label)} on ${dayName(svc.date)}"><option value="">Open</option>
    <optgroup label="Kids Team">${free.map((p) => `<option value="${p.id}"${p.id === slot.personId ? ' selected' : ''}${here(p) ? ' disabled' : ''}>${esc(p.name)} \u00b7 ${short[p.role]}${here(p) ? ' (already in this service)' : ''}</option>`).join('')}</optgroup>
    ${gone.length ? `<optgroup label="Serving in another ministry that day">${gone.map((p) => `<option disabled>${esc(p.name)} (${esc(away[p.id])})</option>`).join('')}</optgroup>` : ''}</select>`;
  };
  const card = (svc) => {
    const open = svc.slots.filter((x) => !x.personId).length;
    return `<section class="panel"><div class="top"><div><h2>${dayName(svc.date)}</h2>${svc.title ? `<div class="muted">${esc(svc.title)}</div>` : ''}</div><span class="pill ${open ? 'wait' : 'yes'}">${open ? open + ' open' : CHK + 'Full'}</span></div>
    ${svc.slots.map((slot) => `<div class="slot" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)"><span>${esc(slot.label)}</span>${edit ? picker(svc, slot) : `<span class="${slot.personId === me.id ? 'me' : ''}">${slot.personId ? esc(nameOf(slot.personId)) : '<span class="err">Open</span>'}</span>`}</div>`).join('')}
    ${edit ? `<button class="link small" data-delsvc="${svc.id}" style="justify-self:start">Delete this service</button>` : ''}</section>`;
  };
  const mine = up.filter((x) => x.slots.some((y) => y.personId === me.id));
  const head = edit ? `<section class="panel"><h2>Build the Kids schedule</h2><p class="small muted">A month adds every Saturday and Sunday. Each service gets a teacher and an assistant for every room, plus the check-in desk. Anyone already serving in Production or Band that day can\u2019t be picked here, and the other ministries can\u2019t pick someone you schedule.</p>
  <form class="row" id="smonth"><input id="smon" type="month" class="grow" aria-label="Month" required><button class="primary">Add month</button></form>
  <form class="row" id="sspecial"><input id="sdate" type="date" aria-label="Special service date" required><input id="stitle2" class="grow" placeholder="Special service name" maxlength="60" aria-label="Special service name"><button>Add special service</button></form>
  ${up.some((x) => x.slots.some((y) => !y.personId)) ? '<button id="sfill">Fill open spots automatically</button>' : ''}</section>`
    : `<section class="panel"><h2>My Kids dates</h2>${mine.map((x) => `<div class="row"><span class="grow"><b>${dayName(x.date)}</b>${x.title ? ' \u00b7 ' + esc(x.title) : ''}</span><span class="pill yes">${esc(x.slots.find((y) => y.personId === me.id).label)}</span></div>`).join('') || '<p class="muted">You aren\u2019t scheduled on any upcoming Kids services.</p>'}</section>`;
  return `${head}${up.map(card).join('') || '<section class="panel"><p class="muted">No upcoming Kids services on the schedule yet.</p></section>'}`;
}
function familiesTab() {
  const { families, rooms } = K.data;
  const f = families.find((x) => x.id === K.prof);
  if (f && K.kidEdit) return kidForm(K.kidEdit === 'new' ? {} : f.kids.find((k) => k.id === K.kidEdit));
  if (f) return `<section class="panel"><div class="top"><h2>Family profile</h2><button id="fback">All families</button></div>
  ${f.kids.length ? '<button class="primary" id="fcheckin">Check in this family</button>' : ''}
  <form id="fprof" style="display:grid;gap:8px"><label class="lbl" for="fparent">Main parent</label><div class="row"><input id="fparent" class="grow" maxlength="60" value="${esc(f.parent)}" required><button>Save name</button></div></form>
  <div class="row small"><span class="grow muted">Mobile: ${esc(fmtPhone(f.phone))}</span><span class="pill ${f.hasPin ? 'yes' : 'wait'}">${f.hasPin ? 'Parent has signed in' : 'Parent hasn’t set a PIN yet'}</span></div></section>
  <section class="panel"><div class="top"><h2>Children</h2><button class="primary" id="faddkid">Add a child</button></div>
  ${f.kids.map((k) => `<div class="cue"><div class="top"><div><div class="role">${esc(k.name)}</div><div class="small muted">Age ${k.age} · ${esc(roomName(rooms, k.roomId))}</div></div><button data-fkid="${k.id}">Edit</button></div><div class="chips">${kidBadges(k)}</div></div>`).join('') || '<p class="muted">No children yet.</p>'}</section>
  ${adultsPanel(f)}
  ${isLead() ? '<button class="link small" id="fdel" style="justify-self:start">Delete this family</button>' : ''}`;
  const q = K.fq.trim().toLowerCase();
  const list = families.filter((x) => !q || x.parent.toLowerCase().includes(q) || x.phone.includes(q.replace(/\D/g, '') || '\u0000') || x.kids.some((k) => k.name.toLowerCase().includes(q)) || x.adults.some((a) => a.name.toLowerCase().includes(q)));
  return `<form class="panel" id="fnew"><h2>New family</h2><p class="small muted">Start a profile at the desk, then add the children and other adults. The parent can sign in later with this number and choose a PIN.</p>
  <input id="nparent" placeholder="Parent’s name" maxlength="60" aria-label="Parent’s name" required><input id="nphone" type="tel" placeholder="Mobile number" maxlength="20" aria-label="Mobile number" required><button class="primary">Create family</button></form>
  <section class="panel"><div class="top"><h2>Families</h2><span class="muted small">${families.length} on file</span></div><input id="fq" placeholder="Search parent, adult, child or phone" value="${esc(K.fq)}" aria-label="Search families">
  ${list.map((x) => `<button class="day" data-prof="${x.id}"><span>${esc(x.parent)}<br><span class="small muted">${esc(x.kids.map((k) => k.name).join(', ') || 'No children yet')}</span></span><span class="small muted">${x.kids.length} kid${x.kids.length === 1 ? '' : 's'} · ${x.adults.length + 1} adult${x.adults.length ? 's' : ''}</span></button>`).join('') || '<p class="muted">No families found.</p>'}</section>`;
}
function staffTab() {
  const { staff } = K.data;
  const team = staff.filter((p) => p.kids);
  const others = staff.filter((p) => !p.kids);
  const roles = (sel) => ['lead', 'teacher', 'assistant', 'checkin'].map((r) => `<option value="${r}"${sel === r ? ' selected' : ''}>${ROLE_LABEL[r]}</option>`).join('');
  return `<section class="panel"><div class="top"><h2>Kids Team</h2><span class="muted small">${team.length} volunteer${team.length === 1 ? '' : 's'}</span></div>
  ${team.map((p) => `<div class="cue"><div class="top"><div><div class="role">${esc(p.name)}</div>${p.media ? '<div class="small muted">Also serves in Production</div>' : ''}</div><button class="link small" data-unstaff="${p.id}">Remove</button></div><select data-staff="${p.id}" aria-label="Kids role for ${esc(p.name)}">${roles(p.kids.role)}</select></div>`).join('') || '<p class="muted">Nobody is on the Kids Team yet.</p>'}</section>
  <form class="panel" id="sadd"><h2>Add someone already in Church Hub</h2><p class="small muted">They keep their other ministries and see both on their own page.</p>
  <select id="sperson" aria-label="Volunteer">${others.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><select id="srole" aria-label="Role">${roles('teacher')}</select><button class="primary">Add to Kids Team</button></form>
  <form class="panel" id="snew"><h2>Add a new volunteer</h2><p class="small muted">For someone who only serves in Kids Ministry. They get a member number to sign in with, listed under Production › Admin tools › People &amp; numbers.</p>
  <input id="sname" placeholder="Full name" maxlength="60" aria-label="Full name" required><select id="snrole" aria-label="Role">${roles('teacher')}</select><button class="primary">Add volunteer</button></form>`;
}
function roomsTab() {
  const { rooms, label, date } = K.data;
  const link = location.origin + '/#parent';
  const box = (k, text) => `<label class="check"><input type="checkbox" data-lab="${k}"${label[k] ? ' checked' : ''}>${text}</label>`;
  const sample = { name: 'Mateo Rivera', age: 5, room: rooms[0]?.name || 'Room', allergies: 'Peanuts', medical: 'Inhaler', parent: 'Ana Rivera', day: dayName(date), code: '4821', qr: qrSvg(passText(date, '4821'), 4) };
  return `<section class="panel"><h2>Rooms and age groups</h2><p class="small muted">Children are placed in a room by age. Change a name or the ages and save, or delete a room you don’t use.</p>
  ${rooms.map((r) => `<div class="row" data-room-row="${esc(r.id)}"><input class="grow" data-rn value="${esc(r.name)}" maxlength="40" aria-label="Room name"><span class="small muted">Ages</span><input data-rmin type="number" min="0" max="17" value="${r.min}" style="width:64px" aria-label="Youngest age"><span class="small muted">to</span><input data-rmax type="number" min="0" max="17" value="${r.max}" style="width:64px" aria-label="Oldest age"><button class="link small" data-delroom="${esc(r.id)}">Delete</button></div>`).join('')}
  <button class="primary" id="saverooms">Save rooms</button>
  <form class="row" id="addroom"><input id="newroom" class="grow" placeholder="New room name" maxlength="40" aria-label="New room name" required><input id="newmin" type="number" min="0" max="17" placeholder="From" style="width:72px" aria-label="Youngest age" required><input id="newmax" type="number" min="0" max="17" placeholder="To" style="width:72px" aria-label="Oldest age" required><button>Add room</button></form></section>
  <form class="panel" id="labform"><h2>Label design</h2><p class="small muted">Choose what prints on each child’s label. The name, pickup code and QR code always print.</p>
  <label class="lbl" for="labhead">Top line</label><input id="labhead" maxlength="40" value="${esc(label.header)}" placeholder="For example: your church or ministry name">
  <div>${box('age', 'Age')}${box('room', 'Room')}${box('allergy', 'Allergies')}${box('medical', 'Medical needs')}${box('parent', 'Parent’s name')}${box('date', 'Date')}${box('big', 'Larger label and text')}</div>
  <label class="lbl" for="labfoot">Bottom line</label><input id="labfoot" maxlength="60" value="${esc(label.footer)}" placeholder="For example: Return this label at pickup">
  <div class="small muted">Preview</div><div class="lprev">${childLabel(label, sample)}</div>
  <div class="row"><button class="primary">Save label design</button><button type="button" id="labtest">Print a test label</button></div></form>
  <section class="panel"><h2>Door poster</h2><p class="small muted">Print this for the door. Parents scan it with their phone camera to register and check in their kids.</p><div class="qr">${qrSvg(link, 6)}</div><p class="small" style="text-align:center;overflow-wrap:anywhere">${esc(link)}</p><button id="poster">Print poster</button></section>`;
}
function kidsView() {
  const { me, date, chats } = K.data;
  const unread = chats.filter((c) => c.unread).length;
  const groups = [
    ['Teachers', [['today', 'Rooms and pickup'], ['sched', 'Schedule'], ['materials', 'Teaching material']]],
    ['Check-in', [['desk', 'Check-in desk'], ['station', 'Print station'], ['att', 'Attendance']]],
    ['Parents', [['families', 'Families'], ['chat', 'Messages' + (unread ? ` (${unread})` : '')]]],
    ...(isLead() ? [['Admin', [['staff', 'Staff'], ['plan', 'Build schedule'], ['setup', 'Rooms and labels']]]] : []),
  ];
  if (!groups.some((g) => g[1].some((t) => t[0] === K.tab))) K.tab = 'today';
  const group = groups.find((g) => g[1].some((t) => t[0] === K.tab));
  const tabs = group[1];
  const body = K.tab === 'desk' ? deskTab() : K.tab === 'station' ? stationTab() : K.tab === 'chat' ? chatTab() : K.tab === 'materials' ? materialsTab() : K.tab === 'att' ? attendanceTab() : K.tab === 'setup' ? roomsTab() : K.tab === 'families' ? familiesTab() : K.tab === 'staff' ? staffTab() : K.tab === 'sched' ? schedTab(false) : K.tab === 'plan' ? schedTab(true) : todayTab();
  app.innerHTML = `<div class="top"><div><p class="muted">Kids Ministry · ${esc(ROLE_LABEL[me.level] || '')}</p><h1>${dayName(date)}</h1></div><div class="row">${isLead() ? ministryBar('kids') : '<button id="kleave">Back to my schedule</button>'}</div></div>
  <nav class="groups cats" aria-label="Kids Ministry sections">${groups.map(([name, list]) => `<button data-kt="${list[0][0]}" aria-pressed="${name === group[0]}">${name}${name === 'Parents' && unread ? ' \u2022' : ''}</button>`).join('')}</nav>
  <div class="subs">${tabs.map(([t, l]) => `<button data-kt="${t}" aria-pressed="${K.tab === t}">${l}</button>`).join('')}</div>${body}<div id="printarea" aria-hidden="true"></div>${barActions('krefresh')}`;
  app.querySelector('#krefresh').onclick = () => kidsCall({ action: 'sload' }, 'Up to date.');
  app.querySelector('#allout').onclick = signOutAll;
  stationRun();
  const kl = document.getElementById('kleave'); if (kl) kl.onclick = () => { location.hash = ''; };
  bindMinistryBar();
  app.querySelectorAll('[data-kt]').forEach((b) => b.onclick = () => { K.tab = b.dataset.kt; K.kidEdit = null; kidsView(); scrollTo(0, 0); });
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el[el.tagName === 'FORM' ? 'onsubmit' : 'onclick'] = fn; };
  const each = (sel, fn) => app.querySelectorAll(sel).forEach(fn);
  const printHtml = (html, cls) => { const p = document.getElementById('printarea'); p.className = cls; p.innerHTML = html; setTimeout(() => window.print(), 50); };
  // Rooms and pickup
  const pc = document.getElementById('pcode');
  if (pc) pc.oninput = () => { const v = pc.value.replace(/\D/g, '').slice(0, 4); if (v.length === 4 || K.code.length === 4) { K.code = v; kidsView(); const n = document.getElementById('pcode'); n.focus(); n.setSelectionRange(v.length, v.length); } else K.code = v; };
  on('scan', scanPass);
  each('[data-out]', (b) => b.onclick = async () => { const ok = await kidsCall({ action: 'checkout', kidId: b.dataset.out, code: K.code }, 'Released.'); if (ok && !K.data.entries.some((e) => !e.outAt && e.code === K.code)) { K.code = ''; kidsView(); } });
  each('[data-remind]', (b) => b.onclick = () => kidsCall({ action: 'remind', fid: b.dataset.remind }, 'Reminder sent to the parent’s page.'));
  each('[data-remindroom]', (b) => b.onclick = () => kidsCall({ action: 'remind', roomId: b.dataset.remindroom }, 'Reminders sent.'));
  each('[data-msg]', (b) => b.onclick = () => { K.tab = 'chat'; K.thread = b.dataset.msg; kidsView(); scrollChat(); });
  each('[data-move]', (s) => s.onchange = () => kidsCall({ action: 'moveRoom', kidId: s.dataset.move, roomId: s.value }, 'Moved.'));
  // Check-in desk
  const kq = document.getElementById('kq');
  if (kq) kq.oninput = () => { K.q = kq.value; kidsView(); const n = document.getElementById('kq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  each('[data-fam]', (b) => b.onclick = () => { K.fam = b.dataset.fam; kidsView(); });
  on('sdo', async () => { const kidIds = [...app.querySelectorAll('[data-sk]:checked:not(:disabled)')].map((c) => c.dataset.sk); if (!kidIds.length) return toast('Pick at least one child.'); const fid = K.fam; if (await kidsCall({ action: 'scheckin', fid, kidIds }, 'Checked in.')) stationRun(fid); });
  each('[data-print]', (b) => b.onclick = () => printHtml(labelSheet(K.data.families.find((f) => f.id === b.dataset.print)), 'labels'));
  // Messages
  each('[data-thread]', (b) => b.onclick = () => { K.thread = b.dataset.thread; const c = K.data.chats.find((x) => x.fid === K.thread); if (c?.unread) { c.unread = false; api('/api/kids', { action: 'sseen', fid: K.thread }, hdr()).catch(() => {}); } kidsView(); scrollChat(); });
  on('tback', () => { K.thread = null; kidsView(); });
  each('[data-quick]', (b) => b.onclick = () => { const i = document.getElementById('chattext'); i.value = b.dataset.quick; i.focus(); });
  on('ssend', async (e) => { e.preventDefault(); const t = kval('chattext'); if (!t.trim()) return; await kidsCall({ action: 'ssend', fid: K.thread, text: t }); scrollChat(); });
  if (K.tab === 'chat' && K.thread) scrollChat();
  // Teaching material
  on('mform', (e) => { e.preventDefault(); kidsCall({ action: 'addMaterial', roomId: kval('mroom'), title: kval('mtitle'), url: kval('murl'), note: kval('mnote') }, 'Material added.'); });
  each('[data-delm]', (b) => b.onclick = () => { if (b.dataset.sure) return kidsCall({ action: 'removeMaterial', roomId: b.dataset.room, id: b.dataset.delm }, 'Removed.'); b.dataset.sure = '1'; b.textContent = 'Tap again to remove'; });
  // Schedule
  on('smonth', (e) => { e.preventDefault(); kidsCall({ action: 'schedMonth', month: kval('smon') }, 'Month added. Pick people, or fill the open spots.'); });
  on('sspecial', (e) => { e.preventDefault(); kidsCall({ action: 'schedService', date: kval('sdate'), title: kval('stitle2') }, 'Special service added.'); });
  on('sfill', () => kidsCall({ action: 'schedFill' }, 'Filled every spot it could.'));
  each('[data-slot]', (sel) => sel.onchange = () => kidsCall({ action: 'schedSlot', serviceId: sel.dataset.svc, slotId: sel.dataset.slot, personId: sel.value }, 'Saved.'));
  each('[data-delsvc]', (b) => b.onclick = () => { if (b.dataset.sure) return kidsCall({ action: 'schedRemove', id: b.dataset.delsvc }, 'Service deleted.'); b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; });
  // New family from the desk, and the print station
  on('desknew', () => { K.deskNew = true; kidsView(); document.getElementById('dparent').focus(); });
  on('desknewcancel', () => { K.deskNew = false; kidsView(); });
  on('desknewform', async (e) => { e.preventDefault(); if (await kidsCall({ action: 'famCreate', parent: kval('dparent'), phone: kval('dphone') }, 'Profile created. Add the children.')) { K.deskNew = false; K.prof = K.data.newFamily; K.kidEdit = 'new'; K.tab = 'families'; kidsView(); scrollTo(0, 0); } });
  on('fcheckin', () => { const f = K.data.families.find((x) => x.id === K.prof); K.fam = f.id; K.q = f.parent; K.prof = null; K.tab = 'desk'; kidsView(); scrollTo(0, 0); });
  on('stationtoggle', async () => {
    K.station = !K.station;
    if (K.station) { store.set('printStation', '1'); try { K.wake = await navigator.wakeLock?.request('screen'); } catch { /* the screen may sleep; printing still works while it is awake */ } }
    else { store.del('printStation'); K.wake?.release?.(); }
    kidsView();
  });
  each('[data-printnow]', (b) => b.onclick = () => stationRun(b.dataset.printnow));
  // Families
  const fam = (b, msg) => kidsCall({ ...b, fid: K.prof }, msg);
  const fq = document.getElementById('fq');
  if (fq) fq.oninput = () => { K.fq = fq.value; kidsView(); const n = document.getElementById('fq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  each('[data-prof]', (b) => b.onclick = () => { K.prof = b.dataset.prof; kidsView(); scrollTo(0, 0); });
  on('fnew', async (e) => { e.preventDefault(); if (await kidsCall({ action: 'famCreate', parent: kval('nparent'), phone: kval('nphone') }, 'Family created. Add the children next.')) { K.prof = K.data.newFamily; kidsView(); scrollTo(0, 0); } });
  on('fback', () => { K.prof = null; kidsView(); });
  on('fprof', (e) => { e.preventDefault(); fam({ action: 'saveFamily', parent: kval('fparent') }, 'Saved.'); });
  on('faddkid', () => { K.kidEdit = 'new'; kidsView(); scrollTo(0, 0); });
  each('[data-fkid]', (b) => b.onclick = () => { K.kidEdit = b.dataset.fkid; kidsView(); scrollTo(0, 0); });
  if (K.tab === 'families' && K.kidEdit) {
    on('kcancel', () => { K.kidEdit = null; kidsView(); });
    on('kdel', (e) => { const b = e.target; if (b.dataset.sure) { const id = K.kidEdit; K.kidEdit = null; return fam({ action: 'removeKid', kidId: id }, 'Removed.'); } b.dataset.sure = '1'; b.textContent = 'Tap again to remove'; });
    on('kidform', async (e) => {
      e.preventDefault();
      const kid = { id: K.kidEdit === 'new' ? undefined : K.kidEdit, name: kval('kname'), birth: kval('kbirth'), allergies: kval('kallergy'), medical: kval('kmedical'), diapers: kval('kdiaper'), bottle: kval('kbottle'), food: kval('kfood'), notes: kval('knotes') };
      const was = K.kidEdit; K.kidEdit = null;
      if (!(await fam({ action: 'saveKid', kid }, 'Saved.'))) { K.kidEdit = was; kidsView(); }
    });
  }
  if (K.tab === 'families') bindAdults(fam);
  on('fdel', async (e) => { const b = e.target; if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to delete this family and its messages'; return; } const fid = K.prof; K.prof = null; await kidsCall({ action: 'famDelete', fid }, 'Family deleted.'); });
  // Staff
  each('[data-staff]', (s) => s.onchange = () => kidsCall({ action: 'setStaff', personId: s.dataset.staff, role: s.value }, 'Saved.'));
  each('[data-unstaff]', (b) => b.onclick = () => { if (b.dataset.sure) return kidsCall({ action: 'setStaff', personId: b.dataset.unstaff, role: '' }, 'Removed from the Kids Team.'); b.dataset.sure = '1'; b.textContent = 'Tap again to remove'; });
  on('sadd', (e) => { e.preventDefault(); if (!kval('sperson')) return toast('Everyone is already on the Kids Team.'); kidsCall({ action: 'setStaff', personId: kval('sperson'), role: kval('srole') }, 'Added to the Kids Team.'); });
  on('snew', (e) => { e.preventDefault(); kidsCall({ action: 'addStaff', name: kval('sname'), role: kval('snrole') }, 'Volunteer added.'); });
  // Rooms and labels
  const readRooms = () => [...app.querySelectorAll('[data-room-row]')].map((r) => ({ id: r.dataset.roomRow, name: r.querySelector('[data-rn]').value, min: r.querySelector('[data-rmin]').value, max: r.querySelector('[data-rmax]').value }));
  on('saverooms', () => kidsCall({ action: 'setRooms', rooms: readRooms() }, 'Rooms saved.'));
  on('addroom', (e) => { e.preventDefault(); kidsCall({ action: 'setRooms', rooms: [...readRooms(), { id: '', name: kval('newroom'), min: kval('newmin'), max: kval('newmax') }] }, 'Room added.'); });
  each('[data-delroom]', (b) => b.onclick = () => { if (b.dataset.sure) return kidsCall({ action: 'setRooms', rooms: readRooms().filter((r) => r.id !== b.dataset.delroom) }, 'Room deleted.'); b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; });
  const readLabel = () => { const l = { header: kval('labhead'), footer: kval('labfoot') }; app.querySelectorAll('[data-lab]').forEach((c) => { l[c.dataset.lab] = c.checked; }); return l; };
  each('[data-lab]', (c) => c.onchange = () => { K.data.label = { ...K.data.label, ...readLabel() }; kidsView(); });
  on('labform', (e) => { e.preventDefault(); kidsCall({ action: 'setLabel', label: readLabel() }, 'Label design saved.'); });
  on('labtest', () => { const p = app.querySelector('.lprev'); printHtml(p.innerHTML, 'labels'); });
  on('poster', () => printHtml(`<div class="poster"><h1>Kids Ministry check-in</h1><p>Scan with your phone camera to register and check in your kids.</p>${qrSvg(location.origin + '/#parent', 10)}<p>${esc(location.origin)}/#parent</p></div>`, 'posterpage'));
}
// Reads a pickup pass with the camera where the browser supports it. Typing the code always works.
async function scanPass() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.createElement('video');
    video.srcObject = stream; video.playsInline = true; video.className = 'vid';
    document.getElementById('pcode').closest('.panel').append(video);
    await video.play();
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const until = Date.now() + 20000;
    while (Date.now() < until && video.isConnected) {
      const found = await detector.detect(video).catch(() => []);
      const m = found[0]?.rawValue.match(/^CHURCHHUB:(\d{4}-\d\d-\d\d):(\d{4})$/);
      if (m) { if (m[1] !== K.data.date) toast('That pass is from another day.'); else K.code = m[2]; break; }
      await new Promise((r) => setTimeout(r, 250));
    }
  } catch { toast('The camera isn’t available. Type the code instead.'); }
  if (stream) stream.getTracks().forEach((t) => t.stop());
  kidsView();
}

// Keeps Kids Ministry pages fresh while they are open: new check-ins, reminders and messages.
setInterval(() => {
  if (document.hidden) return;
  const a = document.activeElement;
  if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.type !== 'checkbox') return;
  if (location.hash === '#parent' && P.data && P.token && !P.edit) parentCall({ action: 'pload' });
  else if (location.hash === '#kids' && K.data) kidsCall({ action: 'sload' });
}, 12000);
// A running print station checks for new check-ins every few seconds.
setInterval(() => {
  if (!document.hidden && location.hash === '#kids' && K.data && K.station && K.tab === 'station' && !K.printing) kidsCall({ action: 'sload' });
}, 4000);
