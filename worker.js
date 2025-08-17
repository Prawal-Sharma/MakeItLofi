/**
 * Background worker for processing audio jobs
 * This runs separately from the web server to handle long-running tasks
 */

const Bull = require('bull')
const { processAudio } = require('./lib/audio/processor-simple')

// Initialize queue
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const queue = new Bull('audio-processing', redisUrl)

console.log('🎵 Audio processing worker started')
console.log(`📦 Connected to Redis: ${redisUrl}`)

// Configure queue settings
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '1', 10)
const maxJobsPerWorker = parseInt(process.env.MAX_JOBS_PER_WORKER || '10', 10)

// Process jobs
queue.process(concurrency, maxJobsPerWorker, async (job) => {
  console.log(`🎬 Processing job ${job.id}:`, {
    data: job.data,
    timestamp: new Date().toISOString()
  })
  
  try {
    // Update progress
    await job.progress(10)
    
    // Process the audio with full textures
    const result = await processAudio({
      ...job.data,
      onProgress: async (progress) => {
        await job.progress(progress)
      }
    })
    
    console.log(`✅ Job ${job.id} completed successfully`)
    return result
    
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, {
      error: error.message,
      stack: error.stack,
      data: job.data
    })
    throw error
  }
})

// Event handlers
queue.on('completed', (job, result) => {
  console.log(`✨ Job ${job.id} completed:`, {
    processingTime: Date.now() - job.timestamp,
    result: {
      mp3Path: result.mp3Path,
      wavPath: result.wavPath
    }
  })
})

queue.on('failed', (job, error) => {
  console.error(`💥 Job ${job.id} failed after ${job.attemptsMade} attempts:`, {
    error: error.message,
    data: job.data
  })
})

queue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled and will be retried`)
})

queue.on('error', (error) => {
  console.error('🚨 Queue error:', error)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down worker...')
  await queue.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down worker...')
  await queue.close()
  process.exit(0)
})

// Health check
setInterval(() => {
  queue.getJobCounts().then(counts => {
    console.log('📊 Queue status:', counts)
  })
}, 30000) // Every 30 seconds

console.log(`👷 Worker ready - processing up to ${concurrency} jobs concurrently`)