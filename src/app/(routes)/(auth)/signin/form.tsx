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
import { signIn, authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SignInSchema, SignInValues } from "./validate";
import InputStartIcon from "../components/input-start-icon";
import InputPasswordContainer from "../components/input-password";
import { cn } from "@/lib/utils";
import { AtSign } from "lucide-react";

export default function SignInForm() {
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
        console.log("SIGN_IN:", response.error.message);
        toast.error(response.error.message);
      } else {
        router.push("/");
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
        <Button type="submit" disabled={isPending} className="mt-5 w-full bg-manara-teal hover:bg-manara-teal/90">
          Sign In with Username
        </Button>
        
        <div className="relative my-2 flex items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink-0 px-2 text-xs text-muted-foreground uppercase">Or</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          disabled={isPending} 
          onClick={() => authClient.signIn.social({ provider: "google" })}
          className="w-full"
        >
          Sign In with Google
        </Button>
        
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            disabled={isPending} 
            onClick={async () => {
              const email = prompt("Enter your email for Magic Link:");
              if (!email) return;
              const res = await authClient.signIn.magicLink({ email });
              if (res.error) toast.error(res.error.message);
              else toast.success("Magic link sent!");
            }}
            className="w-full text-xs"
          >
            Magic Link
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            disabled={isPending} 
            onClick={async () => {
              const email = prompt("Enter your email for OTP:");
              if (!email) return;
              const res = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
              if (res.error) toast.error(res.error.message);
              else {
                const otp = prompt("Enter the OTP sent to your email:");
                if (otp) {
                  const verifyRes = await authClient.signIn.emailOtp({ email, otp });
                  if (verifyRes.error) toast.error(verifyRes.error.message);
                  else router.push("/");
                }
              }
            }}
            className="w-full text-xs"
          >
            Email OTP
          </Button>
        </div>
      </form>
    </Form>
  );
}
