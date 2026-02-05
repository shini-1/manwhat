'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Manga {
  id: string;
  attributes: {
    title: {
      en?: string;
    };
    description?: {
      en?: string;
    };
  };
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/manga/search?title=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setResults(data.data || []);
    } catch (err) {
      setError('Failed to search manga. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-black dark:text-zinc-50">
          Manga Search
        </h1>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for manga..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-50"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((manga) => (
            <div key={manga.id} className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-2 text-black dark:text-zinc-50">
                {manga.attributes.title?.en || 'Untitled'}
              </h2>
              <p className="text-gray-600 dark:text-zinc-400 mb-4 line-clamp-3">
                {manga.attributes.description?.en || 'No description available.'}
              </p>
              <Link
                href={`/manga/${manga.id}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View Details →
              </Link>
            </div>
          ))}
        </div>

        {results.length === 0 && !loading && searchTerm && !error && (
          <p className="text-center text-gray-600 dark:text-zinc-400">
            No manga found for "{searchTerm}".
          </p>
        )}
      </main>
    </div>
  );
}
