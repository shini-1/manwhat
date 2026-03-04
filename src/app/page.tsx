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
    tags?: Array<{ name?: string } | string>[];
    coverUrl?: string;
  };
}

interface Source {
  name: string;
  scraper: string;
  isBuiltIn: boolean;
  url?: string;
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Manga[]>([]);
  const [popularManga, setPopularManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'search' | 'source'>('popular');
  
  // Sources modal state
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sourceManga, setSourceManga] = useState<Manga[]>([]);

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

  // Fetch available sources
  const fetchSources = async () => {
    setSourcesLoading(true);
    try {
      const response = await fetch('/api/sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  };

  // Open sources modal
  const handleOpenSourcesModal = async () => {
    setShowSourcesModal(true);
    if (sources.length === 0) {
      await fetchSources();
    }
  };

  // Select a source and fetch manga from it
  const handleSelectSource = async (source: Source) => {
    setSelectedSource(source.scraper);
    setShowSourcesModal(false);
    setActiveTab('source');
    setLoading(true);

    try {
      const response = await fetch(`/api/manga/scrape?source=${encodeURIComponent(source.scraper)}`);
      if (response.ok) {
        const data = await response.json();
        setSourceManga(data.data || []);
      } else {
        throw new Error('Failed to fetch manga from source');
      }
    } catch (err) {
      setError('Failed to load manga from selected source. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayManga = activeTab === 'popular' ? popularManga : activeTab === 'search' ? searchResults : sourceManga;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-black dark:text-zinc-50">
          Manga Search
        </h1>

        <div className="flex gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1">
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
          
          <button
            onClick={handleOpenSourcesModal}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            Sources
          </button>
        </div>

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
          <button
            onClick={() => setActiveTab('source')}
            disabled={!selectedSource}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'source'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 disabled:opacity-50'
            }`}
          >
            {selectedSource ? `From ${sources.find(s => s.scraper === selectedSource)?.name || selectedSource}` : 'Source Manga'}
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
                        {manga.attributes.tags.slice(0, 3).map((tag, index) => {
                          const tagName = typeof tag === 'string' ? tag : (tag as { name?: string })?.name || '';
                          return (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded"
                            >
                              {tagName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-zinc-400 py-12">
                {activeTab === 'popular' 
                  ? 'No popular manga available. Please try again later.' 
                  : activeTab === 'search'
                  ? `No manga found for "${searchTerm}".`
                  : 'Select a source to view manga from that source.'}
              </p>
            )}
          </>
        )}
      </main>

      {/* Sources Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Select Manga Source
              </h2>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {sourcesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSource(source)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-black dark:text-zinc-50">{source.name}</h3>
                          {source.url && (
                            <p className="text-sm text-gray-500 dark:text-zinc-400">{source.url}</p>
                          )}
                        </div>
                        {source.isBuiltIn && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                            Built-in
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-zinc-400 py-8">
                  No sources available. Please try again later.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
