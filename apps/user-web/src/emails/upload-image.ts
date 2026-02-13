/**
 * Upload email images to Supabase Storage
 *
 * Run: npx tsx apps/user-web/src/emails/upload-image.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function uploadImage() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const imagePath = process.argv[2] || './apps/user-web/public/emails/ai-sphere.png'
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`)
  }
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
