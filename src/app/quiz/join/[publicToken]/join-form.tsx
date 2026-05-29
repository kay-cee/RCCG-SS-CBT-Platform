"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { validateJoinFields } from "@/lib/utils";

interface JoinFormProps {
  publicToken: string;
  zones: { id: string; name: string }[];
}

export function JoinForm({ publicToken, zones }: JoinFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; phone?: string; zone?: string }>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function validate() {
    return validateJoinFields({ fullName, email, phone, zone });
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
      const res = await fetch(`/api/quiz/join/${publicToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), zone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "already_registered") {
          setSubmitError("This email address is already registered for this quiz.");
        } else if (data.error === "quiz_not_active") {
          setSubmitError("This quiz is not currently active.");
        } else if (data.error === "quiz_closed") {
          setSubmitError("This quiz has closed and is no longer accepting registrations.");
        } else {
          setSubmitError(data.error || "Registration failed. Please try again.");
        }
        return;
      }

      router.push(`/quiz/${data.token}/start`);
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
            placeholder="e.g. John Adeyemi"
            error={errors.fullName}
            required
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={errors.email}
            required
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
            Register & Continue to Quiz
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
