import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus } from '@/lib/aws/dynamodb'
import { isValidJobId, sanitizeErrorMessage } from '@/lib/utils/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validate job ID
    if (!isValidJobId(id)) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      )
    }
    
    // Query DynamoDB for job status
    const job = await getJobStatus(id)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    const response: any = {
      id: job.id,
      status: job.status,
      progress: job.progress || 0,
    }
    
    if (job.status === 'completed' && job.result) {
      // Return the Vercel Blob URLs directly
      response.output = {
        mp3Url: job.result.mp3Url,
        wavUrl: job.result.wavUrl,
      }
    }
    
    if (job.status === 'failed') {
      // Sanitize the error message before sending to client
      response.error = sanitizeErrorMessage({ message: job.error }) || 'Processing failed'
      console.error(`Job ${id} failed reason:`, job.error)
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching job:', {
      jobId: (await params).id,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    )
  }
}