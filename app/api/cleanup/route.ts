import { NextRequest, NextResponse } from 'next/server'
import { list, del } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    // List all blobs
    const { blobs } = await list()
    
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000) // 1 hour in milliseconds
    let deletedCount = 0
    let freedSpace = 0
    
    // Delete blobs older than 1 hour that are input files (contain timestamp prefix)
    for (const blob of blobs) {
      // Check if it's an input file (has timestamp prefix like "1234567890123-filename")
      const match = blob.pathname.match(/\/(\d{13})-/)
      if (match) {
        const timestamp = parseInt(match[1])
        if (timestamp < oneHourAgo) {
          try {
            await del(blob.url)
            deletedCount++
            freedSpace += blob.size
            console.log(`Deleted old blob: ${blob.pathname}`)
          } catch (err) {
            console.error(`Failed to delete blob ${blob.pathname}:`, err)
          }
        }
      }
    }
    
    return NextResponse.json({
      message: `Cleanup completed. Deleted ${deletedCount} files, freed ${(freedSpace / 1024 / 1024).toFixed(2)}MB`,
      deletedCount,
      freedSpace
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}

// Also support GET for manual triggering
export async function GET(request: NextRequest) {
  return POST(request)
}