"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface RegisterFormProps {
  token: string;
  invite: {
    name: string;
    email: string;
    zone: string;
  };
  zones: { id: string; name: string }[];
}

export function RegisterForm({ token, invite, zones }: RegisterFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(invite.name);
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState(invite.zone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName || fullName.length < 2) e.fullName = "Please enter your full name";
    if (!/^[a-zA-Z\s'-]+$/.test(fullName)) e.fullName = "Name may only contain letters and spaces";
    if (!phone) e.phone = "Phone number is required";
    if (!zone) e.zone = "Please select your zone";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/candidate/${token}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, zone }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || "Registration failed. Please try again.");
        return;
      }

      router.push(`/quiz/${token}/start`);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            required
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            value={invite.email}
            disabled
            className="bg-slate-50 text-slate-500"
          />

          <Input
            id="phone"
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            error={errors.phone}
            required
          />

          <Select
            id="zone"
            label="Zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            options={zones.map((z) => ({ value: z.name, label: z.name }))}
            placeholder="Select your zone"
            error={errors.zone}
            required
          />

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Confirm Registration & Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
