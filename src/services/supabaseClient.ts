import { createClient } from '@supabase/supabase-js';

// Pega tu URL exacta manteniendo las comillas simples
const supabaseUrl = 'https://mrybvqdebbgcayuvgkkr.supabase.co';

// Pega tu llave anon pública exacta manteniendo las comillas simples
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yeWJ2cWRlYmJnY2F5dXZna2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDU3MzksImV4cCI6MjEwNjQyMTczOX0.MFB5MmQz4ywpHfEstmf49cNoab107DUWGsFNbA3ESXM';

export const supabase = createClient(supabaseUrl, supabaseKey);