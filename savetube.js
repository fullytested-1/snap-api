// savetube.js
const UA =
  'Mozilla/5.0 (X11; Linux x86_64; rv:155.0) Gecko/20100101 Firefox/155.0';

const SAVETUBE_DOMAINS = [
  'https://cdn400.savetube.vip',
  'https://cdn401.savetube.vip',
  'https://cdn402.savetube.vip',
  'https://cdn403.savetube.vip',
];

const SAVETUBE_API = 'https://api.savetube.vip';

function headers(extra = {}) {
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'User-Agent': UA,
    Origin: 'https://savetube.vip',
    Referer: 'https://savetube.vip/',
    ...extra,
  };
}

/**
 * Extract YouTube video ID from any URL or raw ID
 */
export function extractVideoId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new Error('No URL provided');

  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  let value = raw;
  if (!/^[A-Za-z][A-Za-z0-9+.:]*:/.test(value)) {
    value = `https://${value}`;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid YouTube URL');
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';

  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    id = url.searchParams.get('v') || '';
    if (!id) {
      const parts = url.pathname.split('/').filter(Boolean);
      const prefixes = new Set(['embed', 'shorts', 'live', 'v']);
      if (parts.length >= 2 && prefixes.has(parts[0])) {
        id = String(parts[1] ?? '');
      }
    }
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error('Could not extract YouTube video ID');
  }
  return id;
}

/**
 * Fetch video metadata + download links
 */
export async function getVideoInfo(inputUrl) {
  const videoId = extractVideoId(inputUrl);

  // Try SaveTube metadata first
  let title = 'YouTube Video';
  let duration = 0;
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  try {
    const metaRes = await fetch(`${SAVETUBE_API}/v2/info`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta?.status === true && meta?.data) {
        title = meta.data.title || title;
        duration = meta.data.duration || duration;
        thumbnail = meta.data.thumbnail || thumbnail;
      }
    }
  } catch {
    // ignore — fallback to defaults
  }

  // Build download URLs (SaveTube CDN pattern)
  const slug = slugify(title);
  const base =
    SAVETUBE_DOMAINS[Math.floor(Math.random() * SAVETUBE_DOMAINS.length)];

  const videoQualities = [
    { label: '360p', code: '360' },
    { label: '1080p', code: '1080' },
    { label: '720p', code: '720' },
    { label: '480p', code: '480' },
    { label: '240p', code: '240' },
    { label: '144p', code: '144' },
  ];

  const downloads = videoQualities.map((q) => ({
    quality: q.label,
    format: 'mp4',
    url: `${base}/media/${videoId}/${slug}-${q.code}-ytshorts.savetube.me.mp4`,
  }));

  downloads.push({
    quality: 'Audio (128kbps)',
    format: 'mp3',
    url: `${base}/media/${videoId}/${slug}-128-ytshorts.savetube.me.mp3`,
  });

  return {
    title,
    videoId,
    duration,
    thumbnail,
    cached: true,
    downloads,
  };
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
      }
