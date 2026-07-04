import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { supabase, AVATARS_BUCKET, getPublicImageUrl } from "@/lib/supabase";
import { captureException } from "@/lib/sentry-helpers";
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
  if (!allowedTypes.includes(file.type)) {
    trackEvent("file_upload_failed", { reason: "invalid_type" });
    return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, JPEG, WebP, GIF" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    captureException(uploadError, { route: "upload", step: "supabase_upload" });
    trackEvent("file_upload_failed", { reason: "supabase_upload_failed" });
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const publicUrl = getPublicImageUrl(AVATARS_BUCKET, fileName);

  return NextResponse.json({ url: publicUrl });
}
