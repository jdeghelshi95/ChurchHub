import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { load, read, write, updateJson, route, tokenId, tokenValid, pinPath, ytId } from './_lib/store.js';
import { otherBusy } from './_lib/busy.js';

// Band: members, songs with charts and tabs, and a setlist for each service.

const text = (v, max) => String(v ?? '').trim().slice(0, max);
const newId = () => randomBytes(6).toString('hex');
const sha = (s) => createHash('sha256').update(String(s)).digest();
const bad = (res, status, error) => res.status(status).json({ error });
const link = (v) => { const u = text(v, 300); return /^https:\/\/\S+$/.test(u) ? u : ''; };
const filePath = (id) => `band/files/${id}.json`;
const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE = 4_000_000; // characters of base64, about 3 MB

async function view(me, people, editor) {
  const [songs, sets, busy] = await Promise.all([read('band/songs.json'), read('band/sets.json'), otherBusy('band')]);
  return {
    me, editor, busy,
    today: new Date().toISOString().slice(0, 10),
    members: people.filter((p) => p.band).map((p) => ({ id: p.id, name: p.name, role: p.band.role, part: p.band.part || '' })).sort((a, b) => a.name.localeCompare(b.name)),
    others: editor ? people.filter((p) => !p.band).map((p) => ({ id: p.id, name: p.name })) : [],
    songs: (songs?.items || []).sort((a, b) => a.title.localeCompare(b.title)),
    sets: (sets?.items || []).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export default route(async (req, res, body) => {
  const { action } = body;
  const { people } = await load();
  let me = null;
  const code = req.headers['x-leader-code'];
  if (code && process.env.LEADER_CODE && timingSafeEqual(sha(code), sha(process.env.LEADER_CODE))) me = { level: 'admin', name: 'Leader' };
  if (!me) {
    const token = req.headers['x-member-token'];
    const member = people.find((p) => p.id === tokenId(token));
    if (member && (member.access === 'admin' || member.band) && tokenValid(token, (await read(pinPath(member.id)))?.salt)) {
      me = { level: member.access === 'admin' ? 'admin' : member.band.role, name: member.name, id: member.id };
    }
  }
  if (!me) { await new Promise((r) => setTimeout(r, 400)); return bad(res, 401, 'The Band page is for band members. Ask your leader for access.'); }
  const editor = me.level === 'admin' || me.level === 'lead';

  if (action === 'file') {
    const f = /^[0-9a-f]{12}$/.test(body.id || '') ? await read(filePath(body.id)) : null;
    if (!f?.data) return bad(res, 404, 'That file is no longer here.');
    return res.json(f);
  }
  if (action !== 'load' && !editor) return bad(res, 403, 'Only a band leader can change this.');

  const savePerson = (id, change) => updateJson('people.json', (list) => { const p = list.find((x) => x.id === id); if (p) change(p); });

  if (action === 'setMember') {
    const person = people.find((p) => p.id === body.personId);
    if (!person) return bad(res, 404, 'Volunteer not found.');
    if (body.role && !['lead', 'member'].includes(body.role)) return bad(res, 400, 'Pick a role.');
    const band = body.role ? { role: body.role, part: text(body.part ?? person.band?.part, 40) } : null;
    const change = (p) => { if (band) p.band = band; else delete p.band; };
    change(person);
    await savePerson(person.id, change);
  } else if (action === 'addMember') {
    const name = text(body.name, 60);
    if (!name) return bad(res, 400, 'Enter a name.');
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return bad(res, 409, 'That name is already on the volunteer list. Pick them from the list instead.');
    let number;
    do number = String(randomInt(100000, 1000000)); while (people.some((p) => p.number === number));
    const person = { id: 'p' + (Math.max(...people.map((p) => Number(p.id.slice(1)))) + 1), name, number, roles: {}, band: { role: 'member', part: text(body.part, 40) } };
    people.push(person);
    await updateJson('people.json', (list) => { if (!list.some((p) => p.id === person.id)) list.push(person); });
  } else if (action === 'saveSong') {
    const s = body.song || {};
    const title = text(s.title, 100);
    if (!title) return bad(res, 400, 'Enter the song title.');
    for (const k of ['chartLink', 'tabLink']) if (text(s[k], 300) && !link(s[k])) return bad(res, 400, 'Links need to start with https://');
    const videoUrl = text(s.video, 300);
    const video = videoUrl.length === 11 && !videoUrl.includes('/') ? videoUrl : ytId(videoUrl);
    if (videoUrl && !video) return bad(res, 400, 'That doesn’t look like a YouTube link.');
    const song = { title, artist: text(s.artist, 80), key: text(s.key, 12), bpm: text(s.bpm, 8), chartLink: link(s.chartLink), tabLink: link(s.tabLink), video, notes: text(s.notes, 1000) };
    await updateJson('band/songs.json', (d) => {
      d.items = d.items || [];
      const old = d.items.find((x) => x.id === s.id);
      if (old) Object.assign(old, song); else d.items.push({ id: newId(), chart: null, ...song });
    });
  } else if (action === 'removeSong') {
    let chart = null;
    await updateJson('band/songs.json', (d) => { chart = d.items?.find((x) => x.id === body.id)?.chart || null; d.items = (d.items || []).filter((x) => x.id !== body.id); });
    if (chart) await write(filePath(chart.fileId), {});
    await updateJson('band/sets.json', (d) => { for (const s of d.items || []) s.songs = s.songs.filter((x) => x !== body.id); });
  } else if (action === 'uploadChart') {
    const name = text(body.name, 120);
    const data = String(body.data || '');
    if (!FILE_TYPES.includes(body.type)) return bad(res, 400, 'Upload a PDF, PNG or JPG.');
    if (!data || data.length > MAX_FILE || !/^[A-Za-z0-9+/=]+$/.test(data)) return bad(res, 400, 'That file is too large. Keep charts under 3 MB.');
    const fileId = newId();
    let found = false, old = null;
    await updateJson('band/songs.json', (d) => { const s = d.items?.find((x) => x.id === body.songId); found = !!s; if (s) { old = s.chart; s.chart = { fileId, name }; } });
    if (!found) return bad(res, 404, 'Song not found.');
    await write(filePath(fileId), { name, type: body.type, data });
    if (old) await write(filePath(old.fileId), {});
  } else if (action === 'removeChart') {
    let old = null;
    await updateJson('band/songs.json', (d) => { const s = d.items?.find((x) => x.id === body.songId); if (s) { old = s.chart; s.chart = null; } });
    if (old) await write(filePath(old.fileId), {});
  } else if (action === 'saveSet') {
    const s = body.set || {};
    const date = text(s.date, 10);
    if (!/^\d{4}-\d\d-\d\d$/.test(date) || Number.isNaN(Date.parse(date))) return bad(res, 400, 'Pick the service date.');
    const fields = { date, title: text(s.title, 80), notes: text(s.notes, 500) };
    await updateJson('band/sets.json', (d) => {
      d.items = d.items || [];
      const old = d.items.find((x) => x.id === s.id);
      if (old) Object.assign(old, fields); else d.items.push({ id: newId(), songs: [], players: [], ...fields });
    });
  } else if (action === 'removeSet') {
    await updateJson('band/sets.json', (d) => { d.items = (d.items || []).filter((x) => x.id !== body.id); });
  } else if (action === 'setSongs' || action === 'setPlayers') {
    const songIds = new Set(((await read('band/songs.json'))?.items || []).map((x) => x.id));
    const busy = action === 'setPlayers' ? await otherBusy('band') : {};
    let found = false, clash = '';
    await updateJson('band/sets.json', (d) => {
      const s = d.items?.find((x) => x.id === body.setId);
      if (!s) return;
      found = true;
      if (action === 'setSongs') s.songs = (Array.isArray(body.songs) ? body.songs : []).filter((id) => songIds.has(id)).slice(0, 30);
      else {
        const players = (Array.isArray(body.players) ? body.players : []).filter((p) => people.some((x) => x.id === p.id && x.band)).slice(0, 30).map((p) => ({ id: p.id, part: text(p.part, 40) }));
        const hit = players.find((p) => busy[s.date]?.[p.id] && !s.players.some((x) => x.id === p.id));
        if (hit) { clash = `${people.find((x) => x.id === hit.id).name} is already serving that day (${busy[s.date][hit.id]}).`; return; }
        s.players = players;
      }
    });
    if (!found) return bad(res, 404, 'That service is no longer here.');
    if (clash) return bad(res, 409, clash);
  } else if (action !== 'load') {
    return bad(res, 400, 'Unknown action.');
  }
  res.json(await view(me, people, editor));
});
