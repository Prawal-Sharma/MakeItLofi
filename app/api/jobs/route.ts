import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { put } from '@vercel/blob'
import { sendJobToQueue } from '@/lib/aws/sqs'
import { createJobRecord } from '@/lib/aws/dynamodb'
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
export const maxDuration = 30 // Reduced since we're just queuing jobs now

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
        
        // Upload to Vercel Blob for temporary storage
        const sanitizedName = sanitizePath(file.name)
        const blob = await put(`uploads/${jobId}_${sanitizedName}`, buffer, {
          access: 'public',
        })
        
        // Create job record in DynamoDB
        await createJobRecord(jobId, {
          sourceType: 'upload',
          uploadUrl: blob.url,
          preset,
          originalName: file.name
        })
        
        // Send job to SQS queue
        await sendJobToQueue({
          id: jobId,
          sourceType: 'upload',
          uploadKey: blob.url, // Lambda will download from this URL
          preset,
        })
        
        return NextResponse.json({ jobId })
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
        
        // Create job record in DynamoDB
        await createJobRecord(jobId, {
          sourceType: 'youtube',
          sourceUrl,
          preset
        })
        
        // Send job to SQS queue
        await sendJobToQueue({
          id: jobId,
          sourceType: 'youtube',
          sourceUrl,
          preset,
        })
        
        return NextResponse.json({ jobId })
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
        
        // Create job record in DynamoDB
        await createJobRecord(jobId, {
          sourceType: 'youtube',
          sourceUrl: source.url,
          preset
        })
        
        // Send job to SQS queue
        await sendJobToQueue({
          id: jobId,
          sourceType: 'youtube',
          sourceUrl: source.url,
          preset,
        })
        
        return NextResponse.json({ jobId })
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