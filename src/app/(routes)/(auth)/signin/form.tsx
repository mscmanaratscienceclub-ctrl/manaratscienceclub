"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SignInSchema, SignInValues } from "./validate";
import InputStartIcon from "../components/input-start-icon";
import InputPasswordContainer from "../components/input-password";
import { cn } from "@/lib/utils";
import { AtSign, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function SignInForm({ redirect }: { redirect?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: SignInValues) {
    startTransition(async () => {
      const response = await signIn.username(data);

      if (response.error) {
        toast.error(response.error.message);
      } else {
        // TODO: call identifyUser(...) once we confirm the Better Auth response
        // shape exposes the user id. The next page load calls getServerSession
        // which sets the Sentry user, so PostHog identity will eventually be
        // attached via the server-side setSentryUser flow.
        trackEvent("user_signed_in", { method: "password" });
        router.push(redirect || "/");
      }
    });
  }

  const getInputClassName = (fieldName: keyof SignInValues) =>
    cn(
      form.formState.errors[fieldName] &&
        "border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20",
    );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="z-50 my-8 flex w-full flex-col gap-5"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputStartIcon icon={AtSign}>
                  <Input
                    placeholder="Username"
                    className={cn("peer ps-9", getInputClassName("username"))}
                    disabled={isPending}
                    {...field}
                  />
                </InputStartIcon>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputPasswordContainer>
                  <Input
                    id="input-23"
                    className={cn("pe-9", getInputClassName("password"))}
                    placeholder="Password"
                    disabled={isPending}
                    {...field}
                  />
                </InputPasswordContainer>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="mt-5 w-full rounded-full bg-manara-teal font-display text-sm font-bold normal-case tracking-normal text-white shadow-subtle hover:bg-manara-teal/90 hover:-translate-y-0.5">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Signing In...
            </>
          ) : (
            "Sign In with Username"
          )}
        </Button>
      </form>
    </Form>
  );
}
