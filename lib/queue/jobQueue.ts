import Bull from 'bull'
import { processAudio } from '../audio/processor'
import Redis from 'ioredis'

let queue: Bull.Queue | null = null
let redis: Redis | null = null

export interface JobData {
  id: string
  sourceType: 'youtube' | 'upload'
  sourceUrl?: string
  filePath?: string
  preset: 'default' | 'tape90s' | 'sleep'
}

export interface JobResult {
  mp3Path: string
  wavPath: string
}

export function getQueue(): Bull.Queue {
  if (!queue) {
    const redisUrl = process.env.REDIS_URL
    
    if (redisUrl && redisUrl !== 'optional') {
      // Use Redis if URL is provided
      try {
        redis = new Redis(redisUrl)
        queue = new Bull('audio-processing', {
          createClient: () => redis!.duplicate(),
        })
        console.log('Using Redis for job queue')
      } catch (error) {
        console.warn('Redis connection failed, falling back to in-memory queue:', error)
        queue = new Bull('audio-processing')
      }
    } else {
      // In-memory queue for development and small deployments
      console.log('Using in-memory queue (Redis not configured)')
      queue = new Bull('audio-processing')
    }
    
    // Process jobs with error handling
    queue.process(async (job) => {
      console.log(`Processing job ${job.id}:`, {
        data: job.data,
        timestamp: new Date().toISOString()
      })
      
      try {
        const result = await processAudio(job.data, (progress) => {
          job.progress(progress)
        })
        
        console.log(`Job ${job.id} completed successfully`)
        return result
      } catch (error) {
        console.error(`Job ${job.id} failed:`, {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          data: job.data
        })
        throw error
      }
    })
    
    // Error handling
    queue.on('error', (error) => {
      console.error('Queue error:', error)
    })
    
    queue.on('failed', (job, error) => {
      console.error(`Job ${job.id} failed:`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        attempts: job.attemptsMade,
        data: job.data,
        timestamp: new Date().toISOString()
      })
    })
  }
  
  return queue
}

export async function addJob(data: JobData): Promise<string> {
  const queue = getQueue()
  const job = await queue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
  
  return job.id.toString()
}

export async function getJob(id: string) {
  const queue = getQueue()
  const job = await queue.getJob(id)
  
  if (!job) {
    return null
  }
  
  const state = await job.getState()
  const progress = job.progress()
  
  return {
    id: job.id,
    status: state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
  }
}

export async function cleanupOldJobs() {
  const queue = getQueue()
  const grace = 1000 * 60 * 60 // 1 hour
  
  await queue.clean(grace, 'completed')
  await queue.clean(grace, 'failed')
}

// Cleanup old files from filesystem
export async function cleanupOldFiles() {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  // Use appropriate directories based on environment
  const uploadsDir = process.env.NODE_ENV === 'production' 
    ? '/tmp' 
    : path.join(process.cwd(), 'uploads')
  const processedDir = process.env.NODE_ENV === 'production'
    ? '/tmp'
    : path.join(process.cwd(), 'processed')
  const maxAge = 1000 * 60 * 30 // 30 minutes for production
  
  const cleanDirectory = async (dir: string) => {
    try {
      const files = await fs.readdir(dir)
      const now = Date.now()
      
      for (const file of files) {
        if (file === '.gitkeep') continue
        
        const filePath = path.join(dir, file)
        const stats = await fs.stat(filePath)
        const age = now - stats.mtimeMs
        
        if (age > maxAge) {
          await fs.unlink(filePath).catch(() => {})
        }
      }
    } catch (error) {
      console.error(`Error cleaning directory ${dir}:`, error)
    }
  }
  
  await Promise.all([
    cleanDirectory(uploadsDir),
    cleanDirectory(processedDir)
  ])
}

// Schedule cleanup every hour
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(() => {
    cleanupOldJobs().catch(console.error)
    cleanupOldFiles().catch(console.error)
  }, 1000 * 60 * 60) // Every hour
}