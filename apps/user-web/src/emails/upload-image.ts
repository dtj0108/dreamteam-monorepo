/**
 * Upload email images to Supabase Storage
 *
 * Run: npx tsx apps/user-web/src/emails/upload-image.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gfxwgzanzcdvhnenansu.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmeHdnemFuemNkdmhuZW5hbnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc1MDE5OSwiZXhwIjoyMDgxMzI2MTk5fQ.Bu7PPnOgh4bG7Mcl5WN8O-7q-LdIE7m9Qa00oSWYnnE'

async function uploadImage() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const imagePath = '/Users/drewbaskin/dreamteam-monorepo-1/apps/user-web/public/emails/ai-sphere.png'
  const imageBuffer = fs.readFileSync(imagePath)

  console.log('📤 Uploading ai-sphere.png to Supabase Storage...')

  // Upload to a public bucket called 'email-assets'
  const { data, error } = await supabase.storage
    .from('email-assets')
    .upload('ai-sphere.png', imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) {
    // Try creating the bucket if it doesn't exist
    if (error.message.includes('not found')) {
      console.log('Creating email-assets bucket...')
      await supabase.storage.createBucket('email-assets', { public: true })

      const { data: retryData, error: retryError } = await supabase.storage
        .from('email-assets')
        .upload('ai-sphere.png', imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (retryError) {
        console.error('❌ Upload failed:', retryError)
        process.exit(1)
      }
    } else {
      console.error('❌ Upload failed:', error)
      process.exit(1)
    }
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('email-assets')
    .getPublicUrl('ai-sphere.png')

  console.log('✅ Upload successful!')
  console.log(`📍 Public URL: ${urlData.publicUrl}`)
  console.log('\nUpdate your email template with this URL!')
}

uploadImage()
