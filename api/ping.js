import { get } from '@vercel/blob';

// Tells open pages whether anything changed, so they only reload when they need to.
export default async function ping(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const r = await get('version.json', { access: 'private', useCache: false });
    res.status(200).json({ v: r?.stream ? await new Response(r.stream).text() : '0' });
  } catch {
    res.status(200).json({ v: null });
  }
}
