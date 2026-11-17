import { read } from './store.js';

// Who is already serving on each date, across ministries, so nobody is scheduled in two places at once.
// Returns { date: { personId: 'Kids · Preschool teacher' } }, leaving out the ministry named in `skip`.
export async function otherBusy(skip) {
  const out = {};
  const add = (date, id, label) => { if (id) (out[date] = out[date] || {})[id] = label; };
  const [months, kids, band] = await Promise.all([
    skip === 'production' ? null : read('months.json'),
    skip === 'kids' ? null : read('kids/schedule.json'),
    skip === 'band' ? null : read('band/sets.json'),
  ]);
  for (const mo of Object.values(months || {})) for (const s of mo.services || []) for (const [role, id] of Object.entries(s.slots)) add(s.date, id, 'Production · ' + role);
  for (const s of kids?.services || []) for (const slot of s.slots) add(s.date, slot.personId, 'Kids · ' + slot.label);
  for (const s of band?.items || []) for (const p of s.players || []) add(s.date, p.id, 'Band' + (p.part ? ' · ' + p.part : ''));
  return out;
}

// The same information shaped like the "can't serve" lists, so the Production scheduler skips these people.
export function asOff(busy, off = {}) {
  const out = {};
  for (const [id, days] of Object.entries(off)) out[id] = { ...days };
  for (const [date, people] of Object.entries(busy)) for (const id of Object.keys(people)) (out[id] = out[id] || {})[date] = 1;
  return out;
}

// One person's upcoming dates in the other ministries, for their own page.
export async function myOtherDates(id) {
  const today = new Date().toISOString().slice(0, 10);
  const busy = await otherBusy('production');
  return Object.entries(busy).filter(([date, people]) => date >= today && people[id]).map(([date, people]) => ({ date, what: people[id] })).sort((a, b) => a.date.localeCompare(b.date));
}
