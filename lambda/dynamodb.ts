import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' })
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
}

export async function createJob(id: string, jobData: any): Promise<void> {
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
  const response = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id }
  }))
  
  return response.Item as JobStatus | null
}

export async function updateJobStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  result?: { mp3Url: string; wavUrl: string },
  error?: string
): Promise<void> {
  const updateExpression = [
    'SET #status = :status',
    '#progress = :progress',
    '#updatedAt = :updatedAt'
  ]
  
  const expressionAttributeNames: any = {
    '#status': 'status',
    '#progress': 'progress',
    '#updatedAt': 'updatedAt'
  }
  
  const expressionAttributeValues: any = {
    ':status': status,
    ':progress': progress,
    ':updatedAt': new Date().toISOString()
  }
  
  if (result) {
    updateExpression.push('#result = :result')
    expressionAttributeNames['#result'] = 'result'
    expressionAttributeValues[':result'] = result
  }
  
  if (error) {
    updateExpression.push('#error = :error')
    expressionAttributeNames['#error'] = 'error'
    expressionAttributeValues[':error'] = error
  }
  
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id },
    UpdateExpression: updateExpression.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }))
}