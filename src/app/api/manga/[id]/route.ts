import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || id.trim().length === 0) {
    return NextResponse.json({ error: 'ID parameter is required and cannot be empty' }, { status: 400 });
  }

  // Basic UUID validation (Mangadex uses UUIDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid ID format. Must be a valid UUID.' }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://api.mangadex.org/manga/${id}`);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching manga:', error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400) {
        return NextResponse.json({ error: 'Invalid manga ID' }, { status: 400 });
      }
      if (error.response.status === 404) {
        return NextResponse.json({ error: 'Manga not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch manga from external API' }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
