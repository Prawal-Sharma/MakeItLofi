# Deployment Guide for Make It Lo-Fi

## Prerequisites

- Vercel account
- GitHub repository connected
- Redis instance (Upstash recommended)
- FFmpeg buildpack configured
- Domain (makeitlofi.com)

## Deployment Steps

### 1. Setup Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

### 2. Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

#### Required Variables

```env
NODE_ENV=production
REDIS_URL=redis://default:password@endpoint.upstash.io:port
MAX_FILE_SIZE=104857600
```

#### Optional Variables

```env
# Storage (for S3/R2)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=your_bucket

# Error Tracking
SENTRY_DSN=your_sentry_dsn

# Analytics
VERCEL_ANALYTICS_ID=your_id
```

### 3. Setup Redis (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy connection string to `REDIS_URL`
4. Enable eviction policy: `allkeys-lru`

### 4. Configure FFmpeg

Add FFmpeg buildpack in Vercel:

```json
{
  "functions": {
    "app/api/jobs/route.ts": {
      "includeFiles": "node_modules/ffmpeg-static/**"
    }
  }
}
```

Or use serverless FFmpeg layer:

```bash
npm install @ffmpeg-installer/ffmpeg
```

### 5. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy)
git push origin main
```

### 6. Domain Configuration

#### In Vercel Dashboard:

1. Go to Settings > Domains
2. Add domain: `makeitlofi.com`
3. Add www redirect: `www.makeitlofi.com`

#### DNS Configuration (at your registrar):

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 7. Post-Deployment Checklist

- [ ] Test YouTube URL processing
- [ ] Test file upload (all formats)
- [ ] Verify all presets work
- [ ] Check download links
- [ ] Test mobile responsiveness
- [ ] Monitor error logs
- [ ] Check Redis connection
- [ ] Verify cleanup jobs

## Production Optimizations

### 1. Enable Caching

```javascript
// In API routes
export const revalidate = 3600 // Cache for 1 hour
```

### 2. Setup CDN for Static Assets

Configure Vercel Edge Network:
- Automatic image optimization
- Static file caching
- Global CDN distribution

### 3. Database Optimization

```javascript
// Redis connection pooling
const redis = new Redis({
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000)
})
```

### 4. Rate Limiting

```javascript
// Install rate limiter
npm install express-rate-limit

// Configure limits
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute
})
```

## Monitoring

### 1. Vercel Analytics

- Enable in dashboard
- Monitor Core Web Vitals
- Track API performance

### 2. Error Tracking (Sentry)

```bash
npm install @sentry/nextjs

# Run setup wizard
npx @sentry/wizard@latest -i nextjs
```

### 3. Uptime Monitoring

- Use Vercel monitoring
- Or setup external service (UptimeRobot, Pingdom)

## Troubleshooting

### FFmpeg Not Found

```javascript
// Use ffmpeg-static
import ffmpegPath from 'ffmpeg-static'
ffmpeg.setFfmpegPath(ffmpegPath)
```

### Redis Connection Issues

```javascript
// Add connection retry logic
const redis = new Redis(process.env.REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) return null
    return Math.min(times * 200, 1000)
  }
})
```

### File Upload Limits

Vercel limits:
- Body size: 4.5MB (free), 5MB (pro)
- Function duration: 10s (free), 60s (pro)

Solutions:
- Use streaming uploads
- Implement chunked uploads
- Use presigned S3 URLs

### Memory Issues

```javascript
// Stream large files
const stream = fs.createReadStream(path)
return new Response(stream)
```

## Scaling Considerations

### When Traffic Grows:

1. **Upgrade Vercel Plan**
   - Pro: Higher limits, priority support
   - Enterprise: Custom limits

2. **Implement Queue System**
   - Use AWS SQS or Redis Bull
   - Separate processing workers

3. **Storage Solution**
   - Move to S3/Cloudflare R2
   - Implement CDN for processed files

4. **Database Scaling**
   - Upgrade Redis tier
   - Implement caching strategy

## Security Checklist

- [x] Input validation on all endpoints
- [x] File type verification
- [x] Path traversal protection
- [x] Rate limiting configured
- [x] CORS properly configured
- [x] Security headers set
- [x] Error messages sanitized
- [ ] API keys rotated regularly
- [ ] SSL/TLS enforced
- [ ] DDoS protection enabled

## Maintenance

### Regular Tasks:

- Monitor disk usage
- Check Redis memory
- Review error logs
- Update dependencies
- Rotate API keys

### Backup Strategy:

- Database: Redis persistence
- Files: S3 versioning
- Code: GitHub repository

## Support

For issues:
1. Check Vercel function logs
2. Review Redis metrics
3. Monitor error tracking
4. Check GitHub issues

## Cost Estimation

### Vercel (Pro Plan):
- $20/month base
- Includes 1TB bandwidth
- 100GB-hours functions

### Upstash Redis:
- Free tier: 10,000 requests/day
- Pay-as-you-go: $0.2 per 100K requests

### Total: ~$20-50/month for moderate traffic

---

Last updated: 2024
Domain: makeitlofi.com