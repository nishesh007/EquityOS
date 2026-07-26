"use client";

import { SettingsShell, DeviceCard } from "@/components/saas";
import { Card } from "@/components/ui/Card";
import { useDevices } from "@/lib/saas";

export default function DevicesSettingsPage() {
  const { devices, removeDevice } = useDevices();

  return (
    <SettingsShell
      title="Devices"
      description="Registered browsers and trusted sessions for this license."
    >
      <Card padding="lg">
        {devices.length === 0 ? (
          <p className="text-sm text-text-secondary">No devices registered.</p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <DeviceCard
                key={d.id}
                device={d}
                onRemove={() => removeDevice(d.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </SettingsShell>
  );
}
