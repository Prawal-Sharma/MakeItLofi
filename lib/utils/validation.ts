import path from 'path'
import ytdl from 'ytdl-core'

// Job ID validation - alphanumeric only
export function isValidJobId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 50
}

// Preset validation
export const VALID_PRESETS = ['default', 'tape90s', 'sleep'] as const
export type ValidPreset = typeof VALID_PRESETS[number]

export function isValidPreset(preset: string): preset is ValidPreset {
  return VALID_PRESETS.includes(preset as ValidPreset)
}

// File format validation
export const VALID_FORMATS = ['mp3', 'wav'] as const
export type ValidFormat = typeof VALID_FORMATS[number]

export function isValidFormat(format: string): format is ValidFormat {
  return VALID_FORMATS.includes(format as ValidFormat)
}

// YouTube URL validation
export function isValidYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    
    // Check for common YouTube domains
    const validDomains = [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'music.youtube.com',
      'm.youtube.com'
    ]
    
    if (!validDomains.includes(urlObj.hostname)) {
      return false
    }
    
    // Use ytdl-core's validation
    return ytdl.validateURL(url)
  } catch {
    return false
  }
}

// File type validation by magic bytes
export function isValidAudioFile(buffer: Buffer): boolean {
  // Check magic bytes for common audio formats
  const magicBytes = {
    // WAV
    wav: [0x52, 0x49, 0x46, 0x46], // RIFF
    // MP3
    mp3: [0xFF, 0xFB], // MP3 with ID3
    mp3Alt: [0x49, 0x44, 0x33], // ID3v2
    // FLAC
    flac: [0x66, 0x4C, 0x61, 0x43], // fLaC
  }
  
  // Check WAV
  if (buffer.length >= 4 && 
      buffer[0] === magicBytes.wav[0] &&
      buffer[1] === magicBytes.wav[1] &&
      buffer[2] === magicBytes.wav[2] &&
      buffer[3] === magicBytes.wav[3]) {
    return true
  }
  
  // Check MP3
  if (buffer.length >= 2 &&
      ((buffer[0] === magicBytes.mp3[0] && buffer[1] === magicBytes.mp3[1]) ||
       (buffer.length >= 3 && 
        buffer[0] === magicBytes.mp3Alt[0] && 
        buffer[1] === magicBytes.mp3Alt[1] && 
        buffer[2] === magicBytes.mp3Alt[2]))) {
    return true
  }
  
  // Check FLAC
  if (buffer.length >= 4 &&
      buffer[0] === magicBytes.flac[0] &&
      buffer[1] === magicBytes.flac[1] &&
      buffer[2] === magicBytes.flac[2] &&
      buffer[3] === magicBytes.flac[3]) {
    return true
  }
  
  return false
}

// Path sanitization
export function sanitizePath(filePath: string): string {
  // Remove any directory traversal attempts
  const sanitized = path.basename(filePath)
  
  // Remove any special characters except for allowed ones
  return sanitized.replace(/[^a-zA-Z0-9._-]/g, '')
}

// File size validation
export function isValidFileSize(sizeInBytes: number): boolean {
  const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  return sizeInBytes > 0 && sizeInBytes <= MAX_FILE_SIZE
}

// MIME type validation
const VALID_MIME_TYPES = [
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/flac',
  'audio/x-flac'
]

export function isValidMimeType(mimeType: string): boolean {
  return VALID_MIME_TYPES.includes(mimeType.toLowerCase())
}

// Sanitize error messages for client
export function sanitizeErrorMessage(error: unknown): string {
  // Never expose internal errors to client
  if (error instanceof Error) {
    // Check for known safe error messages
    const safeMessages: Record<string, string> = {
      'Invalid YouTube URL': 'Please provide a valid YouTube URL',
      'File too large': 'File size must be less than 100MB',
      'Invalid file type': 'Please upload a WAV, MP3, or FLAC file',
      'Processing failed': 'Audio processing failed. Please try again',
      'Job not found': 'Processing job not found',
      'Invalid format': 'Invalid audio format requested',
    }
    
    // Check if error message starts with any safe message
    for (const [key, value] of Object.entries(safeMessages)) {
      if (error.message.includes(key)) {
        return value
      }
    }
  }
  
  // Default safe error message
  return 'An error occurred. Please try again later.'
}