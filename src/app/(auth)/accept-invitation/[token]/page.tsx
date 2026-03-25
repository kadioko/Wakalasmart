"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Button } from "@client/components/ui/button";
import { useSession } from "@client/lib/auth-client";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  expired: boolean;
  organization: {
    id: string;
    name: string;
  };
  branches: Array<{
    id: string;
    name: string;
  }>;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  BRANCH_MANAGER: "Branch Manager",
  CASHIER: "Cashier",
  ACCOUNTANT: "Accountant",
};

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const { data: session, isPending: sessionLoading } = useSession();
  const token = typeof params?.token === "string" ? params.token : "";

  const invitationQuery = useQuery<{ data: InvitationDetails }>({
    queryKey: ["invitation-details", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const res = await fetch(`/api/v1/invitations/${token}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load invitation");
      }
      return json;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/invitations/${token}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to accept invitation");
      }
      return json;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const invitation = invitationQuery.data?.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept Invitation</CardTitle>
        <CardDescription>
          Join your team workspace and get access to your assigned branches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitationQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        ) : invitationQuery.isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {invitationQuery.error instanceof Error
              ? invitationQuery.error.message
              : "Failed to load invitation"}
          </div>
        ) : invitation ? (
          <>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Organization:</span> {invitation.organization.name}
              </p>
              <p>
                <span className="font-medium">Invited email:</span> {invitation.email}
              </p>
              <p>
                <span className="font-medium">Role:</span> {ROLE_LABELS[invitation.role] ?? invitation.role}
              </p>
              <p>
                <span className="font-medium">Assigned branches:</span>{" "}
                {invitation.branches.length > 0
                  ? invitation.branches.map((branch) => branch.name).join(", ")
                  : "No branches assigned"}
              </p>
              <p>
                <span className="font-medium">Status:</span> {invitation.status}
              </p>
            </div>

            {invitation.expired ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                This invitation has expired. Ask your manager or owner to send a new one.
              </div>
            ) : sessionLoading ? (
              <p className="text-sm text-muted-foreground">Checking your session...</p>
            ) : !session?.user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in with <span className="font-medium">{invitation.email}</span> to accept this invitation.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild>
                    <Link href={`/login?next=${encodeURIComponent(`/accept-invitation/${token}`)}`}>
                      Sign In
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/register?next=${encodeURIComponent(`/accept-invitation/${token}`)}`}>
                      Create Account
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Signed in as <span className="font-medium">{session.user.email}</span>
                </p>
                {acceptMutation.isError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {acceptMutation.error instanceof Error
                      ? acceptMutation.error.message
                      : "Failed to accept invitation"}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
