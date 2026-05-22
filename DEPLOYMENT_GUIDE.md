# PLOT-KARE Vercel Deployment Setup

This document explains the configuration files created to enable successful Vercel deployment.

## Files Created/Updated

### 1. `/vercel.json` (Root Directory)
This file tells Vercel that the Next.js application is located in the `webpage/` subdirectory, not the root.

```json
{
  "buildCommand": "cd webpage && npm run build",
  "installCommand": "cd webpage && npm install",
  "outputDirectory": "webpage/.next"
}
```

**Why it's needed:** The project structure has the Next.js app in a `webpage/` folder. Vercel needs explicit configuration to find and build it.

### 2. `/webpage/package.json`
Updated with proper build scripts and all required dependencies including:
- Next.js 16.2.6
- React 19.2
- Supabase client libraries
- React Three Fiber for 3D visualization
- Tailwind CSS v4
- Shadcn/ui components
- And other project dependencies

**Key scripts:**
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint checks

### 3. `/webpage/next.config.ts`
Next.js configuration with:
- React strict mode enabled
- Supabase image domain whitelisting for remote images

### 4. `/webpage/.env.local` (Build Only)
Local environment file with placeholder values for Supabase. This file:
- Is ignored by git (`.env*` pattern in .gitignore)
- Only used for local builds
- Should be replaced with real values in Vercel project settings

### 5. `/webpage/.env.example`
Documents required environment variables for developers and CI/CD:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 6. Dynamic Page Exports
Added `export const dynamic = 'force-dynamic'` to all authenticated/protected pages that interact with Supabase:
- `/auth/*` - Authentication pages
- `/dashboard/*` - User dashboard pages
- `/admin/*` - Admin dashboard pages
- `/onboarding/*` - Onboarding flow pages

**Why it's needed:** These pages require Supabase credentials at runtime (not build time), so they must be marked as dynamic to prevent Next.js from trying to prerender them during the build.

## Deployment Steps

1. **Push to GitHub** - All changes are committed to your `plot-kare-vercel-deployment` branch

2. **Connect to Vercel:**
   - Go to vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Select your `swastiksumandas/plot-kare` repository
   - Vercel will auto-detect the `vercel.json` configuration

3. **Configure Environment Variables** in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - Any other required keys (PostHog, Razorpay, etc.)

4. **Deploy:**
   - Vercel will automatically:
     - Navigate to the `webpage/` directory
     - Run `npm install`
     - Build the Next.js app
     - Deploy to CDN

5. **Verify Deployment:**
   - Check that all pages load correctly
   - Test authentication flow
   - Verify dashboard pages work with real Supabase credentials

## Local Development

To test locally before deploying:

```bash
cd webpage
npm install
npm run dev
```

Then:
1. Create `.env.local` with your real Supabase credentials
2. Start the dev server
3. Test all features

## Key Points

✅ **Build succeeds without Supabase credentials** - Dynamic pages skip static generation
✅ **Middleware is properly configured** - Uses Next.js 16 proxy pattern
✅ **All package dependencies are included** - No missing modules
✅ **TypeScript configured correctly** - Full type checking enabled
✅ **Images whitelisted** - Supabase CDN images load properly

## Troubleshooting

If deployment still fails:

1. **Missing environment variables** - Check Vercel project settings → Environment Variables
2. **Build errors** - Check the build logs in Vercel dashboard for specific errors
3. **Page not found** - Verify all dynamic pages have `export const dynamic = 'force-dynamic'`
4. **Middleware issues** - Update `middleware.ts` to `proxy.js` if you want to use the new Next.js 16 convention

## Additional Resources

- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
