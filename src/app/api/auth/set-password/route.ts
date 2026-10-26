import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const db = await getDatabase(req);
    const collection = db.collection('users');

    const existingUser = await collection.findOne({
      $or: [
        { email: cleanEmail },
        { uid: cleanEmail },
        { employeeId: cleanEmail },
      ],
    });

    if (existingUser) {
      const updateDoc: any = {
        password: cleanPassword,
        defaultPassword: cleanPassword,
        updatedAt: new Date().toISOString(),
      };
      if (name) updateDoc.name = name;
      if (role) updateDoc.role = role;

      await collection.updateOne(
        { _id: existingUser._id },
        { $set: updateDoc }
      );

      return NextResponse.json({
        success: true,
        message: `Password for ${cleanEmail} has been updated successfully!`,
        uid: existingUser.uid,
      });
    } else {
      // Create user doc if not found
      const uid = `USR-${Date.now().toString(36).toUpperCase()}`;
      await collection.insertOne({
        uid,
        email: cleanEmail,
        password: cleanPassword,
        defaultPassword: cleanPassword,
        name: name || cleanEmail.split('@')[0],
        role: role || 'MECHANIC',
        title: 'Factory Staff',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `User created and password set for ${cleanEmail}!`,
        uid,
      });
    }
  } catch (err: unknown) {
    console.error('Error updating password in MongoDB:', err);
    return NextResponse.json(
      { error: 'Internal server error while updating password' },
      { status: 500 }
    );
  }
}
