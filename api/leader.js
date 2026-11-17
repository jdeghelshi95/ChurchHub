import { createHash, timingSafeEqual, randomInt } from 'node:crypto';
import { autoSwap } from './_lib/swap.js';
import { otherBusy, asOff } from './_lib/busy.js';
import { load, read, write, readFolder, updateJson, route, answersPath, pinPath, offPath, onPath, isServiceDate, buildMonth, GROUP, tokenId, tokenValid, ytId, SHIRT_SIZES } from './_lib/store.js';

const sha = (s) => createHash('sha256').update(String(s)).digest();
const allowed = (code) => !!process.env.LEADER_CODE && timingSafeEqual(sha(code), sha(process.env.LEADER_CODE));

export default route(async (req, res, body) => {
  const { people, months } = await load();
  let level = allowed(req.headers['x-leader-code']) ? 'admin' : null;
  if (!level) {
    const token = req.headers['x-member-token'];
    const member = people.find((p) => p.id === tokenId(token));
    if (member?.access) {
      const rec = await read(pinPath(member.id));
      if (tokenValid(token, rec?.salt)) level = member.access;
    }
  }
  if (!level) {
    await new Promise((r) => setTimeout(r, 500));
    return res.status(401).json({ error: 'That leader code is not right.' });
  }
  if (level !== 'admin' && !['load', 'setAttendance'].includes(body.action)) {
    return res.status(403).json({ error: 'Only an admin can make changes.' });
  }
  const { action, month, date, role, personId, live } = body;
  const mo = months[month];

  if (action === 'setSlot') {
    const service = mo?.services.find((s) => s.date === date);
    if (!service || !(role in service.slots)) return res.status(404).json({ error: 'That slot no longer exists.' });
    const person = personId ? people.find((p) => p.id === personId) : null;
    if (personId && !person?.roles[GROUP[role]]) return res.status(400).json({ error: 'That person isn’t qualified for this role.' });
    const elsewhere = personId && (await otherBusy('production'))[date]?.[personId];
    if (elsewhere) return res.status(409).json({ error: `${person.name} is already serving that day (${elsewhere}). Pick someone else, or free them up there first.` });
    service.slots[role] = personId || '';
    await updateJson('months.json', (all) => {
      const s = all[month]?.services.find((x) => x.date === date);
      if (s) s.slots[role] = personId || '';
    });
  } else if (action === 'setLive') {
    if (!mo) return res.status(404).json({ error: 'Month not found.' });
    mo.live = !!live;
    mo.postedAt = live ? new Date().toISOString() : null;
    await updateJson('months.json', (all) => { if (all[month]) { all[month].live = mo.live; all[month].postedAt = mo.postedAt; } });
  } else if (action === 'createMonth') {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return res.status(400).json({ error: 'Pick a month first.' });
    if (mo) return res.status(409).json({ error: 'That month already exists.' });
    months[month] = buildMonth(month, people, months, asOff(await otherBusy('production'), await readFolder('off/')), await readFolder('on/'));
    await write('months.json', months);
  } else if (action === 'addPerson') {
    const name = String(body.name || '').trim().slice(0, 60);
    const roles = {};
    for (const g of new Set(Object.values(GROUP))) if (/^[01]{4}$/.test(body.roles?.[g] || '')) roles[g] = body.roles[g];
    if (!name) return res.status(400).json({ error: 'Enter a name.' });
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'That name is already on the list.' });
    let number;
    do number = String(randomInt(100000, 1000000)); while (people.some((p) => p.number === number));
    const nextId = 'p' + (Math.max(...people.map((p) => Number(p.id.slice(1)))) + 1);
    people.push({ id: nextId, name, number, roles });
    await write('people.json', people);
  } else if (action === 'setPerson') {
    const person = people.find((p) => p.id === personId);
    if (!person) return res.status(404).json({ error: 'Volunteer not found.' });
    if ('name' in body) {
      const name = String(body.name || '').trim().slice(0, 60);
      if (!name || people.some((p) => p !== person && p.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: 'Use a different name.' });
      person.name = name;
    }
    if ('access' in body) {
      if (!['', 'admin', 'supervisor'].includes(body.access)) return res.status(400).json({ error: 'That access level isn\u2019t available.' });
      if (body.access) person.access = body.access; else delete person.access;
    }
    if (body.clearUsername) delete person.username;
    await write('people.json', people);
  } else if (action === 'setWeekdays') {
    const person = people.find((p) => p.id === personId);
    if (!person || !Object.values(GROUP).includes(body.group) || !/^[01]{4}$/.test(body.bits || '')) return res.status(400).json({ error: 'That availability could not be saved.' });
    person.roles[body.group] = body.bits;
    await write('people.json', people);
  } else if (action === 'setPersonOff') {
    if (!people.some((p) => p.id === personId)) return res.status(404).json({ error: 'Volunteer not found.' });
    const dates = (Array.isArray(body.dates) ? body.dates : [date]).filter(isServiceDate);
    if (!dates.length) return res.status(400).json({ error: 'Pick a Friday, Saturday, Sunday or Monday.' });
    const off = (await read(offPath(personId))) || {};
    for (const d of dates) { if (body.off) off[d] = 1; else delete off[d]; }
    await write(offPath(personId), off);
  } else if (action === 'setAttendance') {
    const service = mo?.services.find((s) => s.date === date);
    if (!service || !service.slots[role]) return res.status(404).json({ error: 'That slot has nobody assigned.' });
    if (!['', 'P', 'T', 'M', 'E'].includes(body.status)) return res.status(400).json({ error: 'That mark isn\u2019t available.' });
    const k = date + '|' + role;
    await updateJson('attendance.json', (attendance) => {
      if (body.status) attendance[k] = { id: service.slots[role], s: body.status }; else delete attendance[k];
    });
  } else if (action === 'autoFill') {
    if (!mo?.live) return res.status(400).json({ error: 'Post this month first.' });
    const [ans, offNow, onNow] = await Promise.all([readFolder('answers/'), readFolder('off/'), readFolder('on/')]);
    const today = new Date().toISOString().slice(0, 10);
    const cant = {};
    const wrongDay = {};
    for (const s of mo.services) {
      if (s.date < today) continue;
      const bit = { 5: 0, 6: 1, 0: 2, 1: 3 }[new Date(s.date + 'T12:00:00Z').getUTCDay()];
      for (const [r, id] of Object.entries(s.slots)) {
        if (!id) continue;
        const a = ans[id]?.[s.date + '|' + r]?.a;
        const person = people.find((p) => p.id === id);
        if (a === 'no' || offNow[id]?.[s.date]) (cant[id] = cant[id] || []).push({ date: s.date, role: r });
        // Someone on a day they didn't pick moves only if they haven't confirmed and a person who picked it is free.
        else if (a !== 'yes' && person && person.roles[GROUP[r]]?.[bit] !== '1' && !onNow[id]?.[s.date]) (wrongDay[id] = wrongDay[id] || []).push({ date: s.date, role: r });
      }
    }
    for (const [id, targets] of Object.entries(cant)) await autoSwap(id, targets, people);
    for (const [id, targets] of Object.entries(wrongDay)) await autoSwap(id, targets, people, false, true);
    Object.assign(months, await read('months.json'));
  } else if (action === 'removeRole') {
    const person = people.find((p) => p.id === personId);
    if (!person?.roles[body.group]) return res.status(404).json({ error: 'That role was not found.' });
    const today = new Date().toISOString().slice(0, 10);
    const left = Object.values(months).flatMap((m) => m.services).filter((s) => s.date >= today)
      .reduce((n, s) => n + Object.entries(s.slots).filter(([r, id]) => id === personId && GROUP[r] === body.group).length, 0);
    if (left) return res.status(409).json({ error: `${person.name} is still on ${left} upcoming date${left === 1 ? '' : 's'} in this role. Move them off first.` });
    delete person.roles[body.group];
    await write('people.json', people);
  } else if (action === 'removePerson') {
    const i = people.findIndex((p) => p.id === personId);
    if (i < 0) return res.status(404).json({ error: 'Volunteer not found.' });
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = Object.values(months).flatMap((m) => m.services).filter((s) => s.date >= today)
      .flatMap((s) => Object.entries(s.slots).filter(([, id]) => id === personId).map(([r]) => ({ date: s.date, role: r })));
    await autoSwap(personId, upcoming, people, true);
    if (upcoming.length) Object.assign(months, await read('months.json'));
    people.splice(i, 1);
    await write('people.json', people);
    await Promise.all([pinPath, answersPath, offPath, onPath].map((pathOf) => write(pathOf(personId), {})));
    await updateJson('shirts.json', (s) => { delete s[personId]; });
  } else if (action === 'addGuide') {
    const title = String(body.title || '').trim().slice(0, 100);
    const note = String(body.note || '').trim().slice(0, 2000);
    const url = String(body.url || '').trim();
    const video = ytId(url);
    if (!Object.values(GROUP).includes(body.group)) return res.status(400).json({ error: 'Pick a role first.' });
    if (url && !video) return res.status(400).json({ error: 'That doesn\u2019t look like a YouTube link.' });
    if (!title || (!video && !note)) return res.status(400).json({ error: 'Add a title, plus a YouTube link or written steps.' });
    const id = randomInt(1e12).toString(36);
    await updateJson('guides.json', (g) => { (g[body.group] = g[body.group] || []).push({ id, title, video, note }); });
  } else if (action === 'removeGuide') {
    await updateJson('guides.json', (g) => { if (g[body.group]) g[body.group] = g[body.group].filter((x) => x.id !== body.id); });
  } else if (action === 'setShirtsOff') {
    await updateJson('settings.json', (s) => { s.shirtsOff = !!body.off; });
  } else if (action === 'setPersonShirt') {
    if (!people.some((p) => p.id === personId)) return res.status(404).json({ error: 'Volunteer not found.' });
    if (body.size && !SHIRT_SIZES.includes(body.size)) return res.status(400).json({ error: 'That size isn\u2019t available.' });
    await updateJson('shirts.json', (s) => { if (body.size) s[personId] = body.size; else delete s[personId]; });
  } else if (action === 'resetPin') {
    if (!people.some((p) => p.id === personId)) return res.status(404).json({ error: 'Volunteer not found.' });
    await write(pinPath(personId), {});
  } else if (action !== 'load') {
    return res.status(400).json({ error: 'Unknown action.' });
  }

  const [answers, off, on, pins, attendance, swaps, guides, settings, shirts] = await Promise.all([readFolder('answers/'), readFolder('off/'), readFolder('on/'), readFolder('pins/'), read('attendance.json'), read('swaps.json'), read('guides.json'), read('settings.json'), read('shirts.json')]);
  const pinSet = Object.fromEntries(people.map((p) => [p.id, !!pins[p.id]?.hash]));
  const shown = level === 'admin' ? people : people.map(({ number, username, ...p }) => p);
  res.json({ level, busy: await otherBusy('production'), kidsRole: people.find((p) => p.id === tokenId(req.headers['x-member-token']))?.kids?.role || null, people: shown, months, answers, off, on, pinSet, attendance: attendance || {}, swaps: swaps?.items || [], guides: guides || {}, shirtsOff: !!settings?.shirtsOff, shirts: level === 'admin' ? shirts || {} : {} });
});
