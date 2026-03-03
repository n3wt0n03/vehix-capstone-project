import { Request, Response, NextFunction } from 'express';
import supabase from '../lib/supabase';

export interface AuthUser {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
  role_name: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`user_id, email, first_name, last_name, role_id, user_roles(role_name)`)
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'User profile not found.' });
    return;
  }

  req.user = {
    user_id: profile.user_id,
    email: profile.email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role_id: profile.role_id,
    role_name: (profile.user_roles as any)?.role_name ?? null,
  };

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!req.user.role_name || !roles.includes(req.user.role_name)) {
      res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
      return;
    }

    next();
  };
}
