import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/queue/jobQueue'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const { id, format } = await params
    
    // Validate format
    if (format !== 'mp3' && format !== 'wav') {
      return NextResponse.json(
        { error: 'Invalid format. Use mp3 or wav' },
        { status: 400 }
      )
    }
    
    // Get job to find file paths
    const job = await getJob(id)
    
    if (!job || job.status !== 'completed' || !job.result) {
      return NextResponse.json(
        { error: 'File not found or job not completed' },
        { status: 404 }
      )
    }
    
    const filePath = format === 'mp3' ? job.result.mp3Path : job.result.wavPath
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Processed file not found' },
        { status: 404 }
      )
    }
    
    // Read file
    const file = fs.readFileSync(filePath)
    const filename = `lofi_${id}.${format}`
    
    // Return file with appropriate headers
    return new NextResponse(file, {
      headers: {
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': file.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}