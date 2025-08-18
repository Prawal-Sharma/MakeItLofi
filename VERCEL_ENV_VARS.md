# Vercel Environment Variables

Add these environment variables to your Vercel project settings:

## AWS Configuration
```
AWS_ACCESS_KEY_ID=<your-makeitlofi-admin-access-key>
AWS_SECRET_ACCESS_KEY=<your-makeitlofi-admin-secret-key>
SQS_QUEUE_URL=https://sqs.us-west-2.amazonaws.com/872515281428/makeitlofi-jobs
JOBS_TABLE=makeitlofi-jobs
```

## Texture URLs (Optional - hardcoded in Lambda)
```
TEXTURE_VINYL_URL=https://uubyhkv6ycz24k7p.public.blob.vercel-storage.com/textures/vinyl_crackle.wav
TEXTURE_TAPE_URL=https://uubyhkv6ycz24k7p.public.blob.vercel-storage.com/textures/tape_hiss.wav
TEXTURE_RAIN_URL=https://uubyhkv6ycz24k7p.public.blob.vercel-storage.com/textures/rain_ambient.wav
```

## Blob Token (Already set automatically)
The `BLOB_READ_WRITE_TOKEN` is automatically set by Vercel when you connect a Blob store.

## To add these:
1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. Add each variable above
5. Make sure they're enabled for Production, Preview, and Development environments