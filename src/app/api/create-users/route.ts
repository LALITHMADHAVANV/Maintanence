import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const USERS = [
    { email: 'ceo@textech.garments', password: 'password123', uid: 'CEO-01', name: 'Dr. K. Ramanathan', role: 'CEO', title: 'Chief Executive Officer' },
    { email: 'admin@textech.garments', password: 'password123', uid: 'ADM-01', name: 'V. Sundaram', role: 'ADMIN', title: 'Plant Administrator' },
    { email: 'seniormechanic@textech.garments', password: 'password123', uid: 'MEC-01', name: 'Ramesh Kumar', role: 'SENIOR_MECHANIC', title: 'Senior Mechanic' },
    { email: 'mechanic@textech.garments', password: 'password123', uid: 'MEC-08', name: 'Suresh Babu', role: 'MECHANIC', title: 'Line Mechanic' },
    { email: 'seniorelectrician@textech.garments', password: 'password123', uid: 'ELEC-01', name: 'Anand Kumar', role: 'SENIOR_ELECTRICIAN', title: 'Senior Electrician & Servo Specialist' },
    { email: 'electrician@textech.garments', password: 'password123', uid: 'ELEC-02', name: 'Rajesh G.', role: 'ELECTRICIAN', title: 'Industrial Plant Electrician' },
    { email: 'stores@textech.garments', password: 'password123', uid: 'STR-01', name: 'M. Arumugam', role: 'STORE_PERSON', title: 'Store In-Charge' },
  ];

  try {
    for (const u of USERS) {
      // Create user in auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true
      });

      if (authError) {
        // If user already exists, it might throw an error. We can try to update password instead
        if (authError.message.includes('already registered')) {
          console.log(`User ${u.email} already exists, attempting to update password...`);
          // Find the user first
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users.find(user => user.email === u.email);
          if (existingUser) {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: u.password, email_confirm: true });
            
            // Upsert profile
            await supabaseAdmin.from('users').upsert({
              id: existingUser.id,
              uid: u.uid,
              name: u.name,
              email: u.email,
              role: u.role,
              title: u.title
            });
          }
          continue;
        } else {
          throw authError;
        }
      }

      if (authData.user) {
        // Create profile in public.users
        const { error: profileError } = await supabaseAdmin.from('users').upsert({
          id: authData.user.id,
          uid: u.uid,
          name: u.name,
          email: u.email,
          role: u.role,
          title: u.title
        });

        if (profileError) throw profileError;
      }
    }

    return NextResponse.json({ message: 'Users created successfully!' });
  } catch (error: any) {
    console.error('Error creating users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
