import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { ClockOffFeed } from "@/components/clock-off-feed";
import { MaintenancePanel } from "@/components/maintenance-panel";

import { OperatorManagementPanel } from "@/components/operator-management-panel";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Operations · NTPC Lara Telemetry" },
      { name: "description", content: "Shift handover and preventive maintenance hub for plant operators." },
    ],
  }),
  component: OperationsPage,
});

function OperationsPage() {
  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader title="Operations Hub" subtitle="Shift handovers, operator tracking, and preventive-maintenance" />
      <div className="grid lg:grid-cols-2 gap-6">
        <ClockOffFeed />
        <div className="space-y-6">
          <OperatorManagementPanel />
          <MaintenancePanel />
        </div>
      </div>
    </div>
  );
}
