import express from 'express';
import cors from 'cors';
import { getVideoInfo } from './savetube.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const CREATOR = 'ansad ser';
const CREATOR_ALT = 'ansadser';

// Home
app.get('/', (req, res) => {
  res.json({
    status: true,
    message: 'YouTube Downloader API',
    creator: CREATOR,
    endpoints: {
      '/api/info?url=': 'Get video info + download links',
      '/api/download?url=': 'Get download link',
      '/api/audio?url=': 'Get audio (MP3) link',
    },
  });
});

// Health check (Koyeb uses this)
app.get('/health', (req, res) => {
  res.json({ status: true, uptime: process.uptime() });
});

// /api/info?url=
app.get('/api/info', async (req, res) => {
  const url = String(req.query.url ?? '').trim();
  if (!url) {
    return res
      .status(400)
      .json({ status: false, error: 'url parameter is required' });
  }

  try {
    const info = await getVideoInfo(url);
    res.json({ status: true, result: info });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// /api/download?url=&format=mp4&quality=720
app.get('/api/download', async (req, res) => {
  const url = String(req.query.url ?? '').trim();
  const format = String(req.query.format ?? 'mp4').toLowerCase();
  const quality = String(req.query.quality ?? '').toLowerCase();

  if (!url) {
    return res
      .status(400)
      .json({ status: false, error: 'url parameter is required' });
  }

  try {
    const info = await getVideoInfo(url);

    let item;

    if (format === 'mp3') {
      item = info.downloads.find((d) => d.format === 'mp3');
    } else {
      if (quality) {
        item = info.downloads.find(
          (d) =>
            d.format === 'mp4' && d.quality.toLowerCase() === quality
        );
      }
      if (!item) {
        item =
          info.downloads.find((d) => d.quality === '720p') ||
          info.downloads.find((d) => d.format === 'mp4');
      }
    }

    if (!item) {
      return res
        .status(404)
        .json({ status: false, error: 'No matching download found' });
    }

    res.json({
      status: 'success',
      download: item.url,
      creator: CREATOR,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// /api/audio?url=
app.get('/api/audio', async (req, res) => {
  const url = String(req.query.url ?? '').trim();
  if (!url) {
    return res
      .status(400)
      .json({ status: false, error: 'url parameter is required' });
  }

  try {
    const info = await getVideoInfo(url);
    const audio = info.downloads.find((d) => d.format === 'mp3');

    if (!audio) {
      return res
        .status(404)
        .json({ status: false, error: 'Audio not found' });
    }

    res.json({
      status: 'success',
      Audio_url: audio.url,
      creator: CREATOR_ALT,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ status: false, error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) {
    res
      .status(500)
      .json({ status: false, error: err.message || 'Internal error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎵 API running on port ${PORT}`);
});
