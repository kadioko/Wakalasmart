"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Settings, Shield, Bell, Building2 } from "lucide-react";

export default function SettingsPage() {
  const { data: orgData } = useQuery({
    queryKey: ["org"],
    queryFn: () => fetch("/api/v1/org").then((r) => r.json()),
  });

  const org = orgData?.data;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your organization and operational preferences
        </p>
      </div>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Organization Name</Label>
              <Input defaultValue={org?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>TIN (Optional)</Label>
              <Input defaultValue={org?.tin ?? ""} placeholder="Tax ID" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input defaultValue={org?.phone ?? ""} placeholder="+255..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue={org?.email ?? ""} placeholder="info@..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input defaultValue={org?.address ?? ""} placeholder="Business address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value="TZS" disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value="Africa/Dar_es_Salaam" disabled />
            </div>
          </div>
          <Button>Save Organization Details</Button>
        </CardContent>
      </Card>

      {/* Operational Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Operational Settings
          </CardTitle>
          <CardDescription>Control how transactions and shifts work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              {
                key: "shiftsMandatory",
                label: "Require open shift for transactions",
                desc: "Staff must open a shift before recording transactions",
              },
              {
                key: "requireApprovalForReversals",
                label: "Require approval for reversals",
                desc: "Reversals need manager approval before taking effect",
              },
              {
                key: "requireApprovalForAdjustments",
                label: "Require approval for manual adjustments",
                desc: "Balance adjustments need approval",
              },
              {
                key: "roleSeparationEnabled",
                label: "Enable role separation for reconciliation",
                desc: "Person who submits cannot also approve reconciliation",
              },
              {
                key: "backDatingAllowed",
                label: "Allow backdated transactions",
                desc: "Allow recording transactions with past dates",
              },
            ].map((setting) => (
              <div
                key={setting.key}
                className="flex items-start justify-between gap-4 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{setting.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="mt-0.5 h-4 w-4 cursor-pointer" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>Set thresholds for automatic alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Low Cash Alert (TZS)</Label>
              <Input type="number" defaultValue={100000} />
            </div>
            <div className="space-y-1.5">
              <Label>Large Transaction Alert (TZS)</Label>
              <Input type="number" defaultValue={1000000} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>High Reversals Threshold (per shift)</Label>
            <Input type="number" defaultValue={5} />
          </div>
          <Button>Save Alert Settings</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Duplicate Reference Policy</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="WARN">Warn but allow</option>
              <option value="BLOCK">Block duplicate references</option>
            </select>
          </div>
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
