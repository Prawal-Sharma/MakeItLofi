# Make It Lo-Fi 🎵

Transform any audio into authentic lo-fi with vintage textures and analog warmth. A web application that takes YouTube URLs or audio files and applies professional lo-fi processing using advanced DSP techniques and real texture samples.

## What is Make It Lo-Fi?

Make It Lo-Fi is a web-based audio processing tool that transforms modern, clean audio into nostalgic lo-fi tracks. It simulates the characteristics of vintage recording equipment, adding warmth, texture, and character that defines the lo-fi aesthetic. Perfect for content creators, musicians, or anyone who loves the cozy, nostalgic sound of lo-fi.

## Features

- 🎥 **YouTube Support**: Direct processing from YouTube URLs using yt-dlp
- 📁 **File Upload**: Support for WAV, MP3, and FLAC files (up to 50MB)
- 🎛️ **Professional DSP**: Authentic lo-fi processing with multiple audio effects
- 🎧 **Real Textures**: Actual vinyl crackle, tape hiss, and rain ambiance samples
- 📊 **Progress Tracking**: Real-time processing status with cassette animation
- 💾 **Dual Format Export**: Download in high-quality MP3 (320kbps) or WAV
- 🔊 **Loudness Normalization**: Consistent output volume using EBU R128 standard
- ⚡ **Fast Processing**: Optimized FFmpeg pipeline with streaming architecture

## Tech Stack

### Frontend
- **Next.js 15.1** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React 19** - UI components

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **FFmpeg 7.1** - Audio processing engine
- **fluent-ffmpeg** - FFmpeg Node.js wrapper
- **yt-dlp** - YouTube audio extraction
- **Bull Queue** - Job queue management
- **Redis** - Queue persistence (optional)

### Audio Processing
- **FFmpeg filters** - Complex audio filter chains
- **EBU R128** - Loudness normalization
- **Custom DSP chain** - Tempo, pitch, EQ, compression, effects

### Deployment
- **Vercel/Railway** - Serverless deployment ready
- **ffmpeg-static** - Bundled FFmpeg for production

## Architecture

### Processing Pipeline
```
Input (YouTube/File) → Job Queue → Audio Processing → Output (MP3/WAV)
                           ↓
                      Bull + Redis
                           ↓
                    FFmpeg DSP Chain
                           ↓
                    Texture Mixing
                           ↓
                 Loudness Normalization
```

### Job Queue System
- Bull queue for async processing
- Redis for production persistence
- In-memory fallback for development
- Automatic cleanup of old jobs/files

## Technical Audio Processing Details

### DSP Chain Implementation

Our lo-fi processing uses a sophisticated FFmpeg filter chain:

#### 1. **Core Audio Effects**
- **Tempo**: Slowed to 92% (8% reduction) for that lazy lo-fi feel
- **Pitch**: Shifted down to 97% (3% reduction) for warmth
- **EQ Filtering**:
  - High-pass at 60Hz (removes rumble)
  - Low-pass at 9kHz (cuts harsh highs)
  - Bass boost: +3dB at 100Hz
- **Compression**: 3:1 ratio at -18dB threshold
- **Stereo Narrowing**: 70% width for vintage mono-ish sound

#### 2. **Analog Simulation**
- **Tape Wow/Flutter**: Vibrato at 0.5Hz with 2% depth
- **Phase Effects**: Subtle phasing for tape warmth
- **Echo/Reverb**: 60ms delay with 40% mix for space

#### 3. **Texture Layers**
Three real audio texture files mixed in:
- **Vinyl Crackle** (vinyl_crackle.wav): 64% mix level
- **Tape Hiss** (tape_hiss.wav): 24% mix level  
- **Rain Ambient** (rain_ambient.wav): 80% mix level

#### 4. **Volume Management**
- **Input normalization**: 2x initial boost
- **Texture compensation**: Adjusted per source loudness
- **Final normalization**: EBU R128 at -16 LUFS
- **Emergency boost**: If output < -20dB

