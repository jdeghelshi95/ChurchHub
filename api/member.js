import { randomBytes } from 'node:crypto';
import { autoSwap, mySlots } from './_lib/swap.js';
import { load, read, write, updateJson, route, keyOf, answersPath, pinPath, offPath, onPath, isServiceDate, hashPin, weakPin, makeToken, tokenId, tokenValid, SHIRT_SIZES, cutoffAt, pastCutoff } from './_lib/store.js';

const misses = new Map();
const LIMIT = 10;
const WINDOW = 10 * 60 * 1000;
const MAX_PIN_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;

const readOff = async (id) => (await read(offPath(id))) || {};
const readOn = async (id) => (await read(onPath(id))) || {};
const shirtInfo = async (me) => {
  const [settings, shirts] = await Promise.all([read('settings.json'), read('shirts.json')]);
  const shirtOpen = !settings?.shirtsOff;
  return { shirtOpen, shirt: shirtOpen ? shirts?.[me.id] || '' : '' };
};
const TOO_LATE = 'It\u2019s less than 12 hours before setup, so this can\u2019t be changed here. Please contact your leader.';
// When each date closes: the volunteer's own dates for the countdown, plus dates near today for the calendar.
const closeAt = (mine = []) => {
  const out = Object.fromEntries(mine.map((d) => [d, cutoffAt(d)]));
  for (let i = -1; i < 3; i++) {
    const d = new Date(Date.now() + i * 864e5).toISOString().slice(0, 10);
    if (isServiceDate(d)) out[d] = cutoffAt(d);
  }
  return out;
};
const servesMonday = (me) => ['FOH', 'Lyrics', 'Livestream', 'CamSteady'].some((g) => me.roles[g]);

function schedule(me, people, months, answers, off, on, guides, shirt) {
  const names = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const live = Object.values(months).filter((x) => x.live).sort((a, b) => a.month.localeCompare(b.month)).map((x) => ({
    month: x.month,
    services: x.services.map((s) => ({
      date: s.date,
      slots: Object.fromEntries(Object.entries(s.slots).map(([r, id]) => [r, { name: id ? names[id] || '' : '', me: id === me.id }])),
    })),
  }));
  const days = [0, 1, 2, 3].map((i) => (Object.values(me.roles).some((r) => r[i] === '1') ? '1' : '0')).join('');
  return { me: { name: me.name }, username: me.username || '', months: live, answers, off, on, days, canMon: servesMonday(me), access: me.access || null, myGroups: Object.keys(me.roles), guides: Object.fromEntries(Object.keys(me.roles).map((g) => [g, guides?.[g] || []])), ...shirt, closeAt: closeAt(mySlots(months, me.id).map((s) => s.date)) };
}

