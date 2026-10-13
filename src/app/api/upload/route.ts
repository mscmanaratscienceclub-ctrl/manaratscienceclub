import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { getSupabase, AVATARS_BUCKET, supabasePublicUrl } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    trackEvent("file_upload_failed", { reason: "too_large" });
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  const allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif"];

  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(ext)) {
    trackEvent("file_upload_failed", { reason: "invalid_type" });
    return NextResponse.json(
      { error: "Invalid file type or extension. Allowed: PNG, JPG, JPEG, WebP, GIF" },
      { status: 400 },
    );
  }

  const fileName = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const client = getSupabase();
  if (!client) {
    trackEvent("file_upload_failed", { reason: "supabase_not_configured" });
    return NextResponse.json({ error: "Uploads are not configured" }, { status: 503 });
  }

  const { error: uploadError } = await client.storage
    .from(AVATARS_BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      // Uploads are content-addressed by UUID, so they never change in place —
      // let the edge hold them for a year instead of revalidating hourly.
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload: supabase_upload]", uploadError);
    trackEvent("file_upload_failed", { reason: "supabase_upload_failed" });
    // Don't leak Supabase/PostgreSQL error details to the client to prevent info leakage
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  // The bytes were just written to Supabase, so the URL must name Supabase.
  // `storagePublicUrl()` resolves to the CDN host whenever
  // NEXT_PUBLIC_MEDIA_BASE_URL is set, and that object does not exist yet —
  // nothing uploads to Tigris from here, so the response would 404.
  const publicUrl = supabasePublicUrl(AVATARS_BUCKET, fileName);


  return NextResponse.json({ url: publicUrl });
}
