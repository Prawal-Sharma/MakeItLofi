# Domain Setup Guide - makeitlofi.com

## Current Status
Your Vercel deployment is live but the domain needs DNS configuration.

## Step-by-Step Domain Configuration

### 1. Update GoDaddy DNS Records

Go to your GoDaddy DNS management page for makeitlofi.com and:

#### Remove Existing Records:
- Delete the A record: @ → WebsiteBuilder Site

#### Add New Records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | 1 Hour |
| CNAME | www | cname.vercel-dns.com | 1 Hour |

### 2. Wait for DNS Propagation
- Usually takes 5-30 minutes
- Can take up to 48 hours in rare cases
- Check status at: https://www.whatsmydns.net/#A/makeitlofi.com

### 3. Verify in Vercel
Once DNS updates:
1. Go to your Vercel project settings
2. Navigate to Domains
3. Both makeitlofi.com and www.makeitlofi.com should show green checkmarks
4. The "Invalid Configuration" warning will disappear

### 4. Configure Environment Variables in Vercel

Go to Settings → Environment Variables and add:

```env
NODE_ENV=production
REDIS_URL=optional
MAX_FILE_SIZE=104857600
YOUTUBE_QUALITY=highestaudio
ENABLE_CLEANUP=true
CLEANUP_INTERVAL=3600000
```

**Note:** We're using `REDIS_URL=optional` to use in-memory queue. This works fine for small-scale usage!

### 5. Redeploy After Environment Variables
1. Go to Deployments tab
2. Click the three dots on latest deployment
3. Select "Redeploy"

## Verifying Everything Works

### Check DNS:
```bash
nslookup makeitlofi.com
# Should return: 76.76.21.21

nslookup www.makeitlofi.com  
# Should return: cname.vercel-dns.com
```

### Test Your Site:
- https://makeitlofi.com - Should load
- https://www.makeitlofi.com - Should redirect to main domain
- Upload a small audio file
- Try a YouTube URL

## Troubleshooting

### "Invalid Configuration" persists after DNS update:
- Clear your browser cache
- Try in incognito mode
- Wait a bit longer for propagation
- Verify DNS records are exactly as shown above

### Site loads but processing fails:
- Check Vercel function logs
- Ensure environment variables are set
- Verify FFmpeg is working (check logs)

### Analytics not showing data:
- Analytics start collecting after first deploy with package
- Takes a few minutes for first data to appear
- Check Analytics tab in Vercel dashboard

## Quick Reference

### Your Deployments:
- Production URL: https://make-it-lofi.vercel.app (current)
- Custom Domain: https://makeitlofi.com (after DNS setup)

### Vercel Dashboard:
- Project: https://vercel.com/prawals-projects/make-it-lofi
- Analytics: https://vercel.com/prawals-projects/make-it-lofi/analytics
- Logs: https://vercel.com/prawals-projects/make-it-lofi/logs

## Next Steps After Domain Works

1. **Monitor Analytics**: Check visitor data in Vercel Analytics tab
2. **Watch Logs**: Monitor for any errors in Functions logs
3. **Test Features**: 
   - YouTube URL processing
   - File uploads
   - All three presets
   - Download functionality

## Optional: Upgrade to Redis Later

When you get more traffic, you can add Redis:
1. Sign up for Upstash (free tier available)
2. Create a Redis database
3. Update REDIS_URL in Vercel with actual connection string
4. Redeploy

---

**Support**: If you have issues, check:
- Vercel Status: https://www.vercel-status.com/
- GoDaddy Support: DNS changes can take time
- Function Logs: In Vercel dashboard → Functions tab