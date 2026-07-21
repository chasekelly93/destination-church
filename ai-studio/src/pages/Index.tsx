import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

const pledgeSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  address: z.string().optional(),
  amount: z.coerce.number().positive("Enter an amount greater than 0"),
});

type PledgeFormValues = z.infer<typeof pledgeSchema>;
type SubmitState = "idle" | "success" | "duplicate";

const Index = () => {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PledgeFormValues>({
    resolver: zodResolver(pledgeSchema),
  });

  const onSubmit = async (values: PledgeFormValues) => {
    const { error } = await supabase.from("pledges").insert({
      full_name: values.full_name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      address: values.address?.trim() || null,
      amount: values.amount,
    });

    if (!error) {
      setSubmitState("success");
      return;
    }

    if (error.code === "23505") {
      setSubmitState("duplicate");
      return;
    }

    toast.error(error.message);
  };

  if (submitState === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-3xl font-bold">Thank you for your pledge!</h1>
          <p className="text-muted-foreground">
            We've recorded your commitment to the campaign. You'll hear from us soon.
          </p>
        </div>
      </div>
    );
  }

  if (submitState === "duplicate") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-3xl font-bold">You've already pledged</h1>
          <p className="text-muted-foreground">
            It looks like this email has already submitted a pledge. Pledges are
            one-time — reach out to us directly if you need to make a change.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Make Your Pledge</CardTitle>
          <CardDescription>
            Join the campaign by committing your pledge below. This is a one-time commitment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" {...register("address")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Pledge amount ($)</Label>
              <Input id="amount" type="number" min="1" step="0.01" {...register("amount")} />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Pledge"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
