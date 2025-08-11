import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/queue/jobQueue'
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
    
    const job = await getJob(id)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    let status: 'pending' | 'processing' | 'completed' | 'failed'
    
    switch (job.status) {
      case 'waiting':
        status = 'pending'
        break
      case 'active':
        status = 'processing'
        break
      case 'completed':
        status = 'completed'
        break
      case 'failed':
        status = 'failed'
        break
      default:
        status = 'pending'
    }
    
    const response: any = {
      id: job.id,
      status,
      progress: job.progress || 0,
    }
    
    if (status === 'completed' && job.result) {
      response.output = {
        mp3Url: `/api/download/${id}/mp3`,
        wavUrl: `/api/download/${id}/wav`,
      }
    }
    
    if (status === 'failed') {
      // Sanitize the error message before sending to client
      response.error = sanitizeErrorMessage({ message: job.failedReason }) || 'Processing failed'
      console.error(`Job ${id} failed reason:`, job.failedReason)
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