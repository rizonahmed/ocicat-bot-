import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", url);
console.log("KEY EXISTS:", !!key);

export const supabase = createClient(
  url || "https://example.com",
  key || "dummy"
);