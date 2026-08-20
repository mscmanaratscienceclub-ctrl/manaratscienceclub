"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";

const ProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(4, "Username must be at least 4 characters").max(10, "Username must be max 10 characters"),
  description: z.string().max(200, "Description max 200 characters").optional(),
});

type ProfileValues = z.infer<typeof ProfileSchema>;

export type ProfileUser = {
  name?: string | null;
  username?: string | null;
  description?: string | null;
  image?: string | null;
};

export default function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(user.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      description: user.description || "",
    },
  });

  async function compressImage(file: File): Promise<File> {
    const MAX_DIM = 800;
    const QUALITY = 0.8;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    let { width, height } = img;
    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    URL.revokeObjectURL(img.src);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob!], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        QUALITY,
      );
    });
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large (max 10MB)");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPG, JPEG, WebP, GIF");
      return;
    }

    const compressed = await compressImage(file);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return imagePreview || null;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", imageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setIsUploading(false);

    if (!res.ok) {
      toast.error(data.error || "Upload failed");
      return null;
    }

    return data.url;
  }

  async function onSubmit(data: ProfileValues) {
    setIsPending(true);

    const imageUrl = await uploadImage();
    if (imageFile && !imageUrl) {
      setIsPending(false);
      return;
    }

    try {
      const response = await authClient.updateUser({
        name: data.name,
        image: imageUrl,
      });

      if (response.error) {
        toast.error(response.error.message);
      } else {
        // "description" is a server-side additionalField (input: true) that the
        // auth client cannot infer, so the payload is cast to the known shape.
        await authClient.updateUser({
          username: data.username,
          description: data.description ?? "",
        } as Parameters<typeof authClient.updateUser>[0]);

        toast.success("Profile updated successfully");
        setImageFile(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            <div className="relative flex size-24 items-center justify-center overflow-hidden border border-dashed border-space-line-soft bg-space-deep">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile"
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <ImagePlus className="size-8 text-space-muted/60" />
              )}
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute -right-1 -top-1 flex size-6 items-center justify-center border border-space-amber/40 bg-space-deep text-space-amber transition-colors hover:border-space-amber"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleImageSelect}
              className="hidden"
              id="profile-image-input"
            />
            <label
              htmlFor="profile-image-input"
              className="msc-btn-ghost cursor-pointer"
            >
              <ImagePlus className="size-4" />
              {user.image ? "Change Photo" : "Upload Photo"}
            </label>
            <p className="mt-1.5 text-xs text-space-muted">PNG, JPG, WebP or GIF (max 5MB)</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="msc-label">Full Name</FormLabel>
              <FormControl>
                <input placeholder="John Doe" className="msc-input disabled:opacity-50" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="msc-label">Username</FormLabel>
              <FormControl>
                <input placeholder="johndoe" className="msc-input disabled:opacity-50" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="msc-label">Bio / Description</FormLabel>
              <FormControl>
                <textarea placeholder="Tell us about yourself..." className="msc-input h-24 resize-none disabled:opacity-50" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4">
          <button
            type="submit"
            disabled={isPending || isUploading}
            className="msc-btn-primary disabled:pointer-events-none disabled:opacity-60"
          >
            {isPending || isUploading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </Form>
  );
}
