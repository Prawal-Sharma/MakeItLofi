import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus } from '@/lib/aws/dynamodb'
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
    
    // Get job status from DynamoDB
    const job = await getJobStatus(id)
    
    if (!job || job.status !== 'completed' || !job.result) {
      return NextResponse.json(
        { error: 'File not found or job not completed' },
        { status: 404 }
      )
    }
    
    // Get the Blob URL based on format
    const blobUrl = format === 'mp3' ? job.result.mp3Url : job.result.wavUrl
    
    if (!blobUrl) {
      return NextResponse.json(
        { error: 'File URL not found' },
        { status: 404 }
      )
    }
    
    // Redirect to the Vercel Blob URL
    return NextResponse.redirect(blobUrl)
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}