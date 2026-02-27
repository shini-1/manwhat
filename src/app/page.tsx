'use client';

import { useState, useEffect } from 'react';
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
    status?: string;
    year?: number;
    tags?: string[];
    coverUrl?: string;
  };
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Manga[]>([]);
  const [popularManga, setPopularManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'search'>('popular');

  // Fetch popular manga on initial load
  useEffect(() => {
    const fetchPopularManga = async () => {
      setPopularLoading(true);
      try {
        // First try to initialize popular manga from API
        await fetch('/api/manga/init', { method: 'GET' });
        
        // Then fetch the popular manga
        const response = await fetch('/api/manga/popular?limit=50');
        if (response.ok) {
          const data = await response.json();
          setPopularManga(data.data || []);
        }
      } catch (err) {
        console.error('Error loading popular manga:', err);
      } finally {
        setPopularLoading(false);
      }
    };

    fetchPopularManga();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setActiveTab('search');
    
    try {
      const response = await fetch(`/api/manga/search?title=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (err) {
      setError('Failed to search manga. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayManga = activeTab === 'popular' ? popularManga : searchResults;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-6xl mx-auto py-8 px-4">
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'popular'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
            }`}
          >
            Popular Manga
          </button>
          <button
            onClick={() => setActiveTab('search')}
            disabled={!searchTerm}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 disabled:opacity-50'
            }`}
          >
            Search Results
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {(loading || popularLoading) && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Manga Grid */}
        {!loading && !popularLoading && (
          <>
            {displayManga.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayManga.map((manga) => (
                  <Link
                    key={manga.id}
                    href={`/manga/${manga.id}`}
                    className="block bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    {manga.attributes.coverUrl && (
                      <div className="aspect-[3/4] mb-3 overflow-hidden rounded-md">
                        <img
                          src={manga.attributes.coverUrl}
                          alt={manga.attributes.title?.en || 'Manga cover'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold mb-1 text-black dark:text-zinc-50 line-clamp-2">
                      {manga.attributes.title?.en || 'Untitled'}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 mb-2">
                      {manga.attributes.year && <span>{manga.attributes.year}</span>}
                      {manga.attributes.status && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{manga.attributes.status}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2">
                      {manga.attributes.description?.en || 'No description available.'}
                    </p>
                    {manga.attributes.tags && manga.attributes.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {manga.attributes.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-zinc-400 py-12">
                {activeTab === 'popular' 
                  ? 'No popular manga available. Please try again later.' 
                  : `No manga found for "${searchTerm}".`}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