### FFmpeg Filter Chain (Simplified)
```javascript
// Main audio processing
atempo=0.92,
asetrate=44100*0.97,
highpass=f=60,
lowpass=f=9000,
bass=g=3:f=100,
aphaser=speed=0.5:decay=0.4,
vibrato=f=0.5:d=0.02,
aecho=0.8:0.88:60:0.4,
stereotools=slev=0.7,
acompressor=threshold=0.125:ratio=3

// Texture mixing (4 inputs)
[main][vinyl][tape][rain]amix=inputs=4:normalize=0,
loudnorm=I=-16:TP=-1.5:LRA=11
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- FFmpeg installed on your system
- Redis (optional for production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/make-it-lofi.git
cd make-it-lofi
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
REDIS_URL=redis://localhost:6379  # Optional
NODE_ENV=development
```

4. Add texture files to `public/audio/textures/`:
- vinyl_crackle.wav
- tape_hiss.wav  
- rain_ambient.wav

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Choose Input**: 
   - Paste a YouTube URL, or
   - Upload an audio file (WAV/MP3/FLAC)
2. **Process**: Click "Make it Lo-Fi"
3. **Wait**: Watch the cassette animation during processing
4. **Preview**: Listen to your lo-fi track
5. **Download**: Get MP3 or WAV format

## API Documentation

### Create Processing Job
```http
POST /api/jobs
Content-Type: multipart/form-data

sourceType: "youtube" | "upload"
sourceUrl: "https://youtube.com/watch?v=..." (if youtube)
file: <audio file> (if upload)
preset: "default"
```

Response:
```json
{
  "jobId": "123"
}
```

### Check Job Status
```http
GET /api/jobs/:jobId
```

Response:
```json
{
  "id": "123",
  "status": "completed",
  "progress": 100,
  "result": {
    "mp3Path": "/processed/...",
    "wavPath": "/processed/..."
  }
}
```

### Download Processed Audio
```http
GET /api/download/:jobId/mp3
GET /api/download/:jobId/wav
```

## Development

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Lint code
npm run typecheck  # TypeScript checking
```

## Security Features

- Path traversal protection
- Input validation and sanitization  
- File size limits (50MB)
- MIME type verification
- Secure file handling with cleanup
- Rate limiting ready

## Performance Optimizations

- Streaming file processing (no full file loading)
- Automatic cleanup of old files (30 min)
- Memory-efficient FFmpeg pipelines
- Job queue with retry logic
- Optimized texture looping

## Troubleshooting

### FFmpeg not found
Install FFmpeg on your system:
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- Windows: Download from ffmpeg.org

### Redis connection errors
The app works without Redis in development. For production, set `REDIS_URL` in environment variables.

### Silent or quiet output
The loudness normalization should handle this, but check:
- Input file isn't corrupted
- FFmpeg version is 4.0+
- Texture files are present

## Roadmap

### Completed ✅
- YouTube URL support
- File upload
- Real texture mixing
- Loudness normalization
- Progress tracking
- Security hardening

### Planned
- [ ] Multiple presets (Tape 90s, Sleep)
- [ ] User accounts and saved settings
- [ ] Batch processing
- [ ] Custom DSP parameter controls
- [ ] Playlist support
- [ ] Real-time preview
- [ ] API for developers
- [ ] Mobile app

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- FFmpeg team for the incredible audio processing library
- The lo-fi hip hop community for inspiration
- Sample texture creators
- All contributors and testers

## Technical Notes

This project showcases:
- Advanced FFmpeg filter chain usage
- Real-time audio processing in web apps
- Job queue architecture
- Streaming file handling
- Modern Next.js patterns

For developers interested in audio processing, check out `/lib/audio/processor-simple.ts` for the complete DSP implementation.

---

Built with ❤️ for the lo-fi community by [Prawal Sharma](https://github.com/Prawal-Sharma)