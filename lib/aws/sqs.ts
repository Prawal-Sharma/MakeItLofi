import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const client = new SQSClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

const QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://sqs.us-west-2.amazonaws.com/872515281428/makeitlofi-jobs'

export interface JobMessage {
  id: string
  sourceType: 'youtube' | 'upload'
  sourceUrl?: string
  uploadKey?: string
  preset: 'default' | 'tape90s' | 'sleep'
}

export async function sendJobToQueue(jobData: JobMessage): Promise<void> {
  const command = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(jobData),
  })
  
  await client.send(command)
  console.log('Job sent to SQS:', jobData.id)
}