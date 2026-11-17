import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { load, read, write, updateJson, readFolder, route, hashPin, weakPin, makeToken, tokenId, tokenValid, pinPath, ytId } from './_lib/store.js';
import { otherBusy } from './_lib/busy.js';

// Kids Ministry: families register and check in their children, staff run the rooms.
// Children's details live only in the site's private storage, never in the code.

const TIME_ZONE = 'America/New_York';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
const famPath = (id) => `kids/families/${id}.json`;
const dayPath = (d) => `kids/checkins/${d}.json`;
const chatPath = (id) => `kids/chat/${id}.json`;
const DEFAULT_ROOMS = [
  { id: 'nursery', name: 'Nursery', min: 0, max: 2 },
  { id: 'preschool', name: 'Preschool', min: 3, max: 5 },
  { id: 'elementary', name: 'Elementary', min: 6, max: 11 },
];
const STAFF_ROLES = ['lead', 'teacher', 'assistant', 'checkin'];
const DIAPERS = ['no', 'diapers', 'pullups', 'training'];
const MAX_KIDS = 8;
const THEMES = ['teal', 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'green'];

const text = (v, max) => String(v ?? '').trim().slice(0, max);
const phoneOf = (v) => { const d = String(v ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return d.length === 10 ? d : ''; };
const newId = () => randomBytes(6).toString('hex');
const sha = (s) => createHash('sha256').update(String(s)).digest();
const bad = (res, status, error) => res.status(status).json({ error });

function ageOn(birth, date) {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
function roomFor(kid, rooms, date) {
  const fixed = rooms.find((r) => r.id === kid.roomId);
  if (fixed) return fixed;
  const age = ageOn(kid.birth, date);
  return rooms.find((r) => age >= r.min && age <= r.max) || rooms[rooms.length - 1];
}
function cleanKid(input, date) {
  const name = text(input?.name, 60);
  const birth = text(input?.birth, 10);
  if (!name) return { error: 'Enter your child’s name.' };
  if (!/^\d{4}-\d\d-\d\d$/.test(birth) || Number.isNaN(Date.parse(birth)) || birth > date || ageOn(birth, date) > 17) return { error: 'Enter a valid birthday.' };
  return {
    kid: {
      name, birth,
      allergies: text(input.allergies, 200),
      medical: text(input.medical, 300),
      diapers: DIAPERS.includes(input.diapers) ? input.diapers : 'no',
      bottle: text(input.bottle, 200),
      food: text(input.food, 200),
      notes: text(input.notes, 300),
    },
  };
}
const publicFamily = ({ salt, hash, fails, lockUntil, ...f }) => ({ adults: [], ...f, hasPin: !!hash });
const DEFAULT_LABEL = { header: '', footer: '', age: true, room: true, allergy: true, medical: false, parent: false, date: true, big: false };
const settings = async () => { const s = (await read('kids/settings.json')) || {}; return { rooms: s.rooms?.length ? s.rooms : DEFAULT_ROOMS, label: { ...DEFAULT_LABEL, ...(s.label || {}) } }; };

// Changes to one family's profile. Parents use these on their own family, and Kids Team staff on any family.
const FAMILY_ACTIONS = ['saveKid', 'removeKid', 'saveFamily', 'addAdult', 'removeAdult'];
function editFamily(action, fam, body, date) {
  fam.adults = fam.adults || [];
  if (action === 'saveKid') {
    const { kid, error } = cleanKid(body.kid, date);
    if (error) return error;
    const old = fam.kids.find((k) => k.id === body.kid.id);
    if (old) Object.assign(old, kid);
    else if (fam.kids.length >= MAX_KIDS) return `A family can have up to ${MAX_KIDS} children.`;
    else fam.kids.push({ id: newId(), ...kid });
  } else if (action === 'removeKid') {
    fam.kids = fam.kids.filter((k) => k.id !== body.kidId);
  } else if (action === 'saveFamily') {
    const parent = text(body.parent, 60);
    if (!parent) return 'Enter the parent\u2019s name.';
    fam.parent = parent;
  } else if (action === 'addAdult') {
    const name = text(body.name, 60);
    if (!name) return 'Enter the adult\u2019s name.';
    if (fam.adults.length >= 6) return 'A family can have up to 6 other adults.';
    fam.adults.push({ id: newId(), name, relation: text(body.relation, 40), phone: phoneOf(body.phone) });
  } else if (action === 'removeAdult') {
    fam.adults = fam.adults.filter((a) => a.id !== body.adultId);
  }
  return '';
}

// Checks kids in for a date. Everyone in one family shares one pickup code for the day.
async function checkIn(date, fam, kidIds, rooms, by) {
  let code = '';
  await updateJson(dayPath(date), (day) => {
    day.codes = day.codes || {};
    day.entries = day.entries || {};
    if (!day.codes[fam.id]) {
      const used = new Set(Object.values(day.codes));
      do code = String(randomInt(1000, 10000)); while (used.has(code));
      day.codes[fam.id] = code;
    }
    code = day.codes[fam.id];
    for (const kid of fam.kids) {
      if (!kidIds.includes(kid.id)) continue;
      const was = day.entries[kid.id];
      if (was && !was.outAt) continue;
      day.entries[kid.id] = { fid: fam.id, kidId: kid.id, name: kid.name, roomId: roomFor(kid, rooms, date).id, code, inAt: new Date().toISOString(), by };
    }
  });
  return code;
}

// The slots one Kids service needs: a teacher and an assistant for each room, plus the check-in desk.
function slotsFor(rooms) {
  const slots = [];
  for (const r of rooms) {
    slots.push({ id: newId(), roomId: r.id, role: 'teacher', label: `${r.name} teacher`, personId: '' });
    slots.push({ id: newId(), roomId: r.id, role: 'assistant', label: `${r.name} assistant`, personId: '' });
  }
  slots.push({ id: newId(), roomId: '', role: 'checkin', label: 'Check-in desk', personId: '' });
  return slots;
}
// Which Kids roles can fill which slot, best match first.
const FITS = { teacher: ['teacher', 'lead'], assistant: ['assistant', 'teacher', 'lead'], checkin: ['checkin', 'assistant', 'lead'] };

async function chatOf(fid) { return (await read(chatPath(fid))) || { messages: [], staffSeen: '', parentSeen: '' }; }
async function addMessage(fid, from, name, body) {
  const msg = text(body, 500);
  if (!msg) return false;
  await updateJson(chatPath(fid), (c) => {
    c.messages = [...(c.messages || []), { from, name, text: msg, at: new Date().toISOString() }].slice(-200);
    c[from === 'parent' ? 'parentSeen' : 'staffSeen'] = new Date().toISOString();
  });
  return true;
}

async function parentView(fam) {
  const date = today();
  const [{ rooms }, day, chat] = await Promise.all([settings(), read(dayPath(date)), chatOf(fam.id)]);
  const entries = Object.values(day?.entries || {}).filter((e) => e.fid === fam.id);
  const history = {};
  const all = await readFolder('kids/checkins/');
  for (const d of Object.values(all)) for (const e of Object.values(d.entries || {})) if (e.fid === fam.id) history[e.kidId] = (history[e.kidId] || 0) + 1;
  return {
    family: publicFamily(fam), date, rooms, entries,
    code: day?.codes?.[fam.id] || '',
    reminder: day?.reminders?.[fam.id] || null,
    chat: chat.messages,
    unread: chat.messages.some((m) => m.from === 'staff' && m.at > (chat.parentSeen || '')),
    history,
    kidRooms: Object.fromEntries(fam.kids.map((k) => [k.id, roomFor(k, rooms, date).id])),
  };
}

async function staffView(staff, people) {
  const date = today();
  const [{ rooms, label }, families, days, chats, materials, sched, busy] = await Promise.all([settings(), readFolder('kids/families/'), readFolder('kids/checkins/'), readFolder('kids/chat/'), read('kids/materials.json'), read('kids/schedule.json'), otherBusy('kids')]);
  const fams = Object.values(families).filter((f) => f.id);
  const day = days[date] || {};
  const kidInfo = {};
  for (const f of fams) for (const k of f.kids) kidInfo[k.id] = { ...k, age: ageOn(k.birth, date), parent: f.parent, phone: f.phone, pickup: (f.adults || []).map((a) => a.name).join(', ') };
  const perKid = {};
  const perDate = [];
  for (const [d, file] of Object.entries(days)) {
    const list = Object.values(file.entries || {});
    if (list.length) perDate.push({ date: d, count: list.length });
    for (const e of list) { const r = perKid[e.kidId] = perKid[e.kidId] || { n: 0, last: '', name: e.name }; r.n++; if (d > r.last) r.last = d; }
  }
  const manager = staff.level === 'admin' || staff.level === 'lead';
  return {
    me: staff, date, rooms, label,
    entries: Object.values(day.entries || {}).map((e) => ({ ...e, info: kidInfo[e.kidId] || null })),
    reminders: day.reminders || {},
    families: fams.map((f) => ({ id: f.id, parent: f.parent, phone: f.phone, hasPin: !!f.hash, adults: f.adults || [], code: day.codes?.[f.id] || '', kids: f.kids.map((k) => ({ ...k, age: ageOn(k.birth, date), roomId: roomFor(k, rooms, date).id })) })).sort((a, b) => a.parent.localeCompare(b.parent)),
    chats: fams.map((f) => { const c = chats[f.id] || {}; const m = c.messages || []; return { fid: f.id, parent: f.parent, kids: f.kids.map((k) => k.name).join(', '), messages: m, unread: m.some((x) => x.from === 'parent' && x.at > (c.staffSeen || '')), last: m[m.length - 1]?.at || '' }; }).filter((c) => c.messages.length || day.codes?.[c.fid]),
    materials: materials || {},
    schedule: (sched?.services || []).sort((a, b) => a.date.localeCompare(b.date)),
    busy,
    team: people.filter((p) => p.kids).map((p) => ({ id: p.id, name: p.name, role: p.kids.role })),
    attendance: { perDate: perDate.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60), perKid },
    staff: manager ? people.map((p) => ({ id: p.id, name: p.name, kids: p.kids || null, media: Object.keys(p.roles || {}).length > 0 })) : [],
  };
}

export default route(async (req, res, body) => {
  const { action } = body;
  const date = today();

  // ----- Parents -----
  if (action === 'register') {
    const parent = text(body.parent, 60);
    const phone = phoneOf(body.phone);
    const pin = String(body.pin || '');
    if (!parent) return bad(res, 400, 'Enter your name.');
    if (!phone) return bad(res, 400, 'Enter a 10-digit mobile number.');
    if (weakPin(pin)) return bad(res, 400, 'Use 4 to 6 digits, and avoid easy ones like 1111 or 1234.');
    const id = newId();
    let taken = false;
    await updateJson('kids/index.json', (ix) => { if (ix[phone]) taken = true; else ix[phone] = id; });
    if (taken) return bad(res, 409, 'That number is already registered. Sign in instead.');
    const salt = randomBytes(16).toString('hex');
    const fam = { id, parent, phone, adults: [], kids: [], createdAt: new Date().toISOString(), salt, hash: hashPin(pin, salt) };
    await write(famPath(id), fam);
    return res.json({ token: makeToken('fam-' + id, salt), ...(await parentView(fam)) });
  }
  if (action === 'plogin') {
    const phone = phoneOf(body.phone);
    const id = phone && (await read('kids/index.json'))?.[phone];
    const fam = id ? await read(famPath(id)) : null;
    const now = Date.now();
    if (fam?.id && !fam.hash) {
      // The Kids Team made this profile at the desk. The parent finishes it by choosing a PIN.
      const pin = String(body.pin || '');
      if (!body.claim) return bad(res, 409, 'Your family is already on file. Choose a PIN to finish setting up.');
      if (weakPin(pin)) return bad(res, 400, 'Use 4 to 6 digits, and avoid easy ones like 1111 or 1234.');
      fam.salt = randomBytes(16).toString('hex');
      fam.hash = hashPin(pin, fam.salt);
      await write(famPath(id), fam);
      return res.json({ token: makeToken('fam-' + id, fam.salt), ...(await parentView(fam)) });
    }
    if (!fam?.hash) { await new Promise((r) => setTimeout(r, 400)); return bad(res, 401, 'We couldn\u2019t find that number. Check it, or register your family.'); }
    if (fam.lockUntil > now) return bad(res, 429, 'Too many wrong PINs. Wait 15 minutes and try again.');
    if (hashPin(String(body.pin || ''), fam.salt) !== fam.hash) {
      const fails = (fam.fails || 0) + 1;
      await write(famPath(id), { ...fam, fails: fails >= 5 ? 0 : fails, lockUntil: fails >= 5 ? now + 15 * 60 * 1000 : 0 });
      await new Promise((r) => setTimeout(r, 400));
      return bad(res, 401, 'That PIN is not right. Try again.');
    }
    if (fam.fails) await write(famPath(id), { ...fam, fails: 0, lockUntil: 0 });
    return res.json({ token: makeToken('fam-' + id, fam.salt), ...(await parentView(fam)) });
  }

  const parentToken = req.headers['x-parent-token'];
  if (parentToken) {
    const id = tokenId(parentToken).replace(/^fam-/, '');
    const fam = /^[0-9a-f]{12}$/.test(id) ? await read(famPath(id)) : null;
    if (!fam || !tokenValid(parentToken, fam.salt)) return bad(res, 401, 'Please sign in again.');
    const save = () => write(famPath(fam.id), fam);

    if (FAMILY_ACTIONS.includes(action)) {
      const error = editFamily(action, fam, body, date);
      if (error) return bad(res, 400, error);
      await save();
    } else if (action === 'checkin') {
      const ids = (Array.isArray(body.kidIds) ? body.kidIds : []).filter((k) => fam.kids.some((x) => x.id === k));
      if (!ids.length) return bad(res, 400, 'Pick at least one child.');
      await checkIn(date, fam, ids, (await settings()).rooms, 'parent');
    } else if (action === 'setTheme') {
      if (!THEMES.includes(body.theme)) return bad(res, 400, 'Pick one of the colours.');
      fam.theme = body.theme;
      await save();
    } else if (action === 'psend') {
      if (!(await addMessage(fam.id, 'parent', fam.parent, body.text))) return bad(res, 400, 'Write a message first.');
    } else if (action === 'pseen') {
      await updateJson(chatPath(fam.id), (c) => { c.messages = c.messages || []; c.parentSeen = new Date().toISOString(); });
    } else if (action !== 'pload') {
      return bad(res, 400, 'Unknown action.');
    }
    return res.json(await parentView(fam));
  }

  // ----- Staff -----
  const { people } = await load();
  let staff = null;
  const code = req.headers['x-leader-code'];
  if (code && process.env.LEADER_CODE && timingSafeEqual(sha(code), sha(process.env.LEADER_CODE))) staff = { level: 'admin', name: 'Leader' };
  if (!staff) {
    const token = req.headers['x-member-token'];
    const member = people.find((p) => p.id === tokenId(token));
    if (member && (member.access === 'admin' || member.kids) && tokenValid(token, (await read(pinPath(member.id)))?.salt)) {
      staff = { level: member.access === 'admin' ? 'admin' : member.kids.role, name: member.name, id: member.id };
    }
  }
  if (!staff) { await new Promise((r) => setTimeout(r, 400)); return bad(res, 401, 'Kids Ministry is for Kids Team volunteers. Ask your leader for access.'); }
  const manager = staff.level === 'admin' || staff.level === 'lead';
  const managerOnly = ['setRooms', 'setStaff', 'addStaff', 'setLabel', 'famDelete', 'schedMonth', 'schedService', 'schedRemove', 'schedSlot', 'schedFill'];
  if (managerOnly.includes(action) && !manager) return bad(res, 403, 'Only a Kids Ministry leader can change this.');

  if (FAMILY_ACTIONS.includes(action)) {
    const fam = /^[0-9a-f]{12}$/.test(body.fid || '') ? await read(famPath(body.fid)) : null;
    if (!fam?.id) return bad(res, 404, 'Family not found.');
    const error = editFamily(action, fam, body, date);
    if (error) return bad(res, 400, error);
    await write(famPath(fam.id), fam);
  } else if (action === 'famCreate') {
    const parent = text(body.parent, 60);
    const phone = phoneOf(body.phone);
    if (!parent) return bad(res, 400, 'Enter the parent\u2019s name.');
    if (!phone) return bad(res, 400, 'Enter a 10-digit mobile number.');
    const id = newId();
    let taken = false;
    await updateJson('kids/index.json', (ix) => { if (ix[phone]) taken = true; else ix[phone] = id; });
    if (taken) return bad(res, 409, 'A family with that number is already on file.');
    await write(famPath(id), { id, parent, phone, adults: [], kids: [], createdAt: new Date().toISOString(), madeBy: staff.name });
    return res.json({ ...(await staffView(staff, people)), newFamily: id });
  } else if (action === 'famDelete') {
    const fam = /^[0-9a-f]{12}$/.test(body.fid || '') ? await read(famPath(body.fid)) : null;
    if (!fam?.id) return bad(res, 404, 'Family not found.');
    await updateJson('kids/index.json', (ix) => { delete ix[fam.phone]; });
    // Emptied, not removed: an empty file is skipped everywhere, and past attendance keeps the child's name.
    await Promise.all([write(famPath(fam.id), {}), write(chatPath(fam.id), {})]);
  } else if (action === 'scheckin') {
    const fam = /^[0-9a-f]{12}$/.test(body.fid || '') ? await read(famPath(body.fid)) : null;
    const ids = (Array.isArray(body.kidIds) ? body.kidIds : []).filter((k) => fam?.kids.some((x) => x.id === k));
    if (!fam || !ids.length) return bad(res, 400, 'Pick a family and at least one child.');
    await checkIn(date, fam, ids, (await settings()).rooms, staff.name);
  } else if (action === 'markPrinted') {
    // The print station, or the desk, records what it printed so nothing prints twice.
    const ids = (Array.isArray(body.kidIds) ? body.kidIds : []).map(String);
    await updateJson(dayPath(date), (day) => {
      for (const id of ids) { const e = day.entries?.[id]; if (e && !e.printedAt) e.printedAt = new Date().toISOString(); }
    });
  } else if (action === 'checkout') {
    let result = 'missing';
    await updateJson(dayPath(date), (day) => {
      const e = day.entries?.[body.kidId];
      if (!e || e.outAt) return;
      if (e.code !== String(body.code || '').trim()) { result = 'mismatch'; return; }
      e.outAt = new Date().toISOString();
      e.outBy = staff.name;
      result = 'ok';
      const left = Object.values(day.entries).some((x) => x.fid === e.fid && !x.outAt);
      if (!left && day.reminders) delete day.reminders[e.fid];
    });
    if (result === 'mismatch') return bad(res, 409, 'That code doesn’t match this child. Do not release. Get a Kids Ministry leader.');
    if (result === 'missing') return bad(res, 404, 'That child isn’t checked in.');
  } else if (action === 'moveRoom') {
    const { rooms } = await settings();
    if (!rooms.some((r) => r.id === body.roomId)) return bad(res, 400, 'Pick a room.');
    await updateJson(dayPath(date), (day) => { const e = day.entries?.[body.kidId]; if (e) e.roomId = body.roomId; });
  } else if (action === 'remind') {
    await updateJson(dayPath(date), (day) => {
      const fids = new Set(Object.values(day.entries || {}).filter((e) => !e.outAt && (body.fid ? e.fid === body.fid : !body.roomId || e.roomId === body.roomId)).map((e) => e.fid));
      day.reminders = day.reminders || {};
      for (const fid of fids) day.reminders[fid] = { at: new Date().toISOString(), by: staff.name };
    });
  } else if (action === 'ssend') {
    if (!/^[0-9a-f]{12}$/.test(body.fid || '') || !(await read(famPath(body.fid)))) return bad(res, 404, 'Family not found.');
    if (!(await addMessage(body.fid, 'staff', staff.name, body.text))) return bad(res, 400, 'Write a message first.');
  } else if (action === 'sseen') {
    if (/^[0-9a-f]{12}$/.test(body.fid || '')) await updateJson(chatPath(body.fid), (c) => { c.messages = c.messages || []; c.staffSeen = new Date().toISOString(); });
  } else if (action === 'addMaterial') {
    if (!manager && staff.level !== 'teacher') return bad(res, 403, 'Only teachers and leaders can add material.');
    const { rooms } = await settings();
    const title = text(body.title, 100);
    const note = text(body.note, 2000);
    const url = text(body.url, 300);
    const video = ytId(url);
    const link = !video && /^https:\/\/\S+$/.test(url) ? url : '';
    if (!rooms.some((r) => r.id === body.roomId)) return bad(res, 400, 'Pick a room first.');
    if (url && !video && !link) return bad(res, 400, 'Links need to start with https://');
    if (!title || (!video && !link && !note)) return bad(res, 400, 'Add a title, plus a link or written notes.');
    await updateJson('kids/materials.json', (m) => { (m[body.roomId] = m[body.roomId] || []).push({ id: newId(), title, video, link, note, by: staff.name, at: date }); });
  } else if (action === 'removeMaterial') {
    if (!manager && staff.level !== 'teacher') return bad(res, 403, 'Only teachers and leaders can remove material.');
    await updateJson('kids/materials.json', (m) => { if (m[body.roomId]) m[body.roomId] = m[body.roomId].filter((x) => x.id !== body.id); });
  } else if (action === 'setRooms') {
    const rooms = (Array.isArray(body.rooms) ? body.rooms : []).slice(0, 12).map((r) => ({
      id: /^[a-z0-9]{1,20}$/.test(r.id || '') ? r.id : newId(), name: text(r.name, 40), min: Math.max(0, Math.min(17, Number(r.min) || 0)), max: Math.max(0, Math.min(17, Number(r.max) || 0)),
    })).filter((r) => r.name && r.max >= r.min);
    if (!rooms.length) return bad(res, 400, 'Keep at least one room.');
    await updateJson('kids/settings.json', (s) => { s.rooms = rooms; });
  } else if (action === 'schedMonth' || action === 'schedService') {
    const { rooms } = await settings();
    const dates = [];
    if (action === 'schedService') {
      if (!/^\d{4}-\d\d-\d\d$/.test(body.date || '') || Number.isNaN(Date.parse(body.date))) return bad(res, 400, 'Pick the service date.');
      dates.push(body.date);
    } else {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month || '')) return bad(res, 400, 'Pick a month first.');
      const [y, m] = body.month.split('-').map(Number);
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      // Kids Ministry meets on Saturdays and Sundays. Other dates are added as special services.
      for (let d = 1; d <= last; d++) {
        const day = `${body.month}-${String(d).padStart(2, '0')}`;
        if (day >= date && [6, 0].includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) dates.push(day);
      }
      if (!dates.length) return bad(res, 400, 'That month has no Saturdays or Sundays left.');
    }
    await updateJson('kids/schedule.json', (sc) => {
      sc.services = sc.services || [];
      for (const d of dates) {
        if (action === 'schedMonth' && sc.services.some((x) => x.date === d)) continue;
        sc.services.push({ id: newId(), date: d, title: action === 'schedService' ? text(body.title, 60) || 'Special service' : '', slots: slotsFor(rooms) });
      }
    });
  } else if (action === 'schedRemove') {
    await updateJson('kids/schedule.json', (sc) => { sc.services = (sc.services || []).filter((x) => x.id !== body.id); });
  } else if (action === 'schedSlot') {
    const person = body.personId ? people.find((p) => p.id === body.personId && p.kids) : null;
    if (body.personId && !person) return bad(res, 400, 'Pick someone on the Kids Team.');
    const busy = await otherBusy('kids');
    let result = 'missing';
    await updateJson('kids/schedule.json', (sc) => {
      const svc = (sc.services || []).find((x) => x.id === body.serviceId);
      const slot = svc?.slots.find((x) => x.id === body.slotId);
      if (!slot) return;
      if (person && busy[svc.date]?.[person.id]) { result = busy[svc.date][person.id]; return; }
      if (person && svc.slots.some((x) => x !== slot && x.personId === person.id)) { result = 'twice'; return; }
      slot.personId = person ? person.id : '';
      result = 'ok';
    });
    if (result === 'missing') return bad(res, 404, 'That slot is no longer here.');
    if (result === 'twice') return bad(res, 409, `${person.name} already has a spot in this service.`);
    if (result !== 'ok') return bad(res, 409, `${person.name} is already serving that day (${result}). Pick someone else, or free them up there first.`);
  } else if (action === 'schedFill') {
    const [busy, off] = await Promise.all([otherBusy('kids'), readFolder('off/')]);
    const today10 = new Date().toISOString().slice(0, 10);
    const team = people.filter((p) => p.kids);
    await updateJson('kids/schedule.json', (sc) => {
      const counts = {};
      for (const svc of sc.services || []) for (const sl of svc.slots) if (sl.personId) counts[sl.personId] = (counts[sl.personId] || 0) + 1;
      for (const svc of (sc.services || []).filter((x) => x.date >= today10).sort((a, b) => a.date.localeCompare(b.date))) {
        for (const slot of svc.slots) {
          if (slot.personId) continue;
          const free = team.filter((p) => !busy[svc.date]?.[p.id] && !off[p.id]?.[svc.date] && !svc.slots.some((x) => x.personId === p.id));
          const pick = free.filter((p) => FITS[slot.role].includes(p.kids.role))
            .sort((a, b) => FITS[slot.role].indexOf(a.kids.role) - FITS[slot.role].indexOf(b.kids.role) || (counts[a.id] || 0) - (counts[b.id] || 0))[0];
          if (pick) { slot.personId = pick.id; counts[pick.id] = (counts[pick.id] || 0) + 1; }
        }
      }
    });
  } else if (action === 'setLabel') {
    const l = body.label || {};
    const label = { header: text(l.header, 40), footer: text(l.footer, 60) };
    for (const k of ['age', 'room', 'allergy', 'medical', 'parent', 'date', 'big']) label[k] = !!l[k];
    await updateJson('kids/settings.json', (st) => { st.label = label; });
  } else if (action === 'addStaff') {
    // A brand-new volunteer who only serves in Kids Ministry.
    const name = text(body.name, 60);
    if (!name) return bad(res, 400, 'Enter a name.');
    if (!STAFF_ROLES.includes(body.role)) return bad(res, 400, 'Pick a role.');
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return bad(res, 409, 'That name is already on the volunteer list. Pick them from the list instead.');
    let number;
    do number = String(randomInt(100000, 1000000)); while (people.some((p) => p.number === number));
    const person = { id: 'p' + (Math.max(...people.map((p) => Number(p.id.slice(1)))) + 1), name, number, roles: {}, kids: { role: body.role } };
    people.push(person);
    await updateJson('people.json', (list) => { if (!list.some((p) => p.id === person.id)) list.push(person); });
  } else if (action === 'setStaff') {
    const person = people.find((p) => p.id === body.personId);
    if (!person) return bad(res, 404, 'Volunteer not found.');
    if (body.role && !STAFF_ROLES.includes(body.role)) return bad(res, 400, 'That role isn’t available.');
    await updateJson('people.json', (list) => { const p = list.find((x) => x.id === person.id); if (p) { if (body.role) p.kids = { role: body.role }; else delete p.kids; } });
    if (body.role) person.kids = { role: body.role }; else delete person.kids;
  } else if (action !== 'sload') {
    return bad(res, 400, 'Unknown action.');
  }
  res.json(await staffView(staff, people));
});
