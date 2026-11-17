/* Band screens: schedule with setlists, songs with charts, tabs and videos, and members. Uses helpers from app.js and kids.js. */
const B = { data: null, tab: 'sets', open: null, song: null };

function bandStart() {
  if (!L.code) L.code = store.get('leaderCode', sessionStorage);
  if (!L.code && !V.token) { location.hash = ''; return; }
  bandCall({ action: 'load' });
}
async function bandCall(body, done) {
  try { B.data = await api('/api/band', body, hdr()); keep(bandView); if (done) toast(done); return true; }
  catch (e) {
    toast(e.message);
    if (!B.data) { app.innerHTML = `<section class="panel"><h2>Band</h2><p class="err">${esc(e.message)}</p><button id="bback">Back</button></section>`; document.getElementById('bback').onclick = () => { location.hash = ''; }; }
    return false;
  }
}
const songOf = (id) => B.data.songs.find((s) => s.id === id);
const memberName = (id) => B.data.members.find((m) => m.id === id)?.name || 'Former member';

// The buttons and video for one song. Used in the song list and inside a setlist.
function songLinks(s) {
  return `<div class="row">${s.chart ? `<button data-file="${s.chart.fileId}">Open chart</button>` : ''}${s.chartLink ? `<a href="${esc(s.chartLink)}" target="_blank" rel="noopener">Chart link</a>` : ''}${s.tabLink ? `<a href="${esc(s.tabLink)}" target="_blank" rel="noopener">Tabs</a>` : ''}</div>
  ${s.video ? `<details><summary>Video guide</summary><iframe class="vid" src="https://www.youtube-nocookie.com/embed/${esc(s.video)}" title="${esc(s.title)}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></details>` : ''}`;
}
const songMeta = (s) => [s.artist, s.key && 'Key ' + s.key, s.bpm && s.bpm + ' bpm'].filter(Boolean).map(esc).join(' · ');

