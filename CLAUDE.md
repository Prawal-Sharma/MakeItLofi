# Make It Lo-Fi - Development Guide

## Project Overview
Make It Lo-Fi is a web application that transforms audio from YouTube URLs or uploaded files into lo-fi versions using digital signal processing (DSP).

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Audio Processing**: FFmpeg with fluent-ffmpeg
- **Queue System**: Bull with Redis (in-memory for MVP)
- **Package Manager**: npm
- **Deployment Target**: Vercel/Railway

## Development Phases

### Phase 1: Foundation ✅
- Git repository initialization
- Project documentation
- Basic structure setup

### Phase 2: Core Backend ✅
- YouTube audio fetching (ytdl-core)
- Audio processing pipeline (FFmpeg DSP chain)
- Job queue implementation
- API endpoints

### Phase 3: Frontend ✅
- Landing page with input controls
- Preset selector
- Progress indicators with cassette animation
- Audio player & download
- Mobile responsive design

### Phase 4: Security & Performance ✅
- Fixed critical security vulnerabilities
- Path traversal protection
- Input validation and sanitization
- Memory optimization with streaming
- Resource cleanup and leak prevention

### Phase 5: Deployment ✅
- Vercel configuration ready
- Environment variables documented
- Production optimizations configured
- Domain setup guide for makeitlofi.com

## DSP Chain Specification (lofi_v1)

### Audio Transformations
1. **Tempo**: -5% to -12% reduction
2. **Pitch**: -1 to -3 semitones down
3. **EQ**: 
   - Low-pass filter ~10-12 kHz
   - Subtle warmth boost in low-mids
4. **Saturation**: Soft clipping/tape emulation
5. **Noise**: Vinyl/tape hiss bed
6. **Wow/Flutter**: Subtle pitch modulation
7. **Sidechain**: Light pumping effect
8. **Stereo**: Slightly narrowed field
9. **Reverb**: Short, dark reverb
10. **Limiter**: -1 dBTP ceiling

### Presets
- **Default**: Balanced lo-fi effect
- **Tape 90s**: Warmer, more saturation
- **Sleep**: Slower, dreamier, more reverb

## API Endpoints

```typescript
POST /api/jobs
Body: {
  source: {
    type: 'youtube' | 'upload',
    url?: string,
    file?: File
  },
  preset: 'default' | 'tape90s' | 'sleep'
}
Response: { jobId: string }

GET /api/jobs/:id
Response: {
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  output?: {
    mp3Url: string,
    wavUrl: string
  }
}

GET /api/download/:id/:format
Response: Audio file stream
```

## Commands

### Development
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Lint code
npm run typecheck  # TypeScript type checking
```

### Testing
```bash
# Test YouTube download
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"source": {"type": "youtube", "url": "VIDEO_URL"}, "preset": "default"}'

# Test file upload (use form-data)
```

## Key Development Guidelines

1. **Incremental Development**: Commit after each working feature
2. **Testing**: Test each component as it's built
3. **Error Handling**: Graceful failures with user-friendly messages
4. **Performance**: Optimize for quick processing and low memory usage
5. **Security**: Validate all inputs, sanitize URLs, limit file sizes

## FFmpeg DSP Command Example

```bash
ffmpeg -i input.wav \
  -af "atempo=0.93,asetrate=44100*0.98,highpass=f=30,lowpass=f=11000,\
       bass=g=3:f=200,treble=g=-2:f=5000,\
       aecho=0.8:0.9:40:0.4,\
       volume=0.95" \
  -ar 44100 \
  output.wav
```

## Environment Variables

```env
NODE_ENV=development
REDIS_URL=redis://localhost:6379
MAX_FILE_SIZE=100MB
YOUTUBE_DL_OPTIONS={"quality": "highestaudio"}
STORAGE_PATH=./uploads
OUTPUT_PATH=./processed
```

## File Structure

```
/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── lib/                   # Shared utilities
│   ├── audio/            # Audio processing
│   ├── youtube/          # YouTube downloader
│   └── queue/            # Job queue
├── public/               # Static assets
├── uploads/              # Temporary upload storage
├── processed/            # Processed audio storage
└── tests/                # Test files
```

## Testing Checklist

- [ ] YouTube URL processing works
- [ ] File upload (WAV/MP3/FLAC) works
- [ ] All presets apply correctly
- [ ] Progress updates in real-time
- [ ] Audio playback in browser works
- [ ] Download links work (MP3 & WAV)
- [ ] Error handling for invalid inputs
- [ ] Memory/storage cleanup after processing

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Redis/queue system ready
- [ ] Storage solution configured
- [ ] CORS settings proper
- [ ] Rate limiting implemented
- [ ] Error logging setup
- [ ] Performance monitoring

## Current Status (MVP Complete)

### ✅ Completed Features
- Full audio processing pipeline with FFmpeg
- YouTube URL support with ytdl-core
- File upload (WAV/MP3/FLAC) with validation
- Three lo-fi presets (Default, Tape 90s, Sleep)
- Real-time progress tracking with cassette animation
- Audio preview and download (MP3/WAV)
- Mobile responsive design
- Security hardening with input validation
- Memory optimization with streaming
- Deployment ready for Vercel

### 🚀 Ready for Deployment
1. Connect GitHub to Vercel
2. Set up Redis (Upstash recommended)
3. Configure environment variables
4. Deploy to makeitlofi.com

### 💡 Future Enhancements
- User accounts and saved presets
- Custom DSP parameter controls
- Batch processing
- Social sharing features
- API for developers
- Stem separation
- Real-time preview
- Premium features

## Notes

- MVP is production-ready with security fixes
- All critical vulnerabilities addressed
- Mobile-first responsive design
- Optimized for Vercel serverless
- Ready for makeitlofi.com deployment