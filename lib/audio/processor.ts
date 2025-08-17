import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
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

interface PresetConfig {
  // Time & Pitch
  tempo: number
  pitch: number
  
  // EQ & Filtering
  lowpass: number
  highpass: number
  bassGain: number
  bassFreq: number
  trebleGain: number
  trebleFreq: number
  midGain: number
  midFreq: number
  
  // Tape/Vinyl Effects
  wowFlutterFreq: number  // Hz - speed of pitch wobble
  wowFlutterDepth: number // 0-1 - intensity of wobble
  noiseLevel: number      // 0-1 - amount of noise
  noiseType: 'vinyl' | 'tape' | 'digital'
  
  // Dynamics & Saturation
  saturation: number      // Soft clipping amount
  compressionRatio: number // Dynamic range compression
  compressionThreshold: number // dB
  
  // Space & Width
  reverbMix: number
  reverbDelay: number
  reverbDecay: number
  stereoWidth: number     // 0=mono, 1=full stereo
  
  // Digital Degradation
  bitDepth: number        // Bit crushing (16 = clean, 8 = crushed)
  sampleRateReduction: number // Factor to reduce sample rate
  
  // Phase & Modulation
  phaseShift: number      // Tape head misalignment simulation
  chorusDepth: number     // Subtle pitch modulation
}

// Simplified to ONE authentic lo-fi preset
const presets: Record<string, PresetConfig> = {
  // The perfect lo-fi sound with real textures
  default: {
    // Time & Pitch - noticeable slowdown for that lazy feel
    tempo: 0.88,          // 12% slower - more noticeable
    pitch: 0.96,          // 4% lower pitch - warmer tone
    
    // EQ - aggressive lo-fi filtering
    lowpass: 8000,        // Strong high cut for muffled sound
    highpass: 80,         // Remove low rumble
    bassGain: 4,          // Strong bass boost for warmth
    bassFreq: 200,        // Focus on low-mids
    trebleGain: -6,       // Heavy treble cut
    trebleFreq: 4000,     // Cut harsh frequencies
    midGain: 2,           // Boost mids for body
    midFreq: 600,         // Lower mid focus
    
    // Tape/Vinyl - prominent textures
    wowFlutterFreq: 0.7,      // More noticeable tape warble
    wowFlutterDepth: 0.008,   // 0.8% variation - more wobble
    noiseLevel: 0.4,          // 40% texture mix - very prominent!
    noiseType: 'vinyl',       // Using vinyl + rain layers
    
    // Dynamics - stronger tape compression
    saturation: 1.2,          // Add soft clipping
    compressionRatio: 4,      // Heavier compression
    compressionThreshold: -24, // Lower threshold
    
    // Space - more atmospheric
    reverbMix: 0.25,      // More noticeable reverb
    reverbDelay: 20,      // Longer pre-delay
    reverbDecay: 0.5,     // Longer decay
    stereoWidth: 0.65,    // More mono for vintage
    
    // Digital - add lo-fi degradation
    bitDepth: 12,         // Bit crushing for grit
    sampleRateReduction: 0.85, // Slight aliasing
    
    // Phase - minimal for stability
    phaseShift: 0,        // Disabled for now
    chorusDepth: 0,       // Disabled for now
  },
  
  // Keeping these commented for future use
  // tape90s: { ... },
  // sleep: { ... }
}