function setsTab() {
  const { sets, songs, members, editor, today } = B.data;
  const upcoming = sets.filter((s) => s.date >= today), past = sets.filter((s) => s.date < today).reverse().slice(0, 8);
  const card = (s) => {
    const open = B.open === s.id;
    return `<section class="panel"><div class="top"><div><h2>${dayName(s.date)}</h2>${s.title ? `<div class="muted">${esc(s.title)}</div>` : ''}</div>${editor ? `<button data-edit="${s.id}">${open ? 'Done' : 'Edit'}</button>` : ''}</div>
    ${s.notes ? `<p class="small">${esc(s.notes)}</p>` : ''}
    <h3>Setlist</h3>${s.songs.map((id, i) => { const x = songOf(id); return x ? `<div class="cue"><div class="top"><div><div class="role">${i + 1}. ${esc(x.title)}</div><div class="small muted">${songMeta(x)}</div></div>${open ? `<div class="row"><button data-up="${s.id}" data-i="${i}" aria-label="Move ${esc(x.title)} up"${i ? '' : ' disabled'}>↑</button><button class="link small" data-unsong="${s.id}" data-i="${i}">Remove</button></div>` : ''}</div>${open ? '' : songLinks(x)}</div>` : ''; }).join('') || '<p class="muted">No songs chosen yet.</p>'}
    ${open ? `<div class="row"><select id="addsong-${s.id}" class="grow" aria-label="Song to add">${songs.filter((x) => !s.songs.includes(x.id)).map((x) => `<option value="${x.id}">${esc(x.title)}${x.key ? ' (' + esc(x.key) + ')' : ''}</option>`).join('')}</select><button data-addsong="${s.id}">Add song</button></div>` : ''}
    <h3>Who’s playing</h3><div class="chips">${s.players.map((p, i) => `<span class="pill yes">${esc(memberName(p.id))}${p.part ? ' · ' + esc(p.part) : ''}${open ? ` <button class="link small" data-unplayer="${s.id}" data-i="${i}" aria-label="Remove ${esc(memberName(p.id))}">×</button>` : ''}</span>`).join('') || '<span class="muted">Nobody scheduled yet.</span>'}</div>
    ${open ? `<div class="row"><select id="addplayer-${s.id}" class="grow" aria-label="Band member">${members.filter((m) => !s.players.some((p) => p.id === m.id)).map((m) => { const away = B.data.busy[s.date]?.[m.id]; return `<option value="${m.id}" data-part="${esc(m.part)}"${away ? ' disabled' : ''}>${esc(m.name)}${away ? ' (' + esc(away) + ')' : m.part ? ' \u00b7 ' + esc(m.part) : ''}</option>`; }).join('')}</select><button data-addplayer="${s.id}">Add</button></div>
    <button class="link small" data-delset="${s.id}" style="justify-self:start">Delete this service</button>` : ''}</section>`;
  };
  return `${editor ? `<form class="panel" id="newset"><h2>Add a service</h2><div class="row"><input id="setdate" type="date" class="grow" aria-label="Service date" required><input id="settitle" class="grow" placeholder="Name (optional), like Sunday AM" maxlength="80" aria-label="Service name"></div><button class="primary">Add service</button></form>` : ''}
  ${upcoming.map(card).join('') || '<section class="panel"><p class="muted">No upcoming services yet.</p></section>'}
  ${past.length ? `<section class="panel"><h2>Past services</h2>${past.map((s) => `<div class="row"><span class="grow">${dayName(s.date)}${s.title ? ' · ' + esc(s.title) : ''}</span><span class="small muted">${s.songs.length} song${s.songs.length === 1 ? '' : 's'}</span></div>`).join('')}</section>` : ''}`;
}
function songForm(s = {}) {
  const f = (id, label, value, extra = '') => `<label class="lbl" for="${id}">${label}</label><input id="${id}" value="${esc(value)}" ${extra}>`;
  return `<form class="panel" id="songform"><h2>${s.id ? 'Edit ' + esc(s.title) : 'Add a song'}</h2>
  ${f('stitle', 'Title', s.title, 'maxlength="100" required')}${f('sartist', 'Artist', s.artist, 'maxlength="80"')}
  <div class="row"><div class="grow">${f('skey', 'Key', s.key, 'maxlength="12" placeholder="G" style="width:100%"')}</div><div class="grow">${f('sbpm', 'Tempo (bpm)', s.bpm, 'maxlength="8" inputmode="numeric" style="width:100%"')}</div></div>
  ${f('schart', 'Chart link', s.chartLink, 'placeholder="https://" maxlength="300"')}${f('stab', 'Tabs link', s.tabLink, 'placeholder="https://" maxlength="300"')}${f('svideo', 'YouTube video guide', s.video, 'placeholder="YouTube link" maxlength="300"')}
  <label class="lbl" for="snotes">Notes</label><textarea id="snotes" maxlength="1000" placeholder="Arrangement, who leads, capo and so on">${esc(s.notes)}</textarea>
  <div class="row"><button class="primary">Save song</button>${s.id ? '<button type="button" id="songcancel">Cancel</button>' : ''}</div>
  <p class="small muted">After saving, use Upload chart on the song to attach a PDF or picture.</p></form>`;
}
function songsTab() {
  const { songs, editor } = B.data;
  const editing = songs.find((s) => s.id === B.song);
  return `${editor ? songForm(editing) : ''}
  <section class="panel"><div class="top"><h2>Songs</h2><span class="muted small">${songs.length} song${songs.length === 1 ? '' : 's'}</span></div>
  ${songs.map((s) => `<div class="cue"><div class="top"><div><div class="role">${esc(s.title)}</div><div class="small muted">${songMeta(s)}</div></div>${editor ? `<button data-editsong="${s.id}">Edit</button>` : ''}</div>
  ${s.notes ? `<div class="small">${esc(s.notes)}</div>` : ''}${songLinks(s)}
  ${editor ? `<div class="row small"><label class="link" style="cursor:pointer;text-decoration:underline;color:var(--accent)">${s.chart ? 'Replace chart' : 'Upload chart'}<input type="file" accept="application/pdf,image/png,image/jpeg" data-upload="${s.id}" hidden></label>${s.chart ? `<span class="muted">${esc(s.chart.name)}</span><button class="link small" data-delchart="${s.id}">Remove chart</button>` : ''}<button class="link small" data-delsong="${s.id}">Delete song</button></div>` : ''}</div>`).join('') || '<p class="muted">No songs yet.</p>'}</section>`;
}
function membersTab() {
  const { members, others, editor } = B.data;
  return `<section class="panel"><div class="top"><h2>Band members</h2><span class="muted small">${members.length}</span></div>
  ${members.map((m) => `<div class="cue"><div class="top"><div><div class="role">${esc(m.name)}</div><div class="small muted">${esc(m.part || 'No instrument set')}${m.role === 'lead' ? ' · Band leader' : ''}</div></div>${editor ? `<button class="link small" data-unmember="${m.id}">Remove</button>` : ''}</div>
  ${editor ? `<div class="row"><input class="grow" data-part="${m.id}" value="${esc(m.part)}" maxlength="40" placeholder="Instrument or voice" aria-label="Instrument for ${esc(m.name)}"><select data-brole="${m.id}" aria-label="Role for ${esc(m.name)}"><option value="member"${m.role === 'member' ? ' selected' : ''}>Member</option><option value="lead"${m.role === 'lead' ? ' selected' : ''}>Band leader</option></select><button data-savemember="${m.id}">Save</button></div>` : ''}</div>`).join('') || '<p class="muted">No band members yet.</p>'}</section>
  ${editor ? `<form class="panel" id="madd"><h2>Add someone already in Church Hub</h2><select id="mperson" aria-label="Volunteer">${others.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input id="mpart" placeholder="Instrument or voice" maxlength="40" aria-label="Instrument or voice"><button class="primary">Add to Band</button></form>
  <form class="panel" id="mnew"><h2>Add a new member</h2><p class="small muted">For someone who only serves in the Band. They get a member number to sign in with.</p><input id="mname" placeholder="Full name" maxlength="60" aria-label="Full name" required><input id="mnpart" placeholder="Instrument or voice" maxlength="40" aria-label="Instrument or voice"><button class="primary">Add member</button></form>` : ''}`;
}
function bandView() {
  const { me, editor } = B.data;
  const tabs = [['sets', 'Schedule and setlists'], ['songs', 'Songs and charts'], ['members', 'Members']];
  const top = me.level === 'admin';
  app.innerHTML = `<div class="top"><div><p class="muted">Band${editor ? ' · Leader' : ''}</p><h1>${esc(me.name === 'Leader' ? APP_NAME : me.name)}</h1></div>${top ? '' : '<div class="row"><button id="bleave">Back to my schedule</button></div>'}</div>
  ${top ? ministryBar('band') : ''}<div class="subs">${tabs.map(([t, l]) => `<button data-bt="${t}" aria-pressed="${B.tab === t}">${l}</button>`).join('')}</div>
  ${B.tab === 'songs' ? songsTab() : B.tab === 'members' ? membersTab() : setsTab()}`;
  bindMinistryBar();
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el[el.tagName === 'FORM' ? 'onsubmit' : 'onclick'] = fn; };
  const each = (sel, fn) => app.querySelectorAll(sel).forEach(fn);
  const sure = (b, label, go) => { if (b.dataset.sure) return go(); b.dataset.sure = '1'; b.textContent = label; };
  const setOf = (id) => B.data.sets.find((s) => s.id === id);
  on('bleave', () => { location.hash = ''; });
  each('[data-bt]', (b) => b.onclick = () => { B.tab = b.dataset.bt; B.song = null; bandView(); scrollTo(0, 0); });
  each('[data-file]', (b) => b.onclick = async () => {
    b.disabled = true;
    try {
      const f = await api('/api/band', { action: 'file', id: b.dataset.file }, hdr());
      const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: f.type }));
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { toast(e.message); }
    b.disabled = false;
  });
  // Schedule and setlists
  on('newset', (e) => { e.preventDefault(); bandCall({ action: 'saveSet', set: { date: document.getElementById('setdate').value, title: document.getElementById('settitle').value } }, 'Service added. Tap Edit to choose songs and players.'); });
  each('[data-edit]', (b) => b.onclick = () => { B.open = B.open === b.dataset.edit ? null : b.dataset.edit; bandView(); });
  each('[data-addsong]', (b) => b.onclick = () => { const s = setOf(b.dataset.addsong), v = document.getElementById('addsong-' + s.id).value; if (!v) return toast('Add songs on the Songs and charts page first.'); bandCall({ action: 'setSongs', setId: s.id, songs: [...s.songs, v] }); });
  each('[data-unsong]', (b) => b.onclick = () => { const s = setOf(b.dataset.unsong); bandCall({ action: 'setSongs', setId: s.id, songs: s.songs.filter((_, i) => i !== +b.dataset.i) }); });
  each('[data-up]', (b) => b.onclick = () => { const s = setOf(b.dataset.up), i = +b.dataset.i, l = [...s.songs]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; bandCall({ action: 'setSongs', setId: s.id, songs: l }); });
  each('[data-addplayer]', (b) => b.onclick = () => { const s = setOf(b.dataset.addplayer), sel = document.getElementById('addplayer-' + s.id); if (!sel.value) return toast('Add band members on the Members page first.'); bandCall({ action: 'setPlayers', setId: s.id, players: [...s.players, { id: sel.value, part: sel.selectedOptions[0].dataset.part }] }); });
  each('[data-unplayer]', (b) => b.onclick = () => { const s = setOf(b.dataset.unplayer); bandCall({ action: 'setPlayers', setId: s.id, players: s.players.filter((_, i) => i !== +b.dataset.i) }); });
  each('[data-delset]', (b) => b.onclick = () => sure(b, 'Tap again to delete', () => bandCall({ action: 'removeSet', id: b.dataset.delset }, 'Service deleted.')));
  // Songs and charts
  const val = (id) => document.getElementById(id).value;
  on('songform', async (e) => { e.preventDefault(); const song = { id: B.song || undefined, title: val('stitle'), artist: val('sartist'), key: val('skey'), bpm: val('sbpm'), chartLink: val('schart'), tabLink: val('stab'), video: val('svideo'), notes: val('snotes') }; const was = B.song; B.song = null; if (!(await bandCall({ action: 'saveSong', song }, 'Song saved.'))) { B.song = was; } });
  on('songcancel', () => { B.song = null; bandView(); });
  each('[data-editsong]', (b) => b.onclick = () => { B.song = b.dataset.editsong; bandView(); scrollTo(0, 0); });
  each('[data-delsong]', (b) => b.onclick = () => sure(b, 'Tap again to delete', () => bandCall({ action: 'removeSong', id: b.dataset.delsong }, 'Song deleted.')));
  each('[data-delchart]', (b) => b.onclick = () => sure(b, 'Tap again to remove', () => bandCall({ action: 'removeChart', songId: b.dataset.delchart }, 'Chart removed.')));
  each('[data-upload]', (inp) => inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    if (file.size > 3_000_000) return toast('That file is too large. Keep charts under 3 MB.');
    const r = new FileReader();
    r.onload = () => bandCall({ action: 'uploadChart', songId: inp.dataset.upload, name: file.name, type: file.type, data: String(r.result).split(',')[1] }, 'Chart uploaded.');
    r.readAsDataURL(file);
  });
  // Members
  each('[data-savemember]', (b) => b.onclick = () => { const id = b.dataset.savemember; bandCall({ action: 'setMember', personId: id, role: app.querySelector(`[data-brole="${id}"]`).value, part: app.querySelector(`[data-part="${id}"]`).value }, 'Saved.'); });
  each('[data-unmember]', (b) => b.onclick = () => sure(b, 'Tap again to remove', () => bandCall({ action: 'setMember', personId: b.dataset.unmember, role: '' }, 'Removed from the Band.')));
  on('madd', (e) => { e.preventDefault(); if (!val('mperson')) return toast('Everyone is already in the Band.'); bandCall({ action: 'setMember', personId: val('mperson'), role: 'member', part: val('mpart') }, 'Added to the Band.'); });
  on('mnew', (e) => { e.preventDefault(); bandCall({ action: 'addMember', name: val('mname'), part: val('mnpart') }, 'Member added.'); });
}
