import * as play from 'play-dl'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { initializePlayDl } from './init'

const execAsync = promisify(exec)

// Extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url)
    
    // Handle youtu.be format
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0]
    }
    
    // Handle youtube.com formats
    if (urlObj.hostname.includes('youtube.com')) {
      // Regular video URL or playlist
      if (urlObj.searchParams.get('v')) {
        return urlObj.searchParams.get('v')
      }
      
      // YouTube Shorts
      if (urlObj.pathname.includes('/shorts/')) {
        const match = urlObj.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/)
        return match ? match[1] : null
      }
      
      // YouTube Music
      if (urlObj.pathname.includes('/watch')) {
        return urlObj.searchParams.get('v')
      }
    }
    
    return null
  } catch {
    return null
  }
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.error(`Attempt ${i + 1} failed:`, error)
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

// Check if yt-dlp is available as fallback
async function isYtDlpAvailable(): Promise<boolean> {
  try {
    await execAsync('yt-dlp --version')
    return true
  } catch {
    return false
  }
}

// Download using yt-dlp as fallback
async function downloadWithYtDlp(url: string, outputPath: string): Promise<void> {
  console.log('Attempting download with yt-dlp fallback...')
  
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 60000 })
    console.log('yt-dlp output:', stdout)
    if (stderr) console.error('yt-dlp stderr:', stderr)
  } catch (error: any) {
    throw new Error(`yt-dlp download failed: ${error.message}`)
  }
}

export async function downloadYouTube(url: string, jobId: string): Promise<string> {
  try {
    // Initialize play-dl if needed
    await initializePlayDl()
    
    // Extract and validate video ID
    const videoId = extractVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL format')
    }
    
    // Reconstruct clean URL
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
    
    console.log(`Starting YouTube download for video ID: ${videoId}`)
    
    // Use /tmp for Vercel
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'uploads')
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    const outputPath = path.join(uploadDir, `${jobId}.mp3`)
    
    // Try play-dl first with retries
    try {
      await retryWithBackoff(async () => {
        // Validate URL with play-dl
        const validate = await play.yt_validate(cleanUrl)
        if (validate !== 'video') {
          throw new Error('Invalid YouTube URL or not a video')
        }
        
        // Get video info
        console.log('Fetching video info...')
        const info = await play.video_info(cleanUrl)
        
        if (!info || !info.video_details) {
          throw new Error('Could not fetch video information')
        }
        
        const details = info.video_details
        
        // Check video availability
        if (details.private) {
          throw new Error('This video is private and cannot be processed')
        }
        
        // Check for age restriction (property might be named differently)
        if ((details as any).age_restricted || (details as any).ageRestricted) {
          throw new Error('This video is age-restricted and cannot be processed')
        }
        
        // Check video duration (max 10 minutes for MVP)
        const duration = details.durationInSec
        if (duration && duration > 600) {
          throw new Error('Video is too long. Please use videos under 10 minutes')
        }
        
        console.log(`Video info retrieved: ${details.title} (${duration}s)`)
        
        // Get audio stream
        const stream = await play.stream(cleanUrl, {
          quality: 2 // 0 = highest, 1 = high, 2 = medium
        })
        
        if (!stream || !stream.stream) {
          throw new Error('Could not get audio stream')
        }
        
        // Download audio stream with timeout
        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('YouTube download timeout - video may be too long or connection is slow'))
          }, 60000) // 60 second timeout
          
          const writeStream = fs.createWriteStream(outputPath)
          let downloadedBytes = 0
          
          stream.stream.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            // Log progress every 1MB
            if (downloadedBytes % (1024 * 1024) < chunk.length) {
              console.log(`Downloaded: ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`)
            }
          })
          
          stream.stream.on('error', (error: Error) => {
            clearTimeout(timeout)
            console.error('Stream error:', error)
            reject(new Error(`YouTube stream failed: ${error.message}`))
          })
          
          writeStream.on('finish', () => {
            clearTimeout(timeout)
            console.log(`Download complete: ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`)
            resolve()
          })
          
          writeStream.on('error', (error: Error) => {
            clearTimeout(timeout)
            console.error('Write error:', error)
            reject(new Error(`File write failed: ${error.message}`))
          })
          
          stream.stream.pipe(writeStream)
        })
      })
      
      return outputPath
    } catch (playDlError) {
      console.error('play-dl failed:', playDlError)
      
      // Try yt-dlp as fallback if available
      if (await isYtDlpAvailable()) {
        try {
          await downloadWithYtDlp(cleanUrl, outputPath)
          if (fs.existsSync(outputPath)) {
            return outputPath
          }
        } catch (ytDlpError) {
          console.error('yt-dlp fallback also failed:', ytDlpError)
        }
      }
      
      // Throw original error if all methods fail
      throw playDlError
    }
  } catch (error) {
    console.error('YouTube download error:', error)
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('private')) {
        throw new Error('This video is private and cannot be processed')
      }
      if (error.message.includes('age-restricted')) {
        throw new Error('This video is age-restricted and cannot be processed')
      }
      if (error.message.includes('too long')) {
        throw new Error('Video is too long. Please use videos under 10 minutes')
      }
      if (error.message.includes('timeout')) {
        throw new Error('Download timed out. Please try a shorter video or check your connection')
      }
      if (error.message.includes('Status code: 410') || error.message.includes('unavailable')) {
        throw new Error('This video is no longer available')
      }
      if (error.message.includes('Status code: 403') || error.message.includes('forbidden')) {
        throw new Error('Access denied. The video may be region-restricted')
      }
      if (error.message.includes('Could not fetch')) {
        throw new Error('Could not access video. It may be restricted or deleted')
      }
    }
    
    throw new Error(`Failed to download YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getVideoInfo(url: string) {
  try {
    // Initialize play-dl if needed
    await initializePlayDl()
    
    // Extract and validate video ID
    const videoId = extractVideoId(url)
    if (!videoId) {
      return null
    }
    
    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
    
    // Validate URL with play-dl
    const validate = await play.yt_validate(cleanUrl)
    if (validate !== 'video') {
      return null
    }
    
    const info = await retryWithBackoff(async () => {
      return await play.video_info(cleanUrl)
    })
    
    if (!info || !info.video_details) {
      return null
    }
    
    const details = info.video_details
    const duration = details.durationInSec || 0
    
    return {
      title: details.title || 'Unknown',
      duration,
      author: details.channel?.name || 'Unknown',
      thumbnail: details.thumbnails?.[0]?.url,
      isValid: !details.private && !(details as any).age_restricted && !(details as any).ageRestricted && duration <= 600
    }
  } catch (error) {
    console.error('Failed to get video info:', error)
    return null
  }
}