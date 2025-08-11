# Make It Lo-Fi 🎵

Transform any audio into nostalgic lo-fi vibes. Paste a YouTube URL or upload your audio file, and get a professionally processed lo-fi version in seconds.

## Features

- 🎥 **YouTube Support**: Paste any YouTube URL to convert
- 📁 **File Upload**: Support for WAV, MP3, and FLAC files
- 🎛️ **Presets**: Choose from curated lo-fi styles (Default, Tape 90s, Sleep)
- 🎧 **Preview**: Listen to your lo-fi creation before downloading
- 💾 **Download**: Get your processed audio in MP3 or WAV format
- ⚡ **Fast Processing**: Optimized DSP chain for quick results

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Audio Processing**: FFmpeg
- **Queue System**: Bull + Redis
- **Deployment**: Vercel/Railway ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- FFmpeg installed on your system
- Redis (optional for production)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Prawal-Sharma/MakeItLofi.git
cd MakeItLofi
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Input Source**: Either paste a YouTube URL or upload an audio file
2. **Select Preset**: Choose your preferred lo-fi style
3. **Process**: Click "Make it Lo-Fi" and watch the progress
4. **Enjoy**: Preview and download your lo-fi audio

## Presets

### Default
Balanced lo-fi effect with classic warmth and subtle tape characteristics

### Tape 90s
Warmer, more saturated sound reminiscent of 90s cassette tapes

### Sleep
Slower, dreamier atmosphere with enhanced reverb for relaxation

## API Documentation

### Create Job
```http
POST /api/jobs
Content-Type: application/json

{
  "source": {
    "type": "youtube",
    "url": "https://youtube.com/watch?v=..."
  },
  "preset": "default"
}
```

### Check Job Status
```http
GET /api/jobs/:jobId
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
npm run test       # Run tests
npm run typecheck  # TypeScript checking
```

## DSP Chain

The lo-fi processing applies these effects:
- Tempo reduction (-5% to -12%)
- Pitch shifting (-1 to -3 semitones)
- EQ filtering (Low-pass ~10-12 kHz)
- Tape saturation
- Vinyl/tape noise
- Wow & flutter
- Subtle sidechain compression
- Stereo field adjustment
- Dark reverb
- Limiting (-1 dBTP)

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Roadmap

- [ ] User accounts and saved presets
- [ ] Batch processing
- [ ] Custom DSP parameter controls
- [ ] Playlist support
- [ ] Real-time processing preview
- [ ] Mobile app

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- FFmpeg for audio processing capabilities
- The lo-fi community for inspiration
- All contributors and testers

---

Built with ❤️ for the lo-fi community