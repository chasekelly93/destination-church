import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ptxloxbolbnwfnwurnpi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eGxveGJvbGJud2Zud3VybnBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjg5NjEsImV4cCI6MjA4NTY0NDk2MX0.Yg3n5ojdAG2MmYtgfXnacQRU2-iVpI1CgClG7U5DAv8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