export default route(async (req, res, body) => {
  const { action } = body;
  const { people, months } = await load();

  if (action === 'start' || action === 'setPin' || action === 'login') {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0];
    const now = Date.now();
    const m = misses.get(ip);
    if (m && now - m.at > WINDOW) misses.delete(ip);
    if (misses.get(ip)?.n >= LIMIT) return res.status(429).json({ error: 'Too many tries. Wait 10 minutes and try again.' });

    const login = String(body.number || '').trim();
    const me = people.find((p) => p.number === login || (p.username && p.username === login.toLowerCase()));
    if (!me) {
      misses.set(ip, { n: (misses.get(ip)?.n || 0) + 1, at: now });
      await new Promise((r) => setTimeout(r, 400));
      return res.status(401).json({ error: 'We couldn\u2019t find that member number or username. Check it and try again.' });
    }
    const path = pinPath(me.id);
    const rec = (await read(path)) || {};
    if (action === 'start') return res.json({ hasPin: !!rec.hash });

    const pin = String(body.pin || '');
    if (action === 'setPin') {
      if (rec.hash) return res.status(409).json({ error: 'A PIN is already set. Ask your leader to reset it.' });
      if (weakPin(pin)) return res.status(400).json({ error: 'Use 4 to 6 digits, and avoid easy ones like 1111 or 1234.' });
      const salt = randomBytes(16).toString('hex');
      await write(path, { salt, hash: hashPin(pin, salt), fails: 0, lockUntil: 0 });
      const answers = (await read(answersPath(me.id))) || {};
      return res.json({ token: makeToken(me.id, salt), ...schedule(me, people, months, answers, await readOff(me.id), await readOn(me.id), await read('guides.json'), await shirtInfo(me)) });
    }

    if (!rec.hash) return res.status(409).json({ error: 'Create a PIN first.' });
    if (rec.lockUntil > now) return res.status(429).json({ error: 'Too many wrong PINs. Wait 15 minutes, or ask your leader to reset it.' });
    if (hashPin(pin, rec.salt) !== rec.hash) {
      const fails = (rec.fails || 0) + 1;
      const locked = fails >= MAX_PIN_TRIES;
      await write(path, { ...rec, fails: locked ? 0 : fails, lockUntil: locked ? now + LOCK_MS : 0 });
      await new Promise((r) => setTimeout(r, 400));
      return res.status(locked ? 429 : 401).json({ error: locked ? 'Too many wrong PINs. Wait 15 minutes, or ask your leader to reset it.' : 'That PIN is not right. Try again.' });
    }
    if (rec.fails) await write(path, { ...rec, fails: 0, lockUntil: 0 });
    const answers = (await read(answersPath(me.id))) || {};
    return res.json({ token: makeToken(me.id, rec.salt), ...schedule(me, people, months, answers, await readOff(me.id), await readOn(me.id), await read('guides.json'), await shirtInfo(me)) });
  }

  const id = tokenId(body.token);
  const me = people.find((p) => p.id === id);
  const rec = me ? await read(pinPath(me.id)) : null;
  if (!me || !tokenValid(body.token, rec?.salt)) return res.status(401).json({ error: 'Please sign in again.' });

  const path = answersPath(me.id);
  const answers = (await read(path)) || {};

  if (action === 'setUsername') {
    const username = String(body.username || '').trim().toLowerCase();
    if (!/^(?=.*[a-z])[a-z0-9._-]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Use 3 to 20 letters or numbers, with at least one letter.' });
    }
    let taken = false;
    await updateJson('people.json', (list) => {
      if (list.some((p) => p.id !== me.id && p.username === username)) { taken = true; return; }
      const mine = list.find((p) => p.id === me.id);
      if (mine) mine.username = username;
    });
    if (taken) return res.status(409).json({ error: 'That username is taken. Try another.' });
    return res.json({ username });
  }

  if (action === 'setShirt') {
    if (!SHIRT_SIZES.includes(body.size)) return res.status(400).json({ error: 'Pick one size.' });
    if (!(await shirtInfo(me)).shirtOpen) return res.status(409).json({ error: 'Shirt sizes are closed.' });
    await updateJson('shirts.json', (s) => { s[me.id] = body.size; });
    return res.json({ shirt: body.size });
  }

  if (action === 'setOff') {
    const off = {};
    for (const d of Object.keys(body.off || {}).slice(0, 400)) if (body.off[d] && isServiceDate(d)) off[d] = 1;
    const on = {};
    for (const d of Object.keys(body.on || {}).slice(0, 400)) {
      if (body.on[d] && isServiceDate(d) && (servesMonday(me) || new Date(d + 'T12:00:00Z').getUTCDay() !== 1)) on[d] = 1;
    }
    const before = await readOff(me.id);
    if (Object.keys(off).some((d) => !before[d] && pastCutoff(d))) return res.status(409).json({ error: TOO_LATE });
    await Promise.all([write(offPath(me.id), off), write(onPath(me.id), on)]);
    const swaps = await autoSwap(me.id, mySlots(months, me.id).filter((s) => off[s.date]), people);
    return res.json({ off, on, swapped: swaps.length });
  }

  const off = await readOff(me.id);

  if (action === 'answer') {
    const { date, role, answer } = body;
    const service = Object.values(months).filter((x) => x.live).flatMap((x) => x.services).find((s) => s.date === date);
    if (!service || service.slots[role] !== me.id) return res.status(409).json({ error: 'You are no longer on this slot. Refresh to see your latest dates.' });
    if (answer !== 'yes' && answer !== 'no') return res.status(400).json({ error: 'Choose can serve or can’t serve.' });
    if (answer === 'no' && pastCutoff(date) && answers[keyOf(date, role)]?.a !== 'no' && !off[date]) return res.status(409).json({ error: TOO_LATE });
    answers[keyOf(date, role)] = { a: answer, note: String(body.note || '').trim().slice(0, 200), at: new Date().toISOString() };
    await write(path, answers);
    if (answer === 'yes' && off[date]) { delete off[date]; await write(offPath(me.id), off); }
    const swaps = answer === 'no' ? await autoSwap(me.id, [{ date, role }], people) : [];
    const cover = swaps[0] ? (people.find((p) => p.id === swaps[0].to)?.name || '') : null;
    return res.json({ answers, off, swapped: swaps.length, cover });
  }

  res.json(schedule(me, people, months, answers, off, await readOn(me.id), await read('guides.json'), await shirtInfo(me)));
});