export async function processAudio(
  options: ProcessOptions,
  onProgress?: (progress: number) => void
): Promise<{ mp3Path: string; wavPath: string }> {
  // Set up FFmpeg path - use system ffmpeg if available, otherwise use ffmpeg-static
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    // Check if ffmpeg is available in the system
    try {
      const { stdout } = await execAsync('which ffmpeg')
      if (stdout && stdout.trim()) {
        ffmpeg.setFfmpegPath(stdout.trim())
        console.log('Using system FFmpeg:', stdout.trim())
      }
    } catch {
      // Try ffmpeg-static as fallback
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic && require('fs').existsSync(ffmpegStatic)) {
        ffmpeg.setFfmpegPath(ffmpegStatic)
        console.log('Using ffmpeg-static:', ffmpegStatic)
      }
    }
  } catch (err) {
    console.error('FFmpeg setup warning:', err)
    // Continue anyway - ffmpeg might be available in the PATH
  }
  
  const outputId = nanoid()
  // Use /tmp for Vercel compatibility
  const outputDir = process.env.NODE_ENV === 'production' 
    ? '/tmp' 
    : path.join(process.cwd(), 'processed')
  
  // Ensure directory exists
  await fs.mkdir(outputDir, { recursive: true }).catch(() => {})
  
  const mp3Path = path.join(outputDir, `${outputId}.mp3`)
  const wavPath = path.join(outputDir, `${outputId}.wav`)
  
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
  
  const preset = presets[options.preset] || presets.default
  
  // Use BOTH vinyl and rain for authentic lo-fi ambiance
  const textureFiles = {
    vinyl: path.join(process.cwd(), 'public/audio/textures/vinyl_crackle.wav'),
    rain: path.join(process.cwd(), 'public/audio/textures/rain_ambient.wav'),
    tape: path.join(process.cwd(), 'public/audio/textures/tape_hiss.wav'),
  }
  
  // We'll layer vinyl crackle AND rain for best effect
  const vinylFile = textureFiles.vinyl
  const rainFile = textureFiles.rain
  
  // Check if texture files exist
  const hasVinyl = existsSync(vinylFile)
  const hasRain = existsSync(rainFile)
  
  if (!hasVinyl || !hasRain) {
    console.warn(`Missing texture files - vinyl: ${hasVinyl}, rain: ${hasRain}`)
  }
  
  // Process to WAV with real texture files
  await new Promise<void>((resolve, reject) => {
    let ffmpegProcess: any = null
    const timeout = setTimeout(() => {
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL')
        reject(new Error('Processing timeout - took too long'))
      }
    }, 60000) // 60 second timeout for processing
    
    // Create FFmpeg command
    ffmpegProcess = ffmpeg()
    
    // Input 1: Main audio
    ffmpegProcess.input(inputPath)
    
    // Input 2 & 3: Texture files (vinyl and rain)
    const useTextures = preset.noiseLevel > 0 && (hasVinyl || hasRain)
    if (useTextures && hasVinyl) {
      ffmpegProcess
        .input(vinylFile)
        .inputOptions('-stream_loop', '-1') // Loop vinyl infinitely
    }
    if (useTextures && hasRain) {
      ffmpegProcess
        .input(rainFile)
        .inputOptions('-stream_loop', '-1') // Loop rain infinitely
    }
    
    // Build the complex filter chain
    const complexFilter = []
    
    if (useTextures) {
      // Build filter based on available textures
      let filterParts = []
      
      // Process main audio
      filterParts.push(
        `[0:a]atempo=${preset.tempo}`,
        `asetrate=44100*${preset.pitch},aresample=44100`,
        `vibrato=f=${preset.wowFlutterFreq}:d=${preset.wowFlutterDepth}`,
        `vibrato=f=3.5:d=0.002`,
        `highpass=f=${preset.highpass}`,
        `lowpass=f=${preset.lowpass}`,
        `equalizer=f=${preset.bassFreq}:t=o:w=1:g=${preset.bassGain}`,
        `equalizer=f=${preset.midFreq}:t=o:w=1.5:g=${preset.midGain}`,
        `equalizer=f=${preset.trebleFreq}:t=o:w=2:g=${preset.trebleGain}`,
        `acompressor=threshold=${preset.compressionThreshold}dB:ratio=${preset.compressionRatio}:attack=5:release=100:knee=2.5:makeup=6`,
        `acrusher=bits=${preset.bitDepth}:mix=0.3:mode=lin:dc=1:aa=1`,
        `stereotools=level_in=1:level_out=1:slev=${preset.stereoWidth}`,
        `asplit[dry][toReverb]`,
        `[toReverb]aecho=0.8:0.88:${preset.reverbDelay}|${preset.reverbDelay*2}:${preset.reverbDecay}|${preset.reverbDecay*0.7}[reverb]`,
        `[dry][reverb]amix=inputs=2:weights=${1-preset.reverbMix} ${preset.reverbMix}:normalize=0,volume=1.5[processed]`  // Combined filter with pre-boost
      )
      
      // Process textures based on what's available
      if (hasVinyl && hasRain) {
        // Both textures available - HEAVILY amplified for maximum prominence
        filterParts.push(
          // Vinyl crackle - much louder
          `[1:a]aloop=loop=-1:size=44100*20,volume=0.7[vinyl]`,
          // Rain ambient - VERY loud with EQ boost for rain frequencies
          `[2:a]aloop=loop=-1:size=44100*20,equalizer=f=4000:t=o:w=2:g=3,equalizer=f=6000:t=o:w=2:g=4,volume=0.8,stereotools=level_in=1:level_out=1:slev=1.2[rain]`,
          // Mix textures with rain favored
          `[vinyl][rain]amix=inputs=2:duration=longest:weights=0.8 1.2[textures]`,
          // Apply loudnorm to processed music then mix with textures and boost
          `[processed]loudnorm=I=-14:LRA=11:TP=-1:dual_mono=false[normalized]`,
          `[normalized][textures]amix=inputs=2:duration=first:weights=0.45 0.55,volume=2.0[out]`
        )
      } else if (hasVinyl) {
        // Only vinyl available - make it VERY prominent
        filterParts.push(
          `[1:a]aloop=loop=-1:size=44100*20,volume=0.7[texture]`,
          `[processed]loudnorm=I=-14:LRA=11:TP=-1:dual_mono=false[normalized]`,
          `[normalized][texture]amix=inputs=2:duration=first:weights=0.45 0.55,volume=2.0[out]`
        )
      } else if (hasRain) {
        // Only rain available - make it VERY prominent
        filterParts.push(
          `[1:a]aloop=loop=-1:size=44100*20,equalizer=f=4000:t=o:w=2:g=3,equalizer=f=6000:t=o:w=2:g=4,volume=0.8,stereotools=level_in=1:level_out=1:slev=1.2[texture]`,  // 80% volume + EQ + stereo
          `[processed]loudnorm=I=-14:LRA=11:TP=-1:dual_mono=false[normalized]`,
          `[normalized][texture]amix=inputs=2:duration=first:weights=0.45 0.55,volume=2.0[out]`  // Combined into single filter
        )
      }
      
      complexFilter.push(filterParts.join(','))
      
      ffmpegProcess
        .complexFilter(complexFilter)
        .outputOptions('-map', '[out]')
    } else {
      // Process without texture but with same lo-fi effects
      const audioFilters = [
        `atempo=${preset.tempo}`,
        `asetrate=44100*${preset.pitch},aresample=44100`,
        `vibrato=f=${preset.wowFlutterFreq}:d=${preset.wowFlutterDepth}`,
        `vibrato=f=3.5:d=0.002`,
        `highpass=f=${preset.highpass}`,
        `lowpass=f=${preset.lowpass}`,
        `equalizer=f=${preset.bassFreq}:t=o:w=1:g=${preset.bassGain}`,
        `equalizer=f=${preset.midFreq}:t=o:w=1.5:g=${preset.midGain}`,
        `equalizer=f=${preset.trebleFreq}:t=o:w=2:g=${preset.trebleGain}`,
        `acompressor=threshold=${preset.compressionThreshold}dB:ratio=${preset.compressionRatio}:attack=5:release=100:knee=2.5:makeup=6`,
        `acrusher=bits=${preset.bitDepth}:mix=0.3:mode=lin:dc=1:aa=1`,
        `stereotools=level_in=1:level_out=1:slev=${preset.stereoWidth}`,
        `aecho=0.8:0.88:${preset.reverbDelay}|${preset.reverbDelay*2}:${preset.reverbDecay}|${preset.reverbDecay*0.7},amix=inputs=1:weights=${1 - preset.reverbMix},volume=1.5,loudnorm=I=-14:LRA=11:TP=-1:dual_mono=false,volume=1.5`  // All connected in single chain
      ].join(',')
      
      ffmpegProcess.audioFilters(audioFilters)
    }
    
    ffmpegProcess
      .audioCodec('pcm_s16le')
      .audioFrequency(44100)
      .audioChannels(2)
      .output(wavPath)
      .on('progress', (progress: any) => {
        if (onProgress && progress.percent) {
          onProgress(30 + progress.percent * 0.35)
        }
      })
      .on('end', () => {
        clearTimeout(timeout)
        resolve()
      })
      .on('error', (err: any) => {
        clearTimeout(timeout)
        console.error('FFmpeg processing error:', err.message)
        reject(err)
      })
    
    ffmpegProcess.run()
  })
  
  onProgress?.(70)
  
  // Convert to MP3 with timeout and cleanup
  await new Promise<void>((resolve, reject) => {
    let ffmpegProcess: any = null
    const timeout = setTimeout(() => {
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL')
        reject(new Error('MP3 conversion timeout'))
      }
    }, 30000) // 30 second timeout for conversion
    
    ffmpegProcess = ffmpeg(wavPath)
      .audioCodec('libmp3lame')
      .audioBitrate('320k')
      .output(mp3Path)
      .on('progress', (progress: any) => {
        if (onProgress && progress.percent) {
          onProgress(70 + progress.percent * 0.3)
        }
      })
      .on('end', () => {
        clearTimeout(timeout)
        resolve()
      })
      .on('error', (err: any) => {
        clearTimeout(timeout)
        console.error('FFmpeg processing error:', err.message)
        reject(err)
      })
    
    ffmpegProcess.run()
  })
  
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