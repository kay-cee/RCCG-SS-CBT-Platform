"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ZoneStat {
  zone: string;
  count: number;
  avgPercentage: number;
  passCount: number;
  passRate: number | null;
}

interface OverallStat {
  totalSubmissions: number;
  avgPercentage: number;
  passRate: number | null;
}

interface ZoneBarChartProps {
  zones: ZoneStat[];
  overall: OverallStat | null;
  passingScore?: number | null;
}

const TEAL = "#0D9488";
const AMBER = "#F59E0B";
const SLATE = "#94A3B8";

export function ZoneBarChart({ zones, overall, passingScore }: ZoneBarChartProps) {
  if (zones.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        No completed submissions yet — charts will appear here once candidates submit.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overall summary cards */}
      {overall && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Submissions"
            value={String(overall.totalSubmissions)}
            color="teal"
          />
          <StatCard
            label="Average Score"
            value={`${overall.avgPercentage}%`}
            color={overall.avgPercentage >= (passingScore ?? 0) ? "teal" : "amber"}
          />
          {overall.passRate != null && (
            <StatCard
              label="Pass Rate"
              value={`${overall.passRate}%`}
              color={overall.passRate >= 50 ? "teal" : "amber"}
            />
          )}
        </div>
      )}

      {/* Average score by zone */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Average Score by Zone
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={zones} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="zone"
              tick={{ fontSize: 11, fill: "#64748B" }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0}%`, "Avg Score"]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            {passingScore != null && (
              <Legend
                payload={[
                  { value: `Passing score: ${passingScore}%`, type: "line", color: AMBER },
                ]}
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              />
            )}
            <Bar dataKey="avgPercentage" name="Avg Score" radius={[4, 4, 0, 0]}>
              {zones.map((entry) => (
                <Cell
                  key={entry.zone}
                  fill={
                    passingScore != null && entry.avgPercentage >= passingScore
                      ? TEAL
                      : passingScore != null
                      ? AMBER
                      : TEAL
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pass rate by zone (only shown if quiz has a passing score) */}
      {passingScore != null && zones.some((z) => z.passRate != null) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Pass Rate by Zone
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={zones} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="zone"
                tick={{ fontSize: 11, fill: "#64748B" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value, _name, props) => {
                  const d = props?.payload as ZoneStat | undefined;
                  return [`${value ?? 0}% (${d?.passCount ?? 0}/${d?.count ?? 0})`, "Pass Rate"];
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="passRate" name="Pass Rate" radius={[4, 4, 0, 0]}>
                {zones.map((entry) => (
                  <Cell
                    key={entry.zone}
                    fill={(entry.passRate ?? 0) >= 50 ? TEAL : AMBER}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Zone breakdown table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Zone", "Submissions", "Avg Score", passingScore != null ? "Pass Rate" : null]
                .filter(Boolean)
                .map((h) => (
                  <th
                    key={h!}
                    className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zones.map((z) => (
              <tr key={z.zone}>
                <td className="px-4 py-3 font-medium text-slate-800">{z.zone}</td>
                <td className="px-4 py-3 text-slate-600">{z.count}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      passingScore != null && z.avgPercentage >= passingScore
                        ? "text-teal-700 font-medium"
                        : "text-amber-600"
                    }
                  >
                    {z.avgPercentage}%
                  </span>
                </td>
                {passingScore != null && (
                  <td className="px-4 py-3">
                    {z.passRate != null ? (
                      <span
                        className={
                          z.passRate >= 50 ? "text-teal-700 font-medium" : "text-amber-600"
                        }
                      >
                        {z.passRate}% ({z.passCount}/{z.count})
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: TEAL }} />
          At or above passing score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: AMBER }} />
          Below passing score
        </span>
        {passingScore == null && (
          <span className="italic">Set a passing score on this quiz to see pass/fail colours.</span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "teal" | "amber" | "slate";
}) {
  const colorMap = {
    teal: "text-teal-700 bg-teal-50 border-teal-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    slate: "text-slate-700 bg-slate-50 border-slate-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-0.5 opacity-80">{label}</div>
    </div>
  );
}
