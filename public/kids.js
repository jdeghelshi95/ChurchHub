/* Kids Ministry screens. Loaded before app.js, and uses its helpers (app, esc, api, toast, store, dt, dayName, CHK, XIC, LOGO) when called. */
const DIAPER_LABEL = { no: 'No', diapers: 'Diapers', pullups: 'Pull-ups', training: 'Potty training' };
const ROLE_LABEL = { lead: 'Kids Ministry lead', teacher: 'Teacher', assistant: 'Assistant teacher', checkin: 'Check-in desk', admin: 'Admin' };
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const roomName = (rooms, id) => rooms.find((r) => r.id === id)?.name || 'Room';
const kval = (id) => document.getElementById(id)?.value ?? '';

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
  const reg = P.mode === 'register';
  app.innerHTML = `<div class="land">${LOGO}<p class="muted">Kids Ministry check-in for parents.</p></div>
  <form class="panel" id="f"><h2>${reg ? 'Register your family' : 'Parent sign-in'}</h2>
  ${reg ? '<label class="lbl" for="pname">Your name</label><input id="pname" class="field" maxlength="60" autocomplete="name" required>' : ''}
  <label class="lbl" for="pphone">Mobile number</label><input id="pphone" class="field" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" required>
  <label class="lbl" for="ppin">${reg ? 'Choose a PIN (4 to 6 digits)' : 'PIN'}</label><input id="ppin" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="${reg ? 'new-password' : 'current-password'}" required>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ''}<button class="primary">${reg ? 'Register' : 'Sign in'}</button></form>
  <button class="link small" id="swap" style="justify-self:center">${reg ? 'I already registered. Sign in.' : 'New here? Register your family.'}</button>
  <button class="link small" id="home" style="justify-self:center">Volunteer sign-in</button>`;
  document.getElementById('swap').onclick = () => { P.mode = reg ? 'login' : 'register'; parentLogin(); };
  document.getElementById('home').onclick = () => { location.hash = ''; };
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const body = reg ? { action: 'register', parent: kval('pname'), phone: kval('pphone'), pin: kval('ppin') } : { action: 'plogin', phone: kval('pphone'), pin: kval('ppin') };
    try { const r = await api('/api/kids', body); P.token = r.token; store.set('parentToken', r.token); P.data = r; P.tab = r.family.kids.length ? 'checkin' : 'kids'; parentView(); }
    catch (er) { parentLogin(er.message); }
  };
}
async function parentCall(body, done) {
  try { P.data = await api('/api/kids', body, pHdr()); keep(parentView); if (done) toast(done); return true; }
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
    <label class="lbl" for="fpickup">Other adults who may pick up</label><input id="fpickup" class="field" maxlength="200" value="${esc(family.pickup)}" placeholder="Names, separated by commas">
    <button class="primary">Save family details</button></form>`;
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
  <div class="top"><div><p class="muted">Kids Ministry</p><h1>${esc(family.parent)}</h1></div><button class="link" id="pout">Sign out</button></div>
  <div class="tabs">${tabs.map(([t, l]) => `<button data-pt="${t}" aria-pressed="${P.tab === t}">${l}</button>`).join('')}</div>${body}`;
  document.getElementById('pout').onclick = () => { store.del('parentToken'); P.token = null; P.data = null; parentLogin(); };
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
  on('famform', (e) => { e.preventDefault(); parentCall({ action: 'saveFamily', parent: kval('fparent'), pickup: kval('fpickup') }, 'Saved.'); });
  on('docheckin', () => { const kidIds = [...app.querySelectorAll('[data-ck]:checked')].map((c) => c.dataset.ck); if (!kidIds.length) return toast('Pick at least one child.'); parentCall({ action: 'checkin', kidIds }, 'Checked in. Show your pass at the desk.'); });
  on('psend', async (e) => { e.preventDefault(); const t = kval('chattext'); if (!t.trim()) return; await parentCall({ action: 'psend', text: t }); scrollChat(); });
}

/* ---------- Kids Team staff ---------- */
const K = { data: null, tab: 'today', q: '', fam: null, thread: null, code: '', print: null };
const isLead = () => ['admin', 'lead'].includes(K.data.me.level);
const canTeach = () => isLead() || K.data.me.level === 'teacher';

