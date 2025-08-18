import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

// Setup yt-dlp binary
function setupYtDlp(): string {
  const bundledYtDlp = path.join(__dirname, 'yt-dlp')
  const tmpYtDlp = '/tmp/yt-dlp'
  
  if (fs.existsSync(bundledYtDlp) && !fs.existsSync(tmpYtDlp)) {
    try {
      fs.copyFileSync(bundledYtDlp, tmpYtDlp)
      fs.chmodSync(tmpYtDlp, 0o755)
      console.log('Copied yt-dlp to /tmp')
    } catch (err) {
      console.error('Failed to copy yt-dlp:', err)
    }
  }
  
  return fs.existsSync(tmpYtDlp) ? tmpYtDlp : bundledYtDlp
}

export async function downloadYouTube(
  url: string,
  jobId: string,
  workDir: string = '/tmp'
): Promise<string> {
  const outputPath = path.join(workDir, `${jobId}.mp3`)
  
  // Setup yt-dlp
  const ytDlpPath = setupYtDlp()
  
  // Check if yt-dlp exists
  if (!fs.existsSync(ytDlpPath)) {
    throw new Error('yt-dlp binary not found')
  }
  
  const command = `${ytDlpPath} -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`
  
  console.log('Downloading YouTube audio with command:', command)
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minutes
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })
    
    console.log('yt-dlp output:', stdout)
    if (stderr) console.log('yt-dlp stderr:', stderr)
    
    // Verify file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('Download completed but file not found')
    }
    
    return outputPath
  } catch (error: any) {
    console.error('YouTube download error:', error)
    throw new Error(`YouTube download failed: ${error.message}`)
  }
}