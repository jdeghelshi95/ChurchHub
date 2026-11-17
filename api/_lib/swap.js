import { GROUP, pickFor, readFolder, updateJson } from './store.js';

const BIT = { 5: 0, 6: 1, 0: 2, 1: 3 };
const said = (answers, id, date) => Object.entries(answers[id] || {}).some(([k, v]) => k.startsWith(date + '|') && v.a === 'no');

// Picks who covers a slot: free that day, not serving, has not said no, fewest turns this month.
function choose(month, service, role, fromId, people, answers, off, on) {
  const bit = BIT[new Date(service.date + 'T12:00:00Z').getUTCDay()];
  const taken = new Set(Object.values(service.slots));
  taken.add(fromId);
  const counts = {};
  const last = {};
  for (const s of month.services) for (const id of Object.values(s.slots)) {
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
    if (!last[id] || last[id] < s.date) last[id] = s.date;
  }
  return pickFor(people, GROUP[role], bit, service.date, { taken, off, on, counts, last, skip: (p) => said(answers, p.id, service.date) });
}

// Moves each slot to the best available person, or leaves it Open if nobody fits.
// With firm set, a slot only moves when someone who picked that day can take it.
export async function autoSwap(fromId, targets, people, anyMonth = false, firm = false) {
  if (!targets.length) return [];
  const [answers, off, on] = await Promise.all([readFolder('answers/'), readFolder('off/'), readFolder('on/')]);
  const today = new Date().toISOString().slice(0, 10);
  let done = [];
  await updateJson('months.json', (months) => {
    done = [];
    for (const { date, role } of targets) {
      if (date < today) continue;
      const month = Object.values(months).find((m) => (anyMonth || m.live) && m.services.some((s) => s.date === date));
      const service = month?.services.find((s) => s.date === date);
      if (!service || service.slots[role] !== fromId) continue;
      const { pick, lastResort } = choose(month, service, role, fromId, people, answers, off, on);
      if (firm && (!pick || lastResort)) continue;
      service.slots[role] = pick ? pick.id : '';
      done.push({ date, role, from: fromId, to: pick ? pick.id : '', at: new Date().toISOString(), ...(lastResort ? { lastResort: true } : {}) });
    }
  });
  // The log is only a record, so a problem saving it must not fail the swap itself.
  if (done.length) await updateJson('swaps.json', (log) => { log.items = [...done, ...(log.items || [])].slice(0, 100); }).catch((e) => console.error(e));
  return done;
}

export function mySlots(months, id) {
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(months).filter((m) => m.live).flatMap((m) => m.services)
    .filter((s) => s.date >= today)
    .flatMap((s) => Object.entries(s.slots).filter(([, who]) => who === id).map(([role]) => ({ date: s.date, role })));
}
