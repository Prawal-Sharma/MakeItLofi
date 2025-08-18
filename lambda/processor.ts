import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import { nanoid } from 'nanoid'
import { downloadYouTube } from './youtube-downloader'
import { uploadToVercelBlob } from './vercel-blob'

// Set FFmpeg path for Lambda environment
const ffmpegPath = '/opt/bin/ffmpeg'
if (existsSync(ffmpegPath)) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

export interface ProcessJobData {
  id: string
  sourceType: 'youtube' | 'upload'
  sourceUrl?: string
  uploadKey?: string // S3 key for uploaded files
  preset: 'default' | 'tape90s' | 'sleep'
}

// Simplified preset - matching the main app
const lofiPreset = {
  tempo: 0.92,           // 8% slower
  pitch: 0.97,           // 3% lower
  lowpass: 9000,         // Cut highs
  highpass: 60,          // Remove rumble  
  bassBoost: 3,          // Warm bass
  compressionThreshold: 0.125,  // Linear threshold (~-18dB)
  compressionRatio: 3,   // Compression ratio
  reverb: 0.2,           // 20% reverb mix
  textureLevel: 0.8,     // 80% texture mix for prominent lo-fi feel
}

async function downloadFromVercelBlob(url: string, localPath: string): Promise<void> {
  // For Vercel Blob URLs, we can download directly
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  await fs.writeFile(localPath, Buffer.from(buffer))
}

async function downloadTextures(workDir: string): Promise<{ vinylPath?: string; tapePath?: string; rainPath?: string }> {
  // Download texture files from Vercel Blob or S3
  // For now, we'll skip textures in Lambda and focus on core processing
  // Textures can be added later by uploading them to S3/Blob
  return {}
}

async function checkVolume(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg(filePath)
      .audioFilters('volumedetect')
      .format('null')
      .on('end', (_stdout: any, stderr: any) => {
        const match = stderr?.match(/mean_volume: ([-\d.]+) dB/)
        if (match) {
          resolve(parseFloat(match[1]))
        } else {
          resolve(-91) // Assume silence if can't detect
        }
      })
      .on('error', () => {
        resolve(-91) // Assume silence on error
      })
      .output('-')
      .run()
  })
}

export async function processAudioJob(
  jobData: ProcessJobData,
  onProgress?: (progress: number) => void
): Promise<{ mp3Url: string; wavUrl: string }> {
  const workDir = '/tmp'
  const outputId = nanoid()
  const tempWavPath = path.join(workDir, `${outputId}_temp.wav`)
  const wavPath = path.join(workDir, `${outputId}.wav`)
  const mp3Path = path.join(workDir, `${outputId}.mp3`)
  
  let inputPath: string = ''
  
  try {
    // Get input file
    if (jobData.sourceType === 'youtube' && jobData.sourceUrl) {
      onProgress?.(10)
      inputPath = await downloadYouTube(jobData.sourceUrl, jobData.id, workDir)
      onProgress?.(30)
    } else if (jobData.uploadKey) {
      onProgress?.(10)
      inputPath = path.join(workDir, `${jobData.id}_input`)
      await downloadFromVercelBlob(jobData.uploadKey, inputPath)
      onProgress?.(30)
    } else {
      throw new Error('No input source provided')
    }
    
    // STEP 1: Process main audio with lo-fi effects (matching main app)
    console.log('Step 1: Processing main audio with lo-fi effects...')
    
    await new Promise<void>((resolve, reject) => {
      const audioFilters = [
        `atempo=${lofiPreset.tempo}`,
        `asetrate=44100*${lofiPreset.pitch},aresample=44100`,
        `highpass=f=${lofiPreset.highpass}`,
        `lowpass=f=${lofiPreset.lowpass}`,
        `bass=g=${lofiPreset.bassBoost}:f=100`,
        `aphaser=speed=0.5:decay=0.4`,  // Subtle phasing for tape warmth
        `vibrato=f=0.5:d=0.02`,  // Wow/flutter - tape speed variations
        `aecho=0.8:0.88:60:0.4`,  // Reverb for spacious vintage sound
        `stereotools=level_in=1:level_out=1:slev=0.7`,  // Narrow stereo field
        `acompressor=threshold=${lofiPreset.compressionThreshold}:ratio=${lofiPreset.compressionRatio}:attack=5:release=100`,
        `volume=2.0`  // Boost volume significantly
      ].join(',')
      
      ffmpeg(inputPath)
        .audioFilters(audioFilters)
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2)
        .output(tempWavPath)
        .on('start', (cmd) => {
          console.log('FFmpeg command:', cmd.substring(0, 500))
        })
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(30 + progress.percent * 0.3)
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('Main audio processing error:', err)
          reject(err)
        })
        .run()
    })
    
    // Check volume of processed audio
    const processedVolume = await checkVolume(tempWavPath)
    console.log(`Processed audio volume: ${processedVolume} dB`)
    
    // If too quiet, apply emergency boost
    if (processedVolume < -20) {
      console.log('Audio too quiet, applying emergency boost...')
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempWavPath)
          .audioFilters('volume=10.0')  // Massive boost
          .output(wavPath)
          .on('end', () => resolve())
          .on('error', reject)
          .run()
      })
      await fs.unlink(tempWavPath).catch(() => {})
    } else {
      // Just rename the file
      await fs.rename(tempWavPath, wavPath)
    }
    
    onProgress?.(70)
    
    // Convert to MP3
    console.log('Converting to MP3...')
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(wavPath)
        .audioCodec('libmp3lame')
        .audioBitrate('320k')
        .output(mp3Path)
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(70 + progress.percent * 0.2)
          }
        })
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })
    
    onProgress?.(90)
    
    // Upload to Vercel Blob
    console.log('Uploading to Vercel Blob...')
    
    const mp3Buffer = await fs.readFile(mp3Path)
    const wavBuffer = await fs.readFile(wavPath)
    
    const [mp3Url, wavUrl] = await Promise.all([
      uploadToVercelBlob(mp3Buffer, `${outputId}.mp3`, 'audio/mpeg'),
      uploadToVercelBlob(wavBuffer, `${outputId}.wav`, 'audio/wav')
    ])
    
    onProgress?.(100)
    
    // Cleanup temporary files
    await Promise.all([
      fs.unlink(inputPath).catch(() => {}),
      fs.unlink(wavPath).catch(() => {}),
      fs.unlink(mp3Path).catch(() => {}),
      fs.unlink(tempWavPath).catch(() => {})
    ])
    
    return { mp3Url, wavUrl }
  } catch (error) {
    // Cleanup on error
    await Promise.all([
      inputPath && fs.unlink(inputPath).catch(() => {}),
      fs.unlink(wavPath).catch(() => {}),
      fs.unlink(mp3Path).catch(() => {}),
      fs.unlink(tempWavPath).catch(() => {})
    ])
    
    throw error
  }
}