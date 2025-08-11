import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import { nanoid } from 'nanoid'
import { downloadYouTube } from '../youtube/downloader'

export interface ProcessOptions {
  id: string
  sourceType: 'youtube' | 'upload'
  sourceUrl?: string
  filePath?: string
  preset: 'default' | 'tape90s' | 'sleep'
}

interface PresetConfig {
  tempo: number
  pitch: number
  lowpass: number
  highpass: number
  bassGain: number
  bassFreq: number
  trebleGain: number
  trebleFreq: number
  reverbMix: number
  reverbDelay: number
  saturation: number
  noiseLevel: number
}

const presets: Record<string, PresetConfig> = {
  default: {
    tempo: 0.93,
    pitch: 0.98,
    lowpass: 11000,
    highpass: 30,
    bassGain: 3,
    bassFreq: 200,
    trebleGain: -2,
    trebleFreq: 5000,
    reverbMix: 0.8,
    reverbDelay: 40,
    saturation: 0.95,
    noiseLevel: 0.02,
  },
  tape90s: {
    tempo: 0.91,
    pitch: 0.97,
    lowpass: 10000,
    highpass: 40,
    bassGain: 4,
    bassFreq: 250,
    trebleGain: -3,
    trebleFreq: 4500,
    reverbMix: 0.6,
    reverbDelay: 30,
    saturation: 1.2,
    noiseLevel: 0.03,
  },
  sleep: {
    tempo: 0.88,
    pitch: 0.95,
    lowpass: 9000,
    highpass: 20,
    bassGain: 2,
    bassFreq: 150,
    trebleGain: -4,
    trebleFreq: 4000,
    reverbMix: 1.2,
    reverbDelay: 60,
    saturation: 0.8,
    noiseLevel: 0.01,
  },
}

export async function processAudio(
  options: ProcessOptions,
  onProgress?: (progress: number) => void
): Promise<{ mp3Path: string; wavPath: string }> {
  const outputId = nanoid()
  const outputDir = path.join(process.cwd(), 'processed')
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
  
  // Build audio filter chain
  const audioFilters = [
    `atempo=${preset.tempo}`,
    `asetrate=44100*${preset.pitch}`,
    `highpass=f=${preset.highpass}`,
    `lowpass=f=${preset.lowpass}`,
    `bass=g=${preset.bassGain}:f=${preset.bassFreq}`,
    `treble=g=${preset.trebleGain}:f=${preset.trebleFreq}`,
    `aecho=${preset.reverbMix}:0.9:${preset.reverbDelay}:0.4`,
    `volume=${preset.saturation}`,
  ].join(',')
  
  // Process to WAV first
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters(audioFilters)
      .audioCodec('pcm_s16le')
      .audioFrequency(44100)
      .audioChannels(2)
      .output(wavPath)
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(30 + progress.percent * 0.35)
        }
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
  
  onProgress?.(70)
  
  // Convert to MP3
  await new Promise<void>((resolve, reject) => {
    ffmpeg(wavPath)
      .audioCodec('libmp3lame')
      .audioBitrate('320k')
      .output(mp3Path)
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(70 + progress.percent * 0.3)
        }
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
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