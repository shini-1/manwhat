import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();

  if (!title || title.length === 0) {
    return NextResponse.json({ error: 'Title parameter is required and cannot be empty' }, { status: 400 });
  }

  if (title.length > 100) {
    return NextResponse.json({ error: 'Title parameter is too long (max 100 characters)' }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://api.mangadex.org/manga`, {
      params: {
        title: title,
        limit: 10,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching manga:', error);
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400) {
        return NextResponse.json({ error: 'Invalid search parameters' }, { status: 400 });
      }
      if (error.response.status === 404) {
        return NextResponse.json({ error: 'No manga found matching the title' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch manga from external API' }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
