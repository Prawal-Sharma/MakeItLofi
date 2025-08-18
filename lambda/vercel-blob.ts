// Upload to Vercel Blob Storage
export async function uploadToVercelBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN
  
  if (!BLOB_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured')
  }
  
  const response = await fetch('https://blob.vercel-storage.com/upload', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${BLOB_TOKEN}`,
      'x-content-type': contentType,
      'x-filename': filename
    },
    body: buffer
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Vercel Blob upload failed: ${error}`)
  }
  
  const data = await response.json() as { url: string }
  return data.url
}