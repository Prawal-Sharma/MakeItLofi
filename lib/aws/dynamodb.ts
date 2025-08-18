import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.JOBS_TABLE || 'makeitlofi-jobs'

export interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: string
  updatedAt: string
  result?: {
    mp3Url: string
    wavUrl: string
  }
  error?: string
  jobData?: any
}

export async function createJobRecord(id: string, jobData: any): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      id,
      status: 'pending',
      progress: 0,
      jobData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }))
}

export async function getJobStatus(id: string): Promise<JobStatus | null> {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id }
    }))
    
    return response.Item as JobStatus | null
  } catch (error) {
    console.error('Error getting job status:', error)
    return null
  }
}