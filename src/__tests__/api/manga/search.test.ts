import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/manga/search/route';

// Mock axios
jest.mock('axios');
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('/api/manga/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if title parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/manga/search');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title parameter is required and cannot be empty');
  });

  it('should return 400 if title parameter is empty', async () => {
    const request = new NextRequest('http://localhost:3000/api/manga/search?title=');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title parameter is required and cannot be empty');
  });

  it('should return 400 if title parameter is too long', async () => {
    const longTitle = 'a'.repeat(101);
    const request = new NextRequest(`http://localhost:3000/api/manga/search?title=${longTitle}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title parameter is too long (max 100 characters)');
  });

  it('should return manga data on successful API call', async () => {
    const mockData = { data: [{ id: '1', title: 'Test Manga' }] };
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });

    const request = new NextRequest('http://localhost:3000/api/manga/search?title=Test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockData);
    expect(mockedAxios.get).toHaveBeenCalledWith('https://api.mangadex.org/manga', {
      params: { title: 'Test', limit: 10 },
    });
  });

  it('should handle API errors correctly', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 404, data: 'Not Found' },
    });

    const request = new NextRequest('http://localhost:3000/api/manga/search?title=NonExistent');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No manga found matching the title');
  });

  it('should handle network errors', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

    const request = new NextRequest('http://localhost:3000/api/manga/search?title=Test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
