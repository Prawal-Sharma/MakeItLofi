import ytdl from 'ytdl-core'
import fs from 'fs'
import path from 'path'

export async function downloadYouTube(url: string, jobId: string): Promise<string> {
  try {
    // Validate URL
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL')
    }
    
    // Get video info with retry
    let info
    try {
      info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      })
    } catch (error: any) {
      if (error.message?.includes('age-restricted') || error.message?.includes('private video')) {
        throw new Error('This video is restricted or private and cannot be processed')
      }
      throw new Error(`Failed to get video info: ${error.message || 'Unknown error'}`)
    }
    
    // Use /tmp for Vercel
    const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'uploads')
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    const outputPath = path.join(uploadDir, `${jobId}.mp3`)
    
    // Download audio stream with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('YouTube download timeout - video may be too long'))
      }, 20000) // 20 second timeout
      
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      })
      
      const writeStream = fs.createWriteStream(outputPath)
      
      stream.pipe(writeStream)
      
      stream.on('error', (error) => {
        clearTimeout(timeout)
        reject(new Error(`YouTube download failed: ${error.message}`))
      })
      
      writeStream.on('finish', () => {
        clearTimeout(timeout)
        resolve(outputPath)
      })
      
      writeStream.on('error', (error) => {
        clearTimeout(timeout)
        reject(new Error(`File write failed: ${error.message}`))
      })
    })
  } catch (error) {
    throw new Error(`Failed to download YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getVideoInfo(url: string) {
  try {
    if (!ytdl.validateURL(url)) {
      return null
    }
    
    const info = await ytdl.getInfo(url)
    
    return {
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      author: info.videoDetails.author.name,
      thumbnail: info.videoDetails.thumbnails[0]?.url,
    }
  } catch (error) {
    console.error('Failed to get video info:', error)
    return null
  }
}