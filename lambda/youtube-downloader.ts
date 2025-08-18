import ytdl from '@distube/ytdl-core'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'
import { createWriteStream } from 'fs'

export async function downloadYouTube(
  url: string,
  jobId: string,
  workDir: string = '/tmp'
): Promise<string> {
  const tempPath = path.join(workDir, `${jobId}_temp.webm`)
  const outputPath = path.join(workDir, `${jobId}.mp3`)
  
  console.log('Downloading YouTube audio for URL:', url)
  
  try {
    // Validate URL
    if (!ytdl.validateURL(url)) {
      throw new Error('Invalid YouTube URL')
    }
    
    // Get video info
    const info = await ytdl.getInfo(url)
    console.log(`Downloading: ${info.videoDetails.title}`)
    
    // Download audio stream with anti-bot headers
    await new Promise<void>((resolve, reject) => {
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        }
      })
      
      const writeStream = createWriteStream(tempPath)
      
      stream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('finish', resolve)
      
      stream.pipe(writeStream)
    })
    
    console.log('Download complete, converting to MP3...')
    
    // Convert to MP3 using FFmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempPath)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .output(outputPath)
        .on('end', () => {
          // Clean up temp file
          fs.unlinkSync(tempPath)
          resolve()
        })
        .on('error', (err) => {
          // Clean up temp file on error
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath)
          }
          reject(err)
        })
        .run()
    })
    
    // Verify file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('Conversion completed but MP3 file not found')
    }
    
    console.log('YouTube audio successfully downloaded and converted to MP3')
    return outputPath
  } catch (error: any) {
    console.error('YouTube download error:', error)
    
    // Clean up any temp files
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    
    throw new Error(`YouTube download failed: ${error.message}`)
  }
}