"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const onboardingSchema = z.object({
  organizationName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100),
  businessPhone: z
    .string()
    .regex(/^(\+?255|0)[67]\d{8}$/, "Invalid Tanzanian phone number")
    .optional()
    .or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  firstBranchName: z
    .string()
    .min(2, "Branch name must be at least 2 characters")
    .max(100),
});

type OnboardingInput = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const initialOrganizationName = searchParams.get("organizationName") || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      organizationName: initialOrganizationName,
      firstBranchName: "Main Branch",
    },
  });

  const onSubmit = async (data: OnboardingInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Setup failed. Please try again.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setServerError("Network error. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Your Business</CardTitle>
        <CardDescription>
          Tell us about your wakala business to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="organizationName">Business Name *</Label>
            <Input
              id="organizationName"
              placeholder="e.g. Amina Wakala Services"
              {...register("organizationName")}
            />
            {errors.organizationName && (
              <p className="text-xs text-destructive">
                {errors.organizationName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firstBranchName">First Branch Name *</Label>
            <Input
              id="firstBranchName"
              placeholder="e.g. Main Branch, Kariakoo Branch"
              {...register("firstBranchName")}
            />
            {errors.firstBranchName && (
              <p className="text-xs text-destructive">
                {errors.firstBranchName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input
                id="businessPhone"
                type="tel"
                placeholder="0712 345 678"
                {...register("businessPhone")}
              />
              {errors.businessPhone && (
                <p className="text-xs text-destructive">
                  {errors.businessPhone.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City / Town</Label>
              <Input
                id="city"
                placeholder="Dar es Salaam"
                {...register("city")}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Setting up..." : "Launch WakalaSmart →"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
