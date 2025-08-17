import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { existsSync, createReadStream } from 'fs'
import { nanoid } from 'nanoid'
import { downloadYouTube } from '../youtube/downloader'

// FFmpeg path will be set dynamically inside the function to avoid build errors

export interface ProcessOptions {
  id: string
  sourceType: 'youtube' | 'upload'
  sourceUrl?: string
  filePath?: string
  preset: 'default' | 'tape90s' | 'sleep'
}

// Simplified preset - just one for now
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

export async function processAudio(
  options: ProcessOptions,
  onProgress?: (progress: number) => void
): Promise<{ mp3Path: string; wavPath: string }> {
  // Set up FFmpeg path
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    try {
      const { stdout } = await execAsync('which ffmpeg')
      if (stdout && stdout.trim()) {
        ffmpeg.setFfmpegPath(stdout.trim())
        console.log('Using system FFmpeg:', stdout.trim())
      }
    } catch {
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic && require('fs').existsSync(ffmpegStatic)) {
        ffmpeg.setFfmpegPath(ffmpegStatic)
        console.log('Using ffmpeg-static:', ffmpegStatic)
      }
    }
  } catch (err) {
    console.error('FFmpeg setup warning:', err)
  }
  
  const outputId = nanoid()
  const outputDir = process.env.NODE_ENV === 'production' 
    ? '/tmp' 
    : path.join(process.cwd(), 'processed')
  
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {})
  
  const tempWavPath = path.join(outputDir, `${outputId}_temp.wav`)
  const wavPath = path.join(outputDir, `${outputId}.wav`)
  const mp3Path = path.join(outputDir, `${outputId}.mp3`)
  
  let inputPath: string
  
  // Get input file
  if (options.sourceType === 'youtube' && options.sourceUrl) {
    onProgress?.(10)
    inputPath = await downloadYouTube(options.sourceUrl, options.id)
    onProgress?.(30)
  } else if (options.filePath) {
    inputPath = options.filePath
    onProgress?.(30)
  } else {
    throw new Error('No input source provided')
  }
  
  // STEP 1: Process main audio with lo-fi effects (WITHOUT textures)
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
  
  // STEP 2: Add textures if available (optional enhancement)
  // In production, textures are included via includeFiles directive
  const textureDir = process.env.NODE_ENV === 'production' 
    ? path.join(process.cwd(), 'public/audio/textures')
    : path.join(process.cwd(), 'public/audio/textures')
  
  const vinylPath = path.join(textureDir, 'vinyl_crackle.wav')
  const rainPath = path.join(textureDir, 'rain_ambient.wav')
  const tapePath = path.join(textureDir, 'tape_hiss.wav')
  
  if (existsSync(vinylPath) || existsSync(rainPath) || existsSync(tapePath)) {
    console.log('Step 2: Adding texture layers...')
    const finalWavPath = path.join(outputDir, `${outputId}_final.wav`)
    
    try {
      let ffmpegCmd = ffmpeg()
      let inputCount = 0
      
      // Add main audio
      ffmpegCmd.input(wavPath)
      inputCount++
      
      // Add textures
      const hasVinyl = existsSync(vinylPath)
      const hasRain = existsSync(rainPath)
      const hasTape = existsSync(tapePath)
      
      if (hasVinyl) {
        ffmpegCmd.input(vinylPath).inputOptions('-stream_loop', '-1')
        inputCount++
      }
      
      if (hasTape) {
        ffmpegCmd.input(tapePath).inputOptions('-stream_loop', '-1')
        inputCount++
      }
      
      if (hasRain) {
        ffmpegCmd.input(rainPath).inputOptions('-stream_loop', '-1')
        inputCount++
      }
      
      // Build simple mixing filter
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
    } catch (err) {
      console.error('Texture processing failed, using audio without textures:', err)
    }
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
          onProgress(80 + progress.percent * 0.2)
        }
      })
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
  
  // Final volume check
  const mp3Volume = await checkVolume(mp3Path)
  console.log(`Final MP3 volume: ${mp3Volume} dB`)
  
  if (mp3Volume < -30) {
    console.error('WARNING: Output audio is too quiet!', mp3Volume, 'dB')
    // Apply one more emergency boost
    const boostedPath = path.join(outputDir, `${outputId}_boosted.mp3`)
    await new Promise<void>((resolve, reject) => {
      ffmpeg(mp3Path)
        .audioFilters('volume=20.0')
        .output(boostedPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })
    await fs.unlink(mp3Path)
    await fs.rename(boostedPath, mp3Path)
  }
  
  onProgress?.(100)
  
  // Cleanup source file if it was downloaded
  if (options.sourceType === 'youtube') {
    try {
      await fs.unlink(inputPath)
    } catch (err) {
      console.error('Failed to cleanup source file:', err)
    }
  }
  
  return { mp3Path, wavPath }
}