import * as schema from "./schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const client = postgres(process.env.DATABASE_URL!, {
  max: 3,           // Limit pool size — Supabase free tier caps at 15 total
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });
