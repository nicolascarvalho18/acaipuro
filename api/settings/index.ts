import { getStoreSettings, updateStoreSettings } from '../_services/db';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const settings = await getStoreSettings();
      return res.status(200).json({ success: true, settings });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao buscar configurações', message: e?.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const updated = await updateStoreSettings(body);
      return res.status(200).json({ success: true, settings: updated });
    } catch (e: any) {
      return res.status(500).json({ error: 'Erro ao salvar configurações', message: e?.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
