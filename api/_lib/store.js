import { get, put, list, head } from '@vercel/blob';
import { scryptSync, createHmac, timingSafeEqual } from 'node:crypto';
import { PEOPLE, SCHEDULE } from './seed.js';

export const ROLES = ['FOH', 'Lyrics', 'Livestream', 'Camera 1', 'Camera 2', 'Camera 3', 'Camera 4', 'Camera 5', 'Photos / Editing'];
export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
export const MONDAY_ROLES = ['FOH', 'Lyrics', 'Livestream', 'Camera 1'];
export const GROUP = { FOH: 'FOH', Lyrics: 'Lyrics', Livestream: 'Livestream', 'Camera 1': 'CamSteady', 'Camera 2': 'CamSteady', 'Camera 3': 'CamSteady', 'Camera 4': 'CamWireless', 'Camera 5': 'CamWireless', 'Photos / Editing': 'Photos' };

export async function read(path) {
  try {
    const r = await get(path, { access: 'private', useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch (e) {
    if (e?.name === 'BlobNotFoundError' || /not found/i.test(e?.message || '')) return null;
    throw e;
  }
}

const opts = { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' };

// Open pages watch this one small file, so they refresh only when something changed.
const bump = (path) => (path.startsWith('pins/') ? null : put('version.json', String(Date.now()), opts).catch(() => null));

export async function write(path, data) {
  const r = await put(path, JSON.stringify(data), opts);
  await bump(path);
  return r;
}

// Reads every file in a folder. It skips empty files, and files unchanged since the last read, to keep storage use low.
const folderCache = new Map();
export async function readFolder(prefix) {
  const out = {};
  const todo = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) {
      const id = b.pathname.slice(prefix.length, -'.json'.length);
      if (b.size <= 2) { out[id] = {}; continue; }
      const stamp = String(b.uploadedAt);
      const hit = folderCache.get(b.pathname);
      if (hit?.stamp === stamp) out[id] = hit.data;
      else todo.push({ id, path: b.pathname, stamp });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  await Promise.all(todo.map(async ({ id, path, stamp }) => {
    const data = (await read(path)) || {};
    folderCache.set(path, { stamp, data });
    out[id] = data;
  }));
  return out;
}

// Reads, changes and saves one file. If someone else saved first, it starts over so neither change is lost.
export async function updateJson(path, change) {
  for (let i = 0; ; i++) {
    const missing = (e) => {
      if (e?.name === 'BlobNotFoundError' || e?.constructor?.name === 'BlobNotFoundError' || /not found|does not exist/i.test(e?.message || '')) return null;
      throw e;
    };
    // The check value comes from head(): the one on a downloaded file can differ when it arrives compressed.
    const meta = await head(path).catch(missing);
    const r = await get(path, { access: 'private', useCache: false }).catch(missing);
    const data = r?.stream ? JSON.parse(await new Response(r.stream).text()) : {};
    change(data);
    const etag = meta?.etag;
    try {
      await put(path, JSON.stringify(data), { ...opts, ...(etag ? { ifMatch: etag } : {}) });
      await bump(path);
      return data;
    } catch (e) {
      if (i >= 5 || !/precondition|etag|modified/i.test(`${e?.name} ${e?.message}`)) throw e;
      await new Promise((res) => setTimeout(res, 100 + Math.random() * 300));
    }
  }
}

function seedPeople() {
  return PEOPLE.map(([name, number, roles], i) => ({ id: 'p' + i, name, number, roles }));
}

function seedMonths() {
  const months = {};
  for (const [month, text] of Object.entries(SCHEDULE)) {
    const services = text.split(';').map((row) => {
      const [date, cells] = row.split(':');
      const slots = {};
      cells.split(',').forEach((c, i) => {
        if (c === 'x') return;
        slots[ROLES[i]] = c === 'o' ? '' : 'p' + c;
      });
      return { date, slots };
    });
    months[month] = { month, live: false, postedAt: null, services };
  }
  return months;
}

export async function load() {
  let [people, months] = await Promise.all([read('people.json'), read('months.json')]);
  if (!people) { people = seedPeople(); await write('people.json', people); }
  if (!months) { months = seedMonths(); await write('months.json', months); }
  return { people, months };
}

// Pulls the 11-character video id out of any normal YouTube link.
export const ytId = (url) => String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/)?.[1] || '';

export const keyOf = (date, role) => date + '|' + role;
export const answersPath = (id) => 'answers/' + id + '.json';
export const pinPath = (id) => 'pins/' + id + '.json';
export const offPath = (id) => 'off/' + id + '.json';
export const onPath = (id) => 'on/' + id + '.json';
export const isServiceDate = (d) => /^\d{4}-\d\d-\d\d$/.test(d) && [5, 6, 0, 1].includes(new Date(d + 'T12:00:00Z').getUTCDay());

// Volunteers can't newly say no within 12 hours of setup. Times are local church time, keyed by weekday.
const TIME_ZONE = 'America/New_York';
const SETUP = { 5: '18:30', 6: '18:00', 0: '07:00', 1: '18:00' };
export function cutoffAt(date) {
  const guess = Date.parse(`${date}T${SETUP[new Date(date + 'T12:00:00Z').getUTCDay()]}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(guess);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return guess - (local - guess) - 12 * 36e5;
}
export const pastCutoff = (date) => Date.now() >= cutoffAt(date);

export const hashPin = (pin, salt) => scryptSync(String(pin), salt, 32).toString('hex');
export const weakPin = (pin) => !/^\d{4,6}$/.test(pin) || /^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin);

const TOKEN_DAYS = 60;
const sign = (id, salt, exp) => createHmac('sha256', process.env.SESSION_SECRET).update(`${id}.${salt}.${exp}`).digest('base64url');
export function makeToken(id, salt) {
  const exp = Date.now() + TOKEN_DAYS * 864e5;
  return `${id}.${exp}.${sign(id, salt, exp)}`;
}
export const tokenId = (token) => String(token || '').split('.')[0];
export function tokenValid(token, salt) {
  const [id, exp, mac] = String(token || '').split('.');
  if (!id || !exp || !mac || !salt || Number(exp) < Date.now()) return false;
  const want = Buffer.from(sign(id, salt, exp));
  const got = Buffer.from(mac);
  return want.length === got.length && timingSafeEqual(want, got);
}

// Chooses who takes a slot. First choice: people who picked this weekday or offered this date.
// Last resort, only when nobody in the first group is free: people who serve other days in this role.
// Anyone marked off, or with no days picked for the role, is never chosen.
export function pickFor(people, group, bit, date, { taken, off, on, counts, last, skip }) {
  const order = (a, b) => (counts[a.id] || 0) - (counts[b.id] || 0) || (last[a.id] || '').localeCompare(last[b.id] || '');
  const free = people.filter((p) => p.roles[group] && !taken.has(p.id) && !off[p.id]?.[date] && !(skip && skip(p)));
  const first = free.filter((p) => p.roles[group][bit] === '1' || on[p.id]?.[date]).sort(order)[0];
  if (first) return { pick: first, lastResort: false };
  const backup = free.filter((p) => p.roles[group].includes('1')).sort(order)[0];
  return { pick: backup || null, lastResort: !!backup };
}

// Fills a new month, giving each slot to the available person with the fewest assignments so far.
export function buildMonth(month, people, months, off = {}, on = {}) {
  const [y, m] = month.split('-').map(Number);
  const counts = {};
  const last = {};
  for (const mo of Object.values(months)) for (const s of mo.services) for (const id of Object.values(s.slots)) {
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
    if (!last[id] || last[id] < s.date) last[id] = s.date;
  }
  const services = [];
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const bit = { 5: 0, 6: 1, 0: 2, 1: 3 }[dow];
    if (bit === undefined) continue;
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const slots = {};
    const taken = new Set();
    for (const role of bit === 3 ? MONDAY_ROLES : ROLES) {
      const { pick } = pickFor(people, GROUP[role], bit, date, { taken, off, on, counts, last });
      slots[role] = pick ? pick.id : '';
      if (pick) { taken.add(pick.id); counts[pick.id] = (counts[pick.id] || 0) + 1; last[pick.id] = date; }
    }
    services.push({ date, slots });
  }
  return { month, live: false, postedAt: null, services };
}

export function route(handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    try {
      await handler(req, res, req.body || {});
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'The site had a problem saving or loading. Try again in a minute.' });
    }
  };
}
