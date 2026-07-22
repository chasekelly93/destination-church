import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BreakoutHeader } from "@/components/BreakoutHeader";
import { supabase } from "@/lib/supabase";

function AdminPortalLink() {
  return (
    <div className="mt-8 text-center">
      <Link
        to="/admin"
        className="text-xs text-muted-foreground underline underline-offset-2"
      >
        Admin Portal
      </Link>
    </div>
  );
}

const pledgeSchema = z
  .object({
    full_name: z.string().min(1, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(7, "Enter a valid phone number"),
    street_address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    amount: z.string().optional(),
    fulfillment_method: z.enum(["monthly", "one_time", "other"]).optional(),
    fulfillment_date: z.string().optional(),
    fulfillment_other_detail: z.string().optional(),
    includes_non_cash_gift: z.boolean(),
    non_cash_gift_detail: z.string().optional(),
    has_questions: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const amountNum = data.amount ? Number(data.amount) : NaN;

    if (!data.has_questions) {
      if (!data.amount || Number.isNaN(amountNum) || amountNum <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Enter an amount greater than 0, or check the questions box below",
        });
      }
      if (!data.fulfillment_method) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fulfillment_method"],
          message: "Choose how you'll fulfill this commitment",
        });
      }
    }

    if (data.fulfillment_method === "one_time" && !data.fulfillment_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillment_date"],
        message: "Enter the date",
      });
    }

    if (data.fulfillment_method === "other" && !data.fulfillment_other_detail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillment_other_detail"],
        message: "Describe your plan",
      });
    }

    if (data.includes_non_cash_gift && !data.non_cash_gift_detail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["non_cash_gift_detail"],
        message: "Describe the non-cash gift",
      });
    }
  });

type PledgeFormValues = z.infer<typeof pledgeSchema>;
type SubmitState = "idle" | "success" | "duplicate";

const Index = () => {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PledgeFormValues>({
    resolver: zodResolver(pledgeSchema),
    defaultValues: {
      includes_non_cash_gift: false,
      has_questions: false,
    },
  });

  const hasQuestions = watch("has_questions");
  const fulfillmentMethod = watch("fulfillment_method");
  const includesNonCashGift = watch("includes_non_cash_gift");

  const onSubmit = async (values: PledgeFormValues) => {
    const { error } = await supabase.from("pledges").insert({
      full_name: values.full_name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      street_address: values.street_address?.trim() || null,
      city: values.city?.trim() || null,
      state: values.state?.trim() || null,
      zip: values.zip?.trim() || null,
      amount: values.amount ? Number(values.amount) : null,
      fulfillment_method: values.has_questions ? null : values.fulfillment_method,
      fulfillment_date:
        values.fulfillment_method === "one_time" ? values.fulfillment_date : null,
      fulfillment_other_detail:
        values.fulfillment_method === "other"
          ? values.fulfillment_other_detail?.trim()
          : null,
      includes_non_cash_gift: values.includes_non_cash_gift,
      non_cash_gift_detail: values.includes_non_cash_gift
        ? values.non_cash_gift_detail?.trim()
        : null,
      has_questions: values.has_questions,
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
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-lg shadow-sm">
          <BreakoutHeader />
          <div className="rounded-b-lg bg-card p-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">Thank you for your pledge!</h1>
            <p className="text-muted-foreground">
              We've recorded your commitment to the campaign. You'll hear from us soon.
            </p>
          </div>
        </div>
        <AdminPortalLink />
      </div>
    );
  }

  if (submitState === "duplicate") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md overflow-hidden rounded-lg shadow-sm">
          <BreakoutHeader />
          <div className="rounded-b-lg bg-card p-8 text-center">
            <h1 className="mb-2 text-3xl font-bold">You've already pledged</h1>
            <p className="text-muted-foreground">
              It looks like this email has already submitted a pledge. Pledges are
              one-time — reach out to us directly if you need to make a change.
            </p>
          </div>
        </div>
        <AdminPortalLink />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md overflow-hidden rounded-lg py-0 shadow-sm">
        <BreakoutHeader />
        <CardHeader>
          <CardTitle>Make Your Pledge</CardTitle>
          <CardDescription>
            Join the campaign by committing your pledge below. This is a one-time commitment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Name(s)</Label>
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
              <Label htmlFor="street_address">Street address (optional)</Label>
              <Input id="street_address" {...register("street_address")} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register("city")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register("state")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip</Label>
                <Input id="zip" {...register("zip")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">My/our total four-month commitment ($)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                disabled={hasQuestions}
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {!hasQuestions && (
              <div className="space-y-2">
                <Label>I/We plan to fulfill the commitment</Label>
                <Controller
                  name="fulfillment_method"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="fulfillment-monthly" />
                        <Label htmlFor="fulfillment-monthly" className="font-normal">
                          In equal amounts each month for four months
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one_time" id="fulfillment-one-time" />
                        <Label htmlFor="fulfillment-one-time" className="font-normal">
                          As a one-time gift
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="fulfillment-other" />
                        <Label htmlFor="fulfillment-other" className="font-normal">
                          Other
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
                {errors.fulfillment_method && (
                  <p className="text-sm text-destructive">
                    {errors.fulfillment_method.message}
                  </p>
                )}
              </div>
            )}

            {!hasQuestions && fulfillmentMethod === "one_time" && (
              <div className="space-y-2">
                <Label htmlFor="fulfillment_date">Date of one-time gift</Label>
                <Input id="fulfillment_date" type="date" {...register("fulfillment_date")} />
                {errors.fulfillment_date && (
                  <p className="text-sm text-destructive">
                    {errors.fulfillment_date.message}
                  </p>
                )}
              </div>
            )}

            {!hasQuestions && fulfillmentMethod === "other" && (
              <div className="space-y-2">
                <Label htmlFor="fulfillment_other_detail">Describe your plan</Label>
                <Input id="fulfillment_other_detail" {...register("fulfillment_other_detail")} />
                {errors.fulfillment_other_detail && (
                  <p className="text-sm text-destructive">
                    {errors.fulfillment_other_detail.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Controller
                name="includes_non_cash_gift"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="includes_non_cash_gift"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="includes_non_cash_gift" className="font-normal leading-snug">
                My/our commitment includes giving non-cash items (e.g. appreciated
                stock, real estate, gift fund, etc.)
              </Label>
            </div>

            {includesNonCashGift && (
              <div className="space-y-2">
                <Label htmlFor="non_cash_gift_detail">Describe the non-cash gift</Label>
                <Input id="non_cash_gift_detail" {...register("non_cash_gift_detail")} />
                {errors.non_cash_gift_detail && (
                  <p className="text-sm text-destructive">
                    {errors.non_cash_gift_detail.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Controller
                name="has_questions"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="has_questions"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="has_questions" className="font-normal leading-snug">
                I/we want to participate but have questions, please contact me to
                discuss.
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Pledge"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <AdminPortalLink />
    </div>
  );
};

export default Index;
