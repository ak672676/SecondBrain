import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabase } from '@/lib/supabase/client';
import { signToken, setAuthCookie } from '@/lib/auth/jwt';
import { validateRegisterInput } from '@/lib/auth/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    // Validate input
    const validation = validateRegisterInput({ username, email, password });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    // Check if username or email already taken
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already taken' },
        { status: 409 }
      );
    }

    // Hash password (12 rounds as per PRD)
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({ username, email, password_hash: passwordHash })
      .select('id, username, email')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Sign JWT and set cookie
    const token = signToken({ userId: user.id, username: user.username });
    const response = NextResponse.json(
      { user: { id: user.id, username: user.username, email: user.email } },
      { status: 201 }
    );
    setAuthCookie(response, token);

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
