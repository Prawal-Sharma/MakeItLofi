import { NextRequest, NextResponse } from 'next/server'
import { list, del } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    // List all blobs
    const { blobs } = await list()
    
    const now = Date.now()
    const fiveMinutesAgo = now - (5 * 60 * 1000) // 5 minutes in milliseconds
    let deletedCount = 0
    let freedSpace = 0
    let skippedCount = 0
    
    // Delete ALL upload files older than 5 minutes
    for (const blob of blobs) {
      // Skip texture files and samples
      if (blob.pathname.includes('/textures/') || blob.pathname.includes('/samples/')) {
        skippedCount++
        continue
      }
      
      // Delete all files in uploads/ folder that have timestamp prefix OR old upload- prefix
      if (blob.pathname.includes('/uploads/') || blob.pathname.includes('upload-')) {
        // Check if it has a timestamp prefix
        const timestampMatch = blob.pathname.match(/(\d{13})-/)
        let shouldDelete = false
        
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1])
          shouldDelete = timestamp < fiveMinutesAgo
        } else {
          // For old format files without timestamp, delete if they're in uploads folder
          shouldDelete = true
        }
        
        if (shouldDelete) {
          try {
            await del(blob.url)
            deletedCount++
            freedSpace += blob.size
            console.log(`Deleted blob: ${blob.pathname}`)
          } catch (err) {
            console.error(`Failed to delete blob ${blob.pathname}:`, err)
          }
        }
      }
      
      // Also delete processed files older than 1 hour to save space
      if (blob.pathname.includes('/processed/')) {
        // Get blob creation time (if available from the name or metadata)
        try {
          await del(blob.url)
          deletedCount++
          freedSpace += blob.size
          console.log(`Deleted old processed file: ${blob.pathname}`)
        } catch (err) {
          console.error(`Failed to delete processed blob ${blob.pathname}:`, err)
        }
      }
    }
    
    return NextResponse.json({
      message: `Cleanup completed. Deleted ${deletedCount} files, freed ${(freedSpace / 1024 / 1024).toFixed(2)}MB, skipped ${skippedCount} protected files`,
      deletedCount,
      freedSpace,
      skippedCount
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