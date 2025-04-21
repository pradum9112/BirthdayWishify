import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  await dbConnect();
  const users = await User.find({}).lean();
  return NextResponse.json({ users });
}

// Optionally, add POST/PUT for user management if needed.
