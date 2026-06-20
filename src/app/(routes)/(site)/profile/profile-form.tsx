"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";

const ProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(4, "Username must be at least 4 characters").max(10, "Username must be max 10 characters"),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  description: z.string().max(200, "Description max 200 characters").optional(),
});

type ProfileValues = z.infer<typeof ProfileSchema>;

export default function ProfileForm({ user }: { user: any }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: user.name || "",
      username: user.username || "",
      image: user.image || "",
      description: user.description || "",
    },
  });

  async function onSubmit(data: ProfileValues) {
    setIsPending(true);
    try {
      const response = await authClient.updateUser({
        name: data.name,
        image: data.image,
      });

      if (response.error) {
        toast.error(response.error.message);
      } else {
        // Update username using the username plugin
        const usernameResponse = await authClient.updateUser({
          username: data.username,
        } as any);

        // Update description using additional fields
        await authClient.updateUser({
          description: data.description,
        } as any);

        toast.success("Profile updated successfully");
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" disabled={isPending} {...field} />
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
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Picture URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/avatar.jpg" disabled={isPending} {...field} />
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
              <FormLabel>Bio / Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about yourself..." className="resize-none h-24" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="pt-4">
          <Button type="submit" disabled={isPending} className="bg-manara-teal hover:bg-manara-teal/90 text-white font-bold py-2 px-8 rounded-full shadow-subtle transition-all">
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