function kidsStart() {
  if (!L.code) L.code = store.get('leaderCode', sessionStorage);
  if (!L.code && !V.token) { location.hash = ''; return; }
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
function labelSheet(f) {
  const { date, rooms, entries } = K.data;
  const mine = entries.filter((e) => e.fid === f.id && !e.outAt);
  const qr = qrSvg(passText(date, f.code), 4);
  const day = dayName(date);
  return `${mine.map((e) => `<div class="label"><div class="ltext"><div class="lname">${esc(e.name.split(' ')[0].toUpperCase())}</div><div>${esc(e.name)}${e.info ? ' · Age ' + e.info.age : ''}</div><div><b>${esc(roomName(rooms, e.roomId))}</b></div>
  ${e.info?.allergies ? `<div class="lwarn">ALLERGY: ${esc(e.info.allergies.toUpperCase())}</div>` : ''}<div class="lsmall">${day}</div></div><div class="lcode">${qr}<b>${esc(f.code)}</b></div></div>`).join('')}
  <div class="label"><div class="ltext"><div class="lname" style="font-size:20px">PICKUP PASS</div><div><b>${esc(f.parent)}</b></div>${mine.map((e) => `<div>${esc(e.name)} · ${esc(roomName(rooms, e.roomId))}</div>`).join('')}<div class="lsmall">${day} · Show this to pick up</div></div><div class="lcode">${qr}<b>${esc(f.code)}</b></div></div>`;
}
function deskTab() {
  const { families, rooms, entries } = K.data;
  const q = K.q.trim().toLowerCase();
  const found = q ? families.filter((f) => f.parent.toLowerCase().includes(q) || f.phone.includes(q.replace(/\D/g, '') || '\u0000') || f.kids.some((k) => k.name.toLowerCase().includes(q))).slice(0, 8) : [];
  const fam = families.find((f) => f.id === K.fam);
  const inIds = new Set(entries.filter((e) => !e.outAt).map((e) => e.kidId));
  const ready = families.filter((f) => f.code && entries.some((e) => e.fid === f.id && !e.outAt));
  return `<section class="panel"><h2>Find a family</h2><input id="kq" placeholder="Parent name, phone or child’s name" value="${esc(K.q)}" aria-label="Search families">
  ${found.map((f) => `<button class="day" data-fam="${f.id}" aria-pressed="${f.id === K.fam}"><span>${esc(f.parent)}<br><span class="small muted">${esc(f.kids.map((k) => k.name).join(', ') || 'No children added')}</span></span><span class="small muted">…${f.phone.slice(-4)}</span></button>`).join('') || (q ? '<p class="muted">No family matches. Parents register on their own phone from the door poster.</p>' : '<p class="small muted">Parents can also check in on their own phone. Their labels appear below, ready to print.</p>')}</section>
  ${fam ? `<section class="panel"><h2>${esc(fam.parent)}</h2>${fam.kids.map((k) => `<label class="check kidpick"><input type="checkbox" data-sk="${k.id}"${inIds.has(k.id) ? ' disabled' : ' checked'}><span class="grow"><b>${esc(k.name)}</b><br><span class="small muted">Age ${k.age} · ${esc(roomName(rooms, k.roomId))}${k.allergies ? ' · Allergy: ' + esc(k.allergies) : ''}${inIds.has(k.id) ? ' · Checked in' : ''}</span></span></label>`).join('') || '<p class="muted">This family hasn’t added any children yet.</p>'}
  ${fam.kids.some((k) => !inIds.has(k.id)) ? '<button class="primary" id="sdo">Check in and print labels</button>' : ''}</section>` : ''}
  <section class="panel"><h2>Labels</h2><p class="small muted">One label per child and one pickup pass per family, all with the same code. Choose the Brother label printer in the print window.</p>
  ${ready.map((f) => `<div class="row"><span class="grow"><b>${esc(f.parent)}</b><br><span class="small muted">Code ${esc(f.code)} · ${entries.filter((e) => e.fid === f.id && !e.outAt).map((e) => esc(e.name)).join(', ')}</span></span><button data-print="${f.id}">Print labels</button></div>`).join('') || '<p class="muted">Nobody is checked in yet.</p>'}</section>`;
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
function setupTab() {
  const { rooms, staff } = K.data;
  const link = location.origin + '/#parent';
  return `<section class="panel"><h2>Kids Team volunteers</h2><p class="small muted">Give someone a Kids Ministry role and they get a Kids Ministry button on their own page. They keep any Media roles they have.</p>
  <div class="scroll"><table><thead><tr><th>Name</th><th>Kids role</th></tr></thead><tbody>${staff.map((p) => `<tr><td>${esc(p.name)}</td><td><select data-staff="${p.id}" aria-label="Kids role for ${esc(p.name)}"><option value="">Not on Kids Team</option>${['lead', 'teacher', 'assistant', 'checkin'].map((r) => `<option value="${r}"${p.kids?.role === r ? ' selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></section>
  <form class="panel" id="rooms"><h2>Rooms and ages</h2><p class="small muted">Children are placed by age. Clear a name to remove that room.</p>
  ${[...rooms, { id: '', name: '', min: '', max: '' }].map((r, i) => `<div class="row" data-room-row="${esc(r.id)}"><input class="grow" data-rn value="${esc(r.name)}" placeholder="${i === rooms.length ? 'Add a room' : 'Room name'}" maxlength="40" aria-label="Room name"><input data-rmin type="number" min="0" max="17" value="${r.min}" style="width:72px" aria-label="Youngest age"><input data-rmax type="number" min="0" max="17" value="${r.max}" style="width:72px" aria-label="Oldest age"></div>`).join('')}
  <button class="primary">Save rooms</button></form>
  <section class="panel"><h2>Door poster</h2><p class="small muted">Print this for the door. Parents scan it with their phone camera to register and check in their kids.</p><div class="qr">${qrSvg(link, 6)}</div><p class="small" style="text-align:center;overflow-wrap:anywhere">${esc(link)}</p><button id="poster">Print poster</button></section>`;
}
function kidsView() {
  const { me, date, chats } = K.data;
  const unread = chats.filter((c) => c.unread).length;
  const tabs = [['today', 'Rooms and pickup'], ['desk', 'Check-in desk'], ['chat', 'Messages' + (unread ? ` (${unread})` : '')], ['materials', 'Teaching material'], ['att', 'Attendance'], ...(isLead() ? [['setup', 'Setup']] : [])];
  if (!tabs.some((t) => t[0] === K.tab)) K.tab = 'today';
  const body = K.tab === 'desk' ? deskTab() : K.tab === 'chat' ? chatTab() : K.tab === 'materials' ? materialsTab() : K.tab === 'att' ? attendanceTab() : K.tab === 'setup' ? setupTab() : todayTab();
  app.innerHTML = `<div class="top"><div><p class="muted">Kids Ministry · ${esc(ROLE_LABEL[me.level] || '')}</p><h1>${dayName(date)}</h1></div><div class="row"><button id="kleave">Back to schedule</button></div></div>
  <div class="subs">${tabs.map(([t, l]) => `<button data-kt="${t}" aria-pressed="${K.tab === t}">${l}</button>`).join('')}</div>${body}<div id="printarea" aria-hidden="true"></div>`;
  document.getElementById('kleave').onclick = () => { location.hash = L.code || V.data?.access ? 'leader' : ''; };
  app.querySelectorAll('[data-kt]').forEach((b) => b.onclick = () => { K.tab = b.dataset.kt; kidsView(); scrollTo(0, 0); });
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
  on('sdo', async () => { const kidIds = [...app.querySelectorAll('[data-sk]:checked:not(:disabled)')].map((c) => c.dataset.sk); if (!kidIds.length) return toast('Pick at least one child.'); const fid = K.fam; if (await kidsCall({ action: 'scheckin', fid, kidIds }, 'Checked in.')) printHtml(labelSheet(K.data.families.find((f) => f.id === fid)), 'labels'); });
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
  // Setup
  each('[data-staff]', (s) => s.onchange = () => kidsCall({ action: 'setStaff', personId: s.dataset.staff, role: s.value }, 'Saved.'));
  on('rooms', (e) => { e.preventDefault(); const rooms = [...app.querySelectorAll('[data-room-row]')].map((r) => ({ id: r.dataset.roomRow, name: r.querySelector('[data-rn]').value, min: r.querySelector('[data-rmin]').value, max: r.querySelector('[data-rmax]').value })); kidsCall({ action: 'setRooms', rooms }, 'Rooms saved.'); });
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
