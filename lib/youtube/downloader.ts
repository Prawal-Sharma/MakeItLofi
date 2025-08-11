import ytdl from 'ytdl-core'
import fs from 'fs'
import path from 'path'

export async function downloadYouTube(url: string, jobId: string): Promise<string> {
  try {
    // Validate URL
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL')
    }
    
    // Get video info
    const info = await ytdl.getInfo(url)
    
    // Create output path
    const uploadDir = path.join(process.cwd(), 'uploads')
    const outputPath = path.join(uploadDir, `${jobId}.mp3`)
    
    // Download audio stream
    return new Promise((resolve, reject) => {
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
      })
      
      const writeStream = fs.createWriteStream(outputPath)
      
      stream.pipe(writeStream)
      
      stream.on('error', (error) => {
        reject(new Error(`YouTube download failed: ${error.message}`))
      })
      
      writeStream.on('finish', () => {
        resolve(outputPath)
      })
      
      writeStream.on('error', (error) => {
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