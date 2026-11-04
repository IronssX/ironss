import { searchPublicProfiles } from '@/services/profileService';
import { searchPublicVideos } from '@/services/videoService';
import type { Video } from '@/types/video';
import type { PublicProfileSearchResult } from '@/services/profileService';

export interface IronssAiSearchResults {
  videos: Video[];
  users: PublicProfileSearchResult[];
}

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .toLowerCase();
}

const NON_SEARCH_WORDS = new Set([
  'a', 'an', 'and', 'for', 'in', 'of', 'the', 'to', 'video', 'videos', 'clip', 'clips', 'short',
  'shorts', 'videolari', 'videolar', 'videosu', 'videolarin', 'videolarini', 'editleri',
]);

export function getIronssAiSearchTerms(query: string): string[] {
  const tokens = query
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((term) => {
      const normalizedTerm = normalizeSearchText(term);
      return normalizedTerm.length >= 2 && !NON_SEARCH_WORDS.has(normalizedTerm);
    });

  return [...new Set(tokens.flatMap((term) => [term, normalizeSearchText(term)]))].slice(0, 5);
}

export async function searchIronssContent(query: string): Promise<IronssAiSearchResults> {
  const terms = getIronssAiSearchTerms(query);
  if (terms.length === 0) return { videos: [], users: [] };

  const [videos, users] = await Promise.all([
    searchPublicVideos(terms),
    searchPublicProfiles(terms),
  ]);
  return {
    videos: videos
      .map((video) => {
        const searchableText = normalizeSearchText(`${video.title} ${video.description} ${video.creator}`);
        const normalizedTerms = terms.map(normalizeSearchText);
        return {
          video,
          score: normalizedTerms.reduce((score, term) => score + Number(searchableText.includes(term)), 0),
        };
      })
      .sort((left, right) => right.score - left.score || right.video.views - left.video.views)
      .slice(0, 12)
      .map(({ video }) => video),
    users: users.slice(0, 12),
  };
}
