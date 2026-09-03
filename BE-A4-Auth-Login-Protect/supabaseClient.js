// Initializes the Supabase client from environment variables.
// Uses the anon key only - never the service_role key here.
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_KEY environment variables. Check your .env file."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
