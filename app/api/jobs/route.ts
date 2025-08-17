import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import fs from 'fs/promises'
import path from 'path'
import { addJob } from '@/lib/queue/jobQueue'
import { 
  isValidPreset, 
  isValidYouTubeUrl, 
  isValidAudioFile,
  isValidFileSize,
  isValidMimeType,
  sanitizePath,
  sanitizeErrorMessage 
} from '@/lib/utils/validation'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout for YouTube downloads

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const sourceType = formData.get('sourceType') as string
      const preset = formData.get('preset') as string || 'default'
      
      // Validate preset
      if (!isValidPreset(preset)) {
        return NextResponse.json(
          { error: 'Invalid preset selected' },
          { status: 400 }
        )
      }
      
      const jobId = nanoid()
      
      if (sourceType === 'upload') {
        const file = formData.get('file') as File
        
        if (!file) {
          return NextResponse.json(
            { error: 'No file provided' },
            { status: 400 }
          )
        }
        
        // Validate file size
        if (!isValidFileSize(file.size)) {
          return NextResponse.json(
            { error: 'File size must be less than 100MB' },
            { status: 400 }
          )
        }
        
        // Validate MIME type
        if (!isValidMimeType(file.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Please upload WAV, MP3, or FLAC' },
            { status: 400 }
          )
        }
        
        // Get file buffer and validate magic bytes
        const buffer = Buffer.from(await file.arrayBuffer())
        if (!isValidAudioFile(buffer)) {
          return NextResponse.json(
            { error: 'Invalid audio file format' },
            { status: 400 }
          )
        }
        
        // Sanitize filename and save
        const sanitizedName = sanitizePath(file.name)
        // Use /tmp for Vercel
        const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(process.cwd(), 'uploads')
        const filePath = path.join(uploadDir, `${jobId}_${sanitizedName}`)
        
        // Ensure upload directory exists
        await fs.mkdir(uploadDir, { recursive: true }).catch(() => {})
        
        // Write file with size limit enforced
        await fs.writeFile(filePath, buffer)
        
        // Add job to queue
        const bullJobId = await addJob({
          id: jobId,
          sourceType: 'upload',
          filePath,
          preset,
        })
        
        return NextResponse.json({ jobId: bullJobId })
      } else if (sourceType === 'youtube') {
        const sourceUrl = formData.get('sourceUrl') as string
        
        if (!sourceUrl) {
          return NextResponse.json(
            { error: 'No YouTube URL provided' },
            { status: 400 }
          )
        }
        
        // Validate YouTube URL
        if (!isValidYouTubeUrl(sourceUrl)) {
          return NextResponse.json(
            { error: 'Invalid YouTube URL' },
            { status: 400 }
          )
        }
        
        // Add job to queue
        const bullJobId = await addJob({
          id: jobId,
          sourceType: 'youtube',
          sourceUrl,
          preset,
        })
        
        return NextResponse.json({ jobId: bullJobId })
      }
    } else {
      // Handle JSON request
      const body = await request.json()
      const { source, preset = 'default' } = body
      
      // Validate preset
      if (!isValidPreset(preset)) {
        return NextResponse.json(
          { error: 'Invalid preset selected' },
          { status: 400 }
        )
      }
      
      const jobId = nanoid()
      
      if (!source) {
        return NextResponse.json(
          { error: 'No source provided' },
          { status: 400 }
        )
      }
      
      if (source.type === 'youtube') {
        // Validate YouTube URL
        if (!isValidYouTubeUrl(source.url)) {
          return NextResponse.json(
            { error: 'Invalid YouTube URL' },
            { status: 400 }
          )
        }
        
        const bullJobId = await addJob({
          id: jobId,
          sourceType: 'youtube',
          sourceUrl: source.url,
          preset,
        })
        
        return NextResponse.json({ jobId: bullJobId })
      } else {
        return NextResponse.json(
          { error: 'Invalid source type' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  } catch (error) {
    // Enhanced error logging
    console.error('Job creation error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}