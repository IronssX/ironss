import type { Video } from '@/types/video';

const BIG_BUCK_BUNNY_CLIP = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_5MB.mp4';
const JELLYFISH_CLIP = 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_5MB.mp4';
const SINTEL_CLIP = 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_5MB.mp4';
const SAMPLE_WITH_AUDIO_CLIP = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';

// Playback uses public H.264 MP4 test clips, not the footage shown in the thumbnails.
// Thumbnails are placeholder stock photos. None of this content is user-uploaded.
function placeholderNote(clipName: string): string {
  return `Sample video. Playback uses the public test clip ${clipName}; the thumbnail is a placeholder photo.`;
}

export const sampleVideos: Video[] = [
  {
    id: 'neon-nights-walk',
    title: 'Neon Nights: A Walk Through the City',
    creator: 'Blue Horizon Media',
    category: 'Travel',
    description: placeholderNote('Big Buck Bunny'),
    views: 1240000,
    likes: 62000,
    uploadedAt: '2026-10-24T18:00:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/18462155/pexels-photo-18462155.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: BIG_BUCK_BUNNY_CLIP,
  },
  {
    id: 'sunrise-over-peaks',
    title: 'Sunrise Over the Peaks',
    creator: 'Kite & Compass',
    category: 'Nature',
    description: placeholderNote('Jellyfish'),
    views: 386000,
    likes: 21400,
    uploadedAt: '2026-10-10T07:30:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/23848552/pexels-photo-23848552.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: JELLYFISH_CLIP,
  },
  {
    id: 'ocean-waves-above',
    title: 'Ocean Waves From Above',
    creator: 'Kite & Compass',
    category: 'Nature',
    description: placeholderNote('Sintel'),
    views: 912000,
    likes: 48300,
    uploadedAt: '2026-09-28T12:15:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/7502481/pexels-photo-7502481.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: SINTEL_CLIP,
  },
  {
    id: 'weeknight-pan-sauce',
    title: 'Weeknight Pan Sauce in 8 Minutes',
    creator: 'Pixel Pantry',
    category: 'Cooking',
    description: placeholderNote('Big Buck Bunny'),
    views: 254000,
    likes: 13900,
    uploadedAt: '2026-10-18T16:45:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/4253300/pexels-photo-4253300.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: BIG_BUCK_BUNNY_CLIP,
  },
  {
    id: 'mixing-a-beat',
    title: 'Studio Session: Mixing a Beat From Scratch',
    creator: 'Frequency Room',
    category: 'Music',
    description:
      'Sample video. Playback uses a public H.264 test clip with an AAC audio track; the thumbnail is a placeholder photo.',
    views: 602000,
    likes: 31200,
    uploadedAt: '2026-10-21T20:00:00Z',
    duration: '0:05',
    thumbnailUrl:
      'https://images.pexels.com/photos/5650531/pexels-photo-5650531.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: SAMPLE_WITH_AUDIO_CLIP,
  },
  {
    id: 'landing-page-in-10',
    title: 'Build a Landing Page in 10 Minutes',
    creator: 'Bytecraft Club',
    category: 'Coding',
    description: placeholderNote('Jellyfish'),
    views: 47000,
    likes: 2600,
    uploadedAt: '2026-10-26T09:00:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/5483077/pexels-photo-5483077.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: JELLYFISH_CLIP,
  },
  {
    id: 'skate-park-session',
    title: 'Skate Park Session: Street Lines',
    creator: 'Gridline Skate Co.',
    category: 'Sports',
    description: placeholderNote('Sintel'),
    views: 189000,
    likes: 9800,
    uploadedAt: '2026-10-02T14:20:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/5560314/pexels-photo-5560314.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: SINTEL_CLIP,
  },
  {
    id: 'canvas-timelapse',
    title: 'Painting on Canvas: Time-lapse',
    creator: 'Canvas Drift',
    category: 'Art',
    description: placeholderNote('Big Buck Bunny'),
    views: 73000,
    likes: 4100,
    uploadedAt: '2026-10-15T11:10:00Z',
    duration: '0:10',
    thumbnailUrl:
      'https://images.pexels.com/photos/7896648/pexels-photo-7896648.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    videoUrl: BIG_BUCK_BUNNY_CLIP,
  },
];
