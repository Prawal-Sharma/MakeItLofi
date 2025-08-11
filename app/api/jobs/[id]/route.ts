import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/queue/jobQueue'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      response.error = job.failedReason || 'Processing failed'
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}