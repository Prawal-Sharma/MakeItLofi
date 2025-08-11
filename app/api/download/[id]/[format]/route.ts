import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/queue/jobQueue'
import { createReadStream, statSync } from 'fs'
import { access } from 'fs/promises'
import path from 'path'
import { isValidJobId, isValidFormat, sanitizeErrorMessage } from '@/lib/utils/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const { id, format } = await params
    
    // Validate job ID to prevent injection attacks
    if (!isValidJobId(id)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      )
    }
    
    // Validate format
    if (!isValidFormat(format)) {
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
    
    // Get the file path and ensure it's within the processed directory
    const processedDir = path.join(process.cwd(), 'processed')
    const filePath = format === 'mp3' ? job.result.mp3Path : job.result.wavPath
    
    // Critical: Resolve the path and ensure it's within the processed directory
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(processedDir)) {
      // Potential directory traversal attack
      console.error('Directory traversal attempt detected:', { id, format, filePath })
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      )
    }
    
    // Check if file exists and is readable
    try {
      await access(resolvedPath)
    } catch {
      return NextResponse.json(
        { error: 'Processed file not found' },
        { status: 404 }
      )
    }
    
    // Get file stats for headers
    const stats = statSync(resolvedPath)
    const filename = `lofi_${id}.${format}`
    
    // Create a readable stream instead of loading entire file into memory
    const stream = createReadStream(resolvedPath)
    
    // Convert Node.js stream to Web Stream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        stream.on('end', () => {
          controller.close()
        })
        stream.on('error', (error) => {
          controller.error(error)
        })
      },
      cancel() {
        stream.destroy()
      }
    })
    
    // Return streamed file with appropriate headers
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}