import { FeaturePlaceholder } from "@/components/layout/FeaturePlaceholder";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { PageContainer } from "@/src/design";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Account preferences, notifications and terminal configuration"
      />

      <ThemeSelector />
      <AppearanceSettings />

      <FeaturePlaceholder
        icon={Settings}
        title="Settings panel in development"
        description="Configure your EquityOS terminal — market data sources, alert preferences, display themes and portfolio defaults will be available here."
        features={[
          "Profile and workspace preferences",
          "Price alert and earnings notification controls",
          "Data refresh intervals and market session defaults",
          "Export and privacy settings for your research data",
        ]}
      />
    </PageContainer>
  );
}
