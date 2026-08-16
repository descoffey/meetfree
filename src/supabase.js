import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://ycmiptlsoqaldzwxhphe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbWlwdGxzb3FhbGR6d3hocGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwOTI1OTEsImV4cCI6MjA4ODY2ODU5MX0.ToeyGRxd8ZBJCrwEuIbs8EKecsB-58q15T07ZKh_Cns'
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
  },
})
