# Inkwell - Deployment Guide

This guide covers deploying Inkwell to production on Vercel (recommended).

## Deployment on Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Inkwell blog platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-blog.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Select your GitHub repository
4. Configure project settings:
   - **Framework**: Next.js
   - **Root Directory**: ./
5. Add Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

6. Click **Deploy**

### Step 3: Configure Supabase

In Supabase Dashboard → **Authentication → URL Configuration**:

Set **Redirect URLs**:
```
https://your-domain.vercel.app/auth/signin
https://your-domain.vercel.app/auth/signup
https://your-domain.vercel.app
```

## Deployment on Other Platforms

### Netlify

1. Push to GitHub
2. Connect repository on [netlify.com](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables in Netlify dashboard
6. Deploy

### Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t inkwell .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  inkwell
```

## Pre-Deployment Checklist

- [ ] All environment variables set
- [ ] Supabase RLS policies configured
- [ ] Storage buckets public
- [ ] Database schema created
- [ ] Email auth enabled in Supabase
- [ ] Redirect URLs configured
- [ ] Build succeeds locally: `npm run build`
- [ ] No errors: `npm run lint`

## Production Best Practices

### Security

1. **Secrets Management**
   - Never commit `.env.local`
   - Use platform's secret management
   - Rotate keys regularly

2. **Database**
   - Enable all RLS policies
   - Regular backups
   - Monitor query performance

3. **Storage**
   - Enable CORS if needed
   - Set file size limits
   - Regular cleanup of unused files

### Performance

1. **Images**
   - Optimize before upload
   - Use thumbnails for previews
   - Lazy load images

2. **Database**
   - Add indexes (already done)
   - Monitor slow queries
   - Archive old data

3. **Caching**
   - Enable Vercel's automatic caching
   - Set appropriate cache headers
   - Cache static assets

### Monitoring

1. **Logs**
   - Monitor Vercel function logs
   - Check Supabase logs for errors
   - Set up alerts

2. **Metrics**
   - Monitor database query times
   - Check storage usage
   - Track user growth

3. **Errors**
   - Set up error tracking (Sentry)
   - Monitor 404s and redirects
   - Track failed auth attempts

## Environment Variables

### Required for Production

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional

```
# For error tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn

# For analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## Troubleshooting Deployment

### Build Fails

```bash
# Clear cache and rebuild
npm install
npm run build
```

### Auth Not Working

Check Supabase:
- URL Configuration → Redirect URLs correct?
- Authentication → Email disabled?
- API → Keys accessible?

### Images Not Loading

Check Supabase Storage:
- Buckets public?
- CORS enabled?
- File permissions?

### Database Slow

Check Supabase:
- Row Level Security causing issues?
- Missing indexes? (Check SETUP.md)
- Monitor query times

## Custom Domain

### On Vercel

1. Go to Project → Settings → Domains
2. Add your domain
3. Follow DNS configuration steps
4. Wait for DNS propagation (up to 48 hours)

### SSL Certificate

Vercel automatically provides Let's Encrypt certificates. Check `Domains` section for certificate status.

## Scaling

### If Growing Traffic

1. **Supabase**
   - Upgrade to higher tier
   - Enable read replicas
   - Monitor connection limits

2. **Vercel**
   - Check serverless function duration
   - Monitor bandwidth usage
   - Consider Pro plan

3. **Storage**
   - Archive old images
   - Implement CDN (Vercel includes one)
   - Monitor costs

## Backup & Recovery

### Supabase Backups

Enable in **Database → Backups**:
- Default: Daily backups (7-day retention)
- Pro plan: Hourly backups available

### Recovery

1. Go to **Database → Backups**
2. Select backup date
3. Click **Restore**
4. Verify data integrity

## Analytics & Monitoring

### View Metrics

**Vercel Dashboard:**
- Real-time requests
- Function duration
- Error rates
- Bandwidth usage

**Supabase Dashboard:**
- Query count
- Storage usage
- Auth sessions
- Database size

## Cost Management

### Typical Monthly Costs

- **Supabase**: $0-300 (free tier included, usage-based)
- **Vercel**: $0-20 (generous free tier)
- **Domain**: $10-15/year

### Tips to Reduce Costs

1. Archive old data regularly
2. Optimize image sizes
3. Use Supabase query caching
4. Monitor unused storage
5. Clean up failed requests

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Issues?** Check error logs in Vercel and Supabase dashboards.
