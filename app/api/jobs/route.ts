import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { addJob } from '@/lib/queue/jobQueue'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const sourceType = formData.get('sourceType') as string
      const preset = formData.get('preset') as string || 'default'
      const jobId = nanoid()
      
      if (sourceType === 'upload') {
        const file = formData.get('file') as File
        
        if (!file) {
          return NextResponse.json(
            { error: 'No file provided' },
            { status: 400 }
          )
        }
        
        // Save uploaded file
        const uploadDir = path.join(process.cwd(), 'uploads')
        const filePath = path.join(uploadDir, `${jobId}_${file.name}`)
        
        const buffer = Buffer.from(await file.arrayBuffer())
        await fs.writeFile(filePath, buffer)
        
        // Add job to queue
        await addJob({
          id: jobId,
          sourceType: 'upload',
          filePath,
          preset: preset as any,
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
        
        // Add job to queue
        await addJob({
          id: jobId,
          sourceType: 'youtube',
          sourceUrl,
          preset: preset as any,
        })
        
        return NextResponse.json({ jobId })
      }
    } else {
      // Handle JSON request
      const body = await request.json()
      const { source, preset = 'default' } = body
      const jobId = nanoid()
      
      if (!source) {
        return NextResponse.json(
          { error: 'No source provided' },
          { status: 400 }
        )
      }
      
      if (source.type === 'youtube') {
        await addJob({
          id: jobId,
          sourceType: 'youtube',
          sourceUrl: source.url,
          preset,
        })
      } else {
        return NextResponse.json(
          { error: 'Invalid source type' },
          { status: 400 }
        )
      }
      
      return NextResponse.json({ jobId })
    }
    
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Job creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}