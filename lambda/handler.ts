import { SQSEvent, Context } from 'aws-lambda'
import { processAudioJob } from './processor'
import { updateJobStatus } from './dynamodb'

export const handler = async (event: SQSEvent, context: Context) => {
  console.log('Lambda handler invoked with', event.Records.length, 'messages')
  
  const results = await Promise.allSettled(
    event.Records.map(async (record) => {
      const jobData = JSON.parse(record.body)
      console.log('Processing job:', jobData.id)
      
      try {
        // Update status to processing
        await updateJobStatus(jobData.id, 'processing', 0)
        
        // Process the audio
        const result = await processAudioJob(jobData, async (progress) => {
          await updateJobStatus(jobData.id, 'processing', progress)
        })
        
        // Update status to completed
        await updateJobStatus(jobData.id, 'completed', 100, result)
        
        console.log('Job completed:', jobData.id)
        return { jobId: jobData.id, status: 'success' }
      } catch (error) {
        console.error('Job failed:', jobData.id, error)
        
        // Update status to failed
        await updateJobStatus(jobData.id, 'failed', 0, undefined, error instanceof Error ? error.message : String(error))
        
        throw error // This will trigger SQS retry
      }
    })
  )
  
  // Check if any jobs failed
  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    console.error('Some jobs failed:', failures)
    // Return partial batch failure response for SQS
    return {
      batchItemFailures: failures.map((_, index) => ({
        itemIdentifier: event.Records[index].messageId
      }))
    }
  }
  
  return { statusCode: 200, body: 'All jobs processed successfully' }
}