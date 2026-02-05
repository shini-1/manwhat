'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface MangaDetail {
  id: string;
  attributes: {
    title: {
      en?: string;
    };
    description?: {
      en?: string;
    };
    status?: string;
    year?: number;
    tags?: Array<{
      attributes: {
        name: {
          en: string;
        };
      };
    }>;
    cover_art?: {
      fileName: string;
    };
  };
}

export default function MangaDetail() {
  const params = useParams();
  const id = params.id as string;
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchManga = async () => {
      try {
        const response = await fetch(`/api/manga/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch manga details');
        }
        const data = await response.json();
        setManga(data.data);
      } catch (err) {
        setError('Failed to load manga details. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchManga();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">{error}</div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 dark:text-zinc-400 mb-4">Manga not found</div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const coverUrl = manga.attributes.cover_art
    ? `https://uploads.mangadex.org/covers/${manga.id}/${manga.attributes.cover_art.fileName}.256.jpg`
    : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-4xl mx-auto py-8 px-4">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-6 inline-block"
        >
          ← Back to Search
        </Link>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {coverUrl && (
              <div className="flex-shrink-0">
                <img
                  src={coverUrl}
                  alt={`${manga.attributes.title?.en || 'Manga'} cover`}
                  className="w-48 h-72 object-cover rounded-lg shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4 text-black dark:text-zinc-50">
                {manga.attributes.title?.en || 'Untitled'}
              </h1>

              <div className="mb-4">
                <span className="font-semibold text-gray-700 dark:text-zinc-300">Status: </span>
                <span className="text-gray-600 dark:text-zinc-400 capitalize">
                  {manga.attributes.status || 'Unknown'}
                </span>
              </div>

              {manga.attributes.year && (
                <div className="mb-4">
                  <span className="font-semibold text-gray-700 dark:text-zinc-300">Year: </span>
                  <span className="text-gray-600 dark:text-zinc-400">
                    {manga.attributes.year}
                  </span>
                </div>
              )}

              {manga.attributes.tags && manga.attributes.tags.length > 0 && (
                <div className="mb-4">
                  <span className="font-semibold text-gray-700 dark:text-zinc-300">Tags: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {manga.attributes.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded"
                      >
                        {tag.attributes.name.en}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-zinc-200">
                  Description
                </h2>
                <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {manga.attributes.description?.en || 'No description available.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
