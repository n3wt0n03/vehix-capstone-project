import { Request, Response } from 'express';
import supabase from '../lib/supabase';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, first_name, last_name, phone_number } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  // Look up the 'customer' role_id
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('role_name', 'customer')
    .single();

  if (roleError || !roleData) {
    res.status(500).json({ error: 'Could not resolve customer role.' });
    return;
  }

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? 'Failed to create auth user.' });
    return;
  }

  // Insert into users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      user_id: authData.user.id,
      email,
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      phone_number: phone_number ?? null,
      role_id: roleData.role_id,
    })
    .select(`*, user_roles(role_name)`)
    .single();

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    res.status(500).json({ error: 'Failed to create user profile.', detail: profileError.message });
    return;
  }

  res.status(201).json({ user: profile });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user || !authData.session) {
    res.status(401).json({ error: authError?.message ?? 'Invalid credentials.' });
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`*, user_roles(role_name)`)
    .eq('user_id', authData.user.id)
    .single();

  if (profileError || !profile) {
    res.status(500).json({ error: 'Failed to fetch user profile.', detail: profileError?.message });
    return;
  }

  res.json({
    access_token: authData.session.access_token,
    user: profile,
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
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
    .select(`*, user_roles(role_name)`)
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'User profile not found.', detail: profileError?.message });
    return;
  }

  res.json({ user: profile });
}
