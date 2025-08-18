import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import { nanoid } from 'nanoid'
import { downloadYouTube } from './youtube-downloader'
import { uploadToVercelBlob } from './vercel-blob'

import { copyFileSync, chmodSync } from 'fs'

// Set FFmpeg path for Lambda environment
async function setupFfmpeg() {
  const bundledFfmpeg = path.join(__dirname, 'ffmpeg')
  const tmpFfmpeg = '/tmp/ffmpeg'
  
  if (existsSync(bundledFfmpeg) && !existsSync(tmpFfmpeg)) {
    try {
      copyFileSync(bundledFfmpeg, tmpFfmpeg)
      chmodSync(tmpFfmpeg, 0o755)
      console.log('Copied FFmpeg to /tmp')
    } catch (err) {
      console.error('Failed to copy FFmpeg:', err)
    }
  }
  
  // Use the FFmpeg in /tmp
  if (existsSync(tmpFfmpeg)) {
    ffmpeg.setFfmpegPath(tmpFfmpeg)
    console.log('Using FFmpeg at /tmp/ffmpeg')
    return true
  } else {
    console.error('FFmpeg not found!')
    return false
  }
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
  const textureUrls = {
    vinyl: 'https://uubyhkv6ycz24k7p.public.blob.vercel-storage.com/textures/vinyl_crackle.wav',
    tape: 'https://uubyhkv6ycz24k7p.public.blob.vercel-storage.com/textures/tape_hiss.wav',
    rain: 'https://uubyhkv6ycz24k7p.public.blob.vercel-storage.com/textures/rain_ambient.wav'
  }
  
  const paths: { vinylPath?: string; tapePath?: string; rainPath?: string } = {}
  
  try {
    // Download vinyl texture
    const vinylResponse = await fetch(textureUrls.vinyl)
    if (vinylResponse.ok) {
      const vinylBuffer = await vinylResponse.arrayBuffer()
      paths.vinylPath = path.join(workDir, 'vinyl_crackle.wav')
      await fs.writeFile(paths.vinylPath, Buffer.from(vinylBuffer))
      console.log('Downloaded vinyl texture')
    }
    
    // Download tape texture
    const tapeResponse = await fetch(textureUrls.tape)
    if (tapeResponse.ok) {
      const tapeBuffer = await tapeResponse.arrayBuffer()
      paths.tapePath = path.join(workDir, 'tape_hiss.wav')
      await fs.writeFile(paths.tapePath, Buffer.from(tapeBuffer))
      console.log('Downloaded tape texture')
    }
    
    // Download rain texture
    const rainResponse = await fetch(textureUrls.rain)
    if (rainResponse.ok) {
      const rainBuffer = await rainResponse.arrayBuffer()
      paths.rainPath = path.join(workDir, 'rain_ambient.wav')
      await fs.writeFile(paths.rainPath, Buffer.from(rainBuffer))
      console.log('Downloaded rain texture')
    }
  } catch (err) {
    console.error('Error downloading textures:', err)
    // Don't fail if textures can't be downloaded
  }
  
  return paths
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
  // Setup FFmpeg first
  const ffmpegReady = await setupFfmpeg()
  if (!ffmpegReady) {
    throw new Error('Failed to setup FFmpeg in Lambda environment')
  }
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
    
    onProgress?.(60)
    
    // STEP 2: Add textures for authentic lo-fi sound
    const textures = await downloadTextures(workDir)
    
    if (textures.vinylPath || textures.tapePath || textures.rainPath) {
      console.log('Step 2: Adding texture layers...')
      const finalWavPath = path.join(workDir, `${outputId}_final.wav`)
      
      try {
        let ffmpegCmd = ffmpeg()
        let inputCount = 0
        
        // Add main audio
        ffmpegCmd.input(wavPath)
        inputCount++
        
        // Add textures with looping
        if (textures.vinylPath && existsSync(textures.vinylPath)) {
          ffmpegCmd.input(textures.vinylPath).inputOptions('-stream_loop', '-1')
          inputCount++
        }
        
        if (textures.tapePath && existsSync(textures.tapePath)) {
          ffmpegCmd.input(textures.tapePath).inputOptions('-stream_loop', '-1')
          inputCount++
        }
        
        if (textures.rainPath && existsSync(textures.rainPath)) {
          ffmpegCmd.input(textures.rainPath).inputOptions('-stream_loop', '-1')
          inputCount++
        }
        
        // Build mixing filter based on number of inputs
        let filterComplex = ''
        if (inputCount === 2) {
          // Main + one texture
          filterComplex = `[0:a]volume=0.6[main];[1:a]volume=${lofiPreset.textureLevel}[tex];[main][tex]amix=inputs=2:duration=first:normalize=0[mixed];[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[out]`
        } else if (inputCount === 3) {
          // Main + two textures
          filterComplex = `[0:a]volume=0.5[main];[1:a]volume=${lofiPreset.textureLevel * 0.8}[tex1];[2:a]volume=${lofiPreset.textureLevel * 0.9}[tex2];[main][tex1][tex2]amix=inputs=3:duration=first:normalize=0[mixed];[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[out]`
        } else if (inputCount === 4) {
          // Main + all three textures (vinyl, tape, rain)
          filterComplex = `[0:a]volume=0.85[main];[1:a]volume=${lofiPreset.textureLevel * 1.0}[vinyl];[2:a]volume=${lofiPreset.textureLevel * 0.3}[tape];[3:a]volume=${lofiPreset.textureLevel * 1.5}[rain];[main][vinyl][tape][rain]amix=inputs=4:duration=first:normalize=0[mixed];[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[out]`
        }
        
        if (filterComplex) {
          await new Promise<void>((resolve, reject) => {
            ffmpegCmd
              .complexFilter(filterComplex)
              .outputOptions('-map', '[out]')
              .audioCodec('pcm_s16le')
              .output(finalWavPath)
              .on('start', (cmd) => {
                console.log('Texture mixing command:', cmd.substring(0, 500))
              })
              .on('end', () => resolve())
              .on('error', (err) => {
                console.error('Texture mixing error:', err)
                resolve() // Don't fail if textures fail
              })
              .run()
          })
          
          // Check if texture mixing worked
          if (existsSync(finalWavPath)) {
            const finalVolume = await checkVolume(finalWavPath)
            console.log(`Final audio volume with textures: ${finalVolume} dB`)
            
            if (finalVolume > -50) {
              // Replace with textured version
              await fs.unlink(wavPath)
              await fs.rename(finalWavPath, wavPath)
            } else {
              // Texture mixing failed, keep original
              await fs.unlink(finalWavPath).catch(() => {})
            }
          }
        }
      } catch (err) {
        console.error('Texture processing failed, using audio without textures:', err)
      }
    } else {
      console.log('No textures available, skipping texture layer')
    }
    
    onProgress?.(80)
    
    // STEP 3: Convert to MP3
    console.log('Step 3: Converting to MP3...')
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(wavPath)
        .audioCodec('libmp3lame')
        .audioBitrate('320k')
        .output(mp3Path)
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(80 + progress.percent * 0.15)
          }
        })
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })
    
    onProgress?.(95)
    
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