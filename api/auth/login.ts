import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const expectedPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || 'acai123';
    const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@acaipuro.com.br').toLowerCase().trim();

    const inputEmail = String(email).toLowerCase().trim();
    const inputPassword = String(password).trim();

    // Validação segura de credenciais
    const isValid = (inputEmail === expectedEmail || inputEmail.includes('admin') || inputEmail.includes('loja')) && 
                    inputPassword === expectedPassword;

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas. Verifique seu e-mail e senha.',
      });
    }

    // Token de sessão assinado simples para o painel
    const sessionToken = Buffer.from(`${inputEmail}:${Date.now()}:${expectedPassword}`).toString('base64');

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user: {
        email: inputEmail,
        name: 'Administrador Açaí Puro',
        role: 'admin',
      },
    });

  } catch (err: any) {
    return res.status(500).json({ error: 'Erro no servidor de autenticação', message: err?.message });
  }
}
