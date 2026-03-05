/**
 * Mihon-inspired TypeScript Models for Manga Parsing
 * Based on: source-api/src/commonMain/kotlin/eu/kanade/tachiyomi/source/model/
 */

// Manga Status Constants (matching Mihon's SManga)
export const MangaStatus = {
  UNKNOWN: 0,
  ONGOING: 1,
  COMPLETED: 2,
  LICENSED: 3,
  PUBLISHING_FINISHED: 4,
  CANCELLED: 5,
  ON_HIATUS: 6,
} as const;

export type MangaStatus = typeof MangaStatus[keyof typeof MangaStatus];

// Update Strategy
export const UpdateStrategy = {
  ALWAYS_UPDATE: 0,
  ONLY_FETCH_ONCE: 1,
} as const;

export type UpdateStrategy = typeof UpdateStrategy[keyof typeof UpdateStrategy];

/**
 * SManga - Manga information model (Mihon equivalent)
 */
export interface SManga {
  url: string;
  title: string;
  artist?: string;
  author?: string;
  description?: string;
  genre?: string;
  status: MangaStatus;
  thumbnailUrl?: string;
  updateStrategy: UpdateStrategy;
  initialized: boolean;
}

/**
 * SManga implementation
 */
export class SMangaImpl implements SManga {
  url: string = '';
  title: string = '';
  artist?: string;
  author?: string;
  description?: string;
  genre?: string;
  status: MangaStatus = MangaStatus.UNKNOWN;
  thumbnailUrl?: string;
  updateStrategy: UpdateStrategy = UpdateStrategy.ALWAYS_UPDATE;
  initialized: boolean = false;

  getGenres(): string[] | null {
    if (!this.genre) return null;
    return this.genre.split(',').map(g => g.trim()).filter(g => g.length > 0);
  }

  copy(): SMangaImpl {
    const copy = new SMangaImpl();
    copy.url = this.url;
    copy.title = this.title;
    copy.artist = this.artist;
    copy.author = this.author;
    copy.description = this.description;
    copy.genre = this.genre;
    copy.status = this.status;
    copy.thumbnailUrl = this.thumbnailUrl;
    copy.updateStrategy = this.updateStrategy;
    copy.initialized = this.initialized;
    return copy;
  }

  static create(): SMangaImpl {
    return new SMangaImpl();
  }
}

/**
 * SChapter - Chapter model (Mihon equivalent)
 */
export interface SChapter {
  url: string;
  name: string;
  dateUpload: number;
  chapterNumber: number;
  scanlator?: string;
}

/**
 * SChapter implementation
 */
export class SChapterImpl implements SChapter {
  url: string = '';
  name: string = '';
  dateUpload: number = 0;
  chapterNumber: number = 0;
  scanlator?: string;

  copyFrom(other: SChapter): void {
    this.name = other.name;
    this.url = other.url;
    this.dateUpload = other.dateUpload;
    this.chapterNumber = other.chapterNumber;
    this.scanlator = other.scanlator;
  }

  static create(): SChapterImpl {
    return new SChapterImpl();
  }
}

/**
 * Page - Image page model (Mihon equivalent)
 */
export interface Page {
  index: number;
  url: string;
  imageUrl?: string;
}

/**
 * Page implementation
 */
export class PageImpl implements Page {
  index: number = 0;
  url: string = '';
  imageUrl?: string;

  get number(): number {
    return this.index + 1;
  }

  static create(index: number): PageImpl {
    const page = new PageImpl();
    page.index = index;
    return page;
  }
}

/**
 * MangasPage - Page of manga list with pagination info
 */
export interface MangasPage {
  mangas: SManga[];
  hasNextPage: boolean;
}

export class MangasPageImpl implements MangasPage {
  mangas: SManga[] = [];
  hasNextPage: boolean = false;

  static create(mangas: SManga[], hasNextPage: boolean): MangasPageImpl {
    const page = new MangasPageImpl();
    page.mangas = mangas;
    page.hasNextPage = hasNextPage;
    return page;
  }
}

/**
 * ChaptersPage - List of chapters
 */
export interface ChaptersPage {
  chapters: SChapter[];
}

export class ChaptersPageImpl implements ChaptersPage {
  chapters: SChapter[] = [];

  static create(chapters: SChapter[]): ChaptersPageImpl {
    const page = new ChaptersPageImpl();
    page.chapters = chapters;
    return page;
  }
}

/**
 * PagesPage - List of pages (images)
 */
export interface PagesPage {
  pages: Page[];
}

export class PagesPageImpl implements PagesPage {
  pages: Page[] = [];

  static create(pages: Page[]): PagesPageImpl {
    const page = new PagesPageImpl();
    page.pages = pages;
    return page;
  }
}

