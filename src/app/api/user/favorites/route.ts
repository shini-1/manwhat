import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UserFavorites from '@/lib/models/UserFavorites';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const favorites = await UserFavorites.find({ userId })
      .populate('mangaId')
      .sort({ addedAt: -1 });

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, mangaId } = await request.json();

    if (!userId || !mangaId) {
      return NextResponse.json({ error: 'User ID and Manga ID are required' }, { status: 400 });
    }

    await dbConnect();

    const favorite = await UserFavorites.findOneAndUpdate(
      { userId, mangaId },
      { addedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Added to favorites', favorite });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mangaId = searchParams.get('mangaId');

    if (!userId || !mangaId) {
      return NextResponse.json({ error: 'User ID and Manga ID are required' }, { status: 400 });
    }

    await dbConnect();

    await UserFavorites.findOneAndDelete({ userId, mangaId });

    return NextResponse.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
