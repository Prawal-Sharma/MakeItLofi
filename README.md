# Make It Lo-Fi 🎵

Transform your audio into authentic lo-fi with vintage textures and analog warmth. A web application that takes audio files and applies professional lo-fi processing using advanced DSP techniques and real texture samples.

## What is Make It Lo-Fi?

Make It Lo-Fi is a web-based audio processing tool that transforms modern, clean audio into nostalgic lo-fi tracks. It simulates the characteristics of vintage recording equipment, adding warmth, texture, and character that defines the lo-fi aesthetic. Perfect for content creators, musicians, or anyone who loves the cozy, nostalgic sound of lo-fi.

## Features

- 📁 **File Upload**: Support for WAV, MP3, FLAC, M4A/AAC files (up to 500MB)
- 🎵 **Sample Audio**: Try it out with our built-in sample track
- 🎛️ **Three Presets**: Default, Tape 90s, and Sleep modes
- 📊 **Real-time Progress**: Live processing status with retro cassette animation
- 💾 **Dual Format Export**: Download in high-quality MP3 (320kbps) or WAV
- ⚡ **Serverless Processing**: AWS Lambda for scalable audio processing
- 🔒 **Secure**: Direct upload to cloud storage, bypassing size limitations

## Tech Stack

### Frontend
- **Next.js 15.1** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vercel Blob** - Direct file uploads

### Backend Infrastructure
- **AWS Lambda** - Serverless audio processing
- **AWS SQS** - Job queue management
- **AWS DynamoDB** - Job status tracking
- **Vercel** - Frontend hosting and API routes
- **FFmpeg** - Professional audio processing engine

### Audio Processing
- **FFmpeg filters** - Complex audio filter chains
- **Custom DSP chain** - Tempo, pitch, EQ, compression, effects
- **Real texture samples** - Vinyl, tape, and ambient sounds

## Architecture

### Processing Pipeline
```
File Upload → Vercel Blob → API → SQS Queue → Lambda → Processing → Output
                                       ↓
                                  DynamoDB
                                  (Job Status)
```

### Direct Upload Architecture (New!)
- Client uploads directly to Vercel Blob (supports 500MB files)
- Only blob URLs sent to API (bypasses 4.5MB function limit)
- Lambda downloads from blob for processing
- Processed files stored back in blob storage

## Lo-Fi Presets

### 🎧 Default
Balanced lo-fi effect with moderate processing

### 📼 Tape 90s
Warmer sound with more saturation, mimicking 90s cassette tapes

### 😴 Sleep
Slower, dreamier with more reverb for relaxation

## Technical Audio Processing Details

### DSP Chain Implementation

Our lo-fi processing uses sophisticated FFmpeg filter chains customized per preset:

#### Core Effects (All Presets)
- **Tempo Reduction**: 88-95% speed for that lazy feel
- **Pitch Shifting**: Down 1-3 semitones for warmth
- **EQ Filtering**: 
  - High-pass to remove rumble
  - Low-pass (8-12kHz) for vintage character
  - Mid-frequency adjustments for body
- **Compression**: Gentle dynamics control
- **Stereo Processing**: Narrowed field for vintage mono-ish sound

#### Texture Layers
Real audio textures mixed at different levels:
- **Vinyl Crackle**: Authentic record player sounds
- **Tape Hiss**: Analog tape characteristics
- **Rain Ambient**: Atmospheric background

#### Analog Simulation
- **Wow/Flutter**: Pitch instability of tape
- **Saturation**: Soft clipping for warmth
- **Echo/Reverb**: Spatial dimension
- **Sidechain Compression**: Subtle pumping effect

## Getting Started

### Live Demo
Visit [makeitlofi.com](https://makeitlofi.com) to try it instantly!

### Local Development

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

Required environment variables:
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
SQS_QUEUE_URL=your_queue_url
JOBS_TABLE=makeitlofi-jobs

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Choose Input**: 
   - Click "Browse Files" to select from your computer
   - Or click "Try Sample" to test with our demo track
   - Drag and drop also supported
2. **Select Preset**: Choose between Default, Tape 90s, or Sleep
3. **Process**: Click "Make it Lo-Fi"
4. **Wait**: Watch the cassette animation during processing
5. **Download**: Get your lo-fi track in MP3 or WAV format

## API Documentation

### Create Processing Job
```http
POST /api/jobs
Content-Type: application/json

{
  "blobUrl": "https://...",
  "fileName": "song.mp3",
  "preset": "default" | "tape90s" | "sleep"
}
```

### Check Job Status
```http
GET /api/jobs/:jobId
```

Response:
```json
{
  "id": "abc123",
  "status": "completed",
  "progress": 100,
  "output": {
    "mp3Url": "https://...",
    "wavUrl": "https://..."
  }
}
```

## AWS Lambda Deployment

The audio processing runs on AWS Lambda for scalability:

1. Navigate to lambda directory:
```bash
cd lambda
```

2. Build and package:
```bash
npm run build
npm run package
```

3. Deploy to AWS:
```bash
npm run deploy
```

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Lint code
npm run typecheck  # TypeScript checking
```

## Security Features

- ✅ Direct client-side uploads (no server bottleneck)
- ✅ Path traversal protection
- ✅ Input validation and sanitization
- ✅ File type verification
- ✅ Secure cloud storage
- ✅ Automatic file cleanup

## Performance Features

- ⚡ Serverless architecture (infinite scale)
- ⚡ Direct uploads (bypasses function limits)
- ⚡ Streaming processing (memory efficient)
- ⚡ SQS queue with retry logic
- ⚡ DynamoDB for fast status updates
- ⚡ CDN-served processed files

## File Size Limits

- **Maximum file size**: 500MB (Vercel Blob limit)
- **Recommended**: Under 100MB for faster processing
- **All common audio formats supported**: WAV, MP3, FLAC, M4A, AAC

## Troubleshooting

### Large files failing?
The app now supports files up to 500MB through direct upload. If you experience issues:
- Check your internet connection stability
- Try a smaller file first
- Ensure the file isn't corrupted

### Processing taking too long?
- Normal processing time: 30-60 seconds for a 3-minute song
- Longer files take proportionally more time
- Check the AWS Lambda logs if consistently slow

### No audio output?
- Verify the input file plays correctly
- Check browser console for errors
- Try a different audio format

## Deployment

### Frontend (Vercel)
The frontend auto-deploys from the main branch via Vercel's GitHub integration.

### Backend (AWS Lambda)
Lambda functions are deployed using the AWS CLI. Ensure your AWS credentials are configured.

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
- AWS for scalable serverless infrastructure
- Vercel for seamless deployment

---

Built with ❤️ for the lo-fi community by [Prawal Sharma](https://github.com/Prawal-Sharma)