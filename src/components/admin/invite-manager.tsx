"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Invite {
  id: string;
  email: string;
  name: string;
  zone: string;
  token: string;
  inviteStatus: string;
  sentAt: Date | string | null;
  registration: { fullName: string; phone: string } | null;
  session: { status: string; score: number | null; totalMarks: number | null } | null;
}

interface InviteManagerProps {
  quizId: string;
  invites: Invite[];
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

const statusVariant: Record<string, "default" | "info" | "success" | "warning" | "error"> = {
  PENDING: "default",
  SENT: "info",
  FAILED: "error",
  OPENED: "success",
};

export function InviteManager({ quizId, invites: initial }: InviteManagerProps) {
  const [invites, setInvites] = useState(initial);
  const [tab, setTab] = useState<"list" | "add">("list");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zone, setZone] = useState("");
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/zones")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => setZones(data))
      .catch(() => {/* zones will remain empty; user can still type */});
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !zone) {
      setMsg("All fields are required.");
      return;
    }
    setLoading(true);
    setMsg("");

    const res = await fetch(`/api/quiz/${quizId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates: [{ name, email, zone }], sendNow }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMsg("Failed to add candidate.");
      return;
    }

    if (data[0]?.status === "duplicate") {
      setMsg("This email is already invited to this quiz.");
      return;
    }

    setMsg("Candidate invited successfully.");
    setName("");
    setEmail("");
    setZone("");
    // Refresh page to show new invite — simple approach
    window.location.reload();
  }

  async function handleBulkCsv() {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split("\n").slice(1); // skip header
    const candidates = lines
      .map((line) => {
        const [name, email, zone] = line.split(",").map((s) => s.trim());
        return { name, email, zone };
      })
      .filter((c) => c.name && c.email && c.zone);

    if (!candidates.length) {
      setMsg("No valid rows found. Format: Name, Email, Zone");
      return;
    }

    setLoading(true);
    setMsg("");
    const res = await fetch(`/api/quiz/${quizId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidates, sendNow }),
    });
    setLoading(false);

    if (!res.ok) {
      setMsg("Failed to process bulk invite.");
      return;
    }

    const results: { status: string }[] = await res.json();
    const created = results.filter((r) => r.status === "created").length;
    const dupes = results.filter((r) => r.status === "duplicate").length;
    setMsg(`${created} invited${dupes > 0 ? `, ${dupes} duplicate(s) skipped` : ""}.`);
    setCsvText("");
    window.location.reload();
  }

  async function handleResend(inviteId: string) {
    setResendingId(inviteId);
    await fetch(`/api/quiz/${quizId}/invite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    setResendingId(null);
    setInvites((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, inviteStatus: "SENT" } : i))
    );
  }

  function copyLink(invite: Invite) {
    const url = `${window.location.origin}/quiz/${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(["list", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "list" ? `All Candidates (${invites.length})` : "Add Candidates"}
          </button>
        ))}
      </div>

      {msg && (
        <p className={`text-sm ${msg.includes("success") || msg.includes("invited") ? "text-green-600" : "text-amber-600"}`}>
          {msg}
        </p>
      )}

      {tab === "list" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {invites.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No candidates invited yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Name", "Email", "Zone", "Invite Status", "Quiz Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {invite.registration?.fullName || invite.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{invite.email}</td>
                      <td className="px-4 py-3 text-slate-600">{invite.zone}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[invite.inviteStatus] ?? "default"}>
                          {invite.inviteStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {invite.session ? (
                          <Badge variant={invite.session.status === "COMPLETED" ? "success" : "info"}>
                            {invite.session.status}
                          </Badge>
                        ) : invite.registration ? (
                          <Badge variant="warning">REGISTERED</Badge>
                        ) : (
                          <Badge>PENDING</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyLink(invite)}
                            className="text-xs text-teal-600 hover:text-teal-700"
                          >
                            {copiedId === invite.id ? "Copied!" : "Copy Link"}
                          </button>
                          {!invite.session && (
                            <button
                              onClick={() => handleResend(invite.id)}
                              disabled={resendingId === invite.id}
                              className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                            >
                              {resendingId === invite.id ? "Sending…" : "Resend"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="space-y-6">
          {/* Single add */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-800 mb-4">Add Single Candidate</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input id="name" label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Select
                id="zone"
                label="Zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                options={zones.map((z) => ({ value: z.name, label: z.name }))}
                placeholder="Select a zone"
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="accent-teal-600" />
                Send invitation email immediately
              </label>
              <Button type="submit" loading={loading}>Add & Invite</Button>
            </form>
          </div>

          {/* CSV bulk */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-800 mb-1">Bulk Upload (CSV)</h3>
            <p className="text-xs text-slate-500 mb-3">
              Paste CSV content with header: <code>Name, Email, Zone</code>
            </p>
            <textarea
              className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none min-h-[120px]"
              placeholder={`Name, Email, Zone\nJohn Doe, john@example.com, Grace Arena Zone`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="accent-teal-600" />
                Send invites immediately
              </label>
              <Button onClick={handleBulkCsv} loading={loading} size="sm">
                Upload & Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
