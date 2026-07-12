"use client";

import { TabBar } from "@/components/ui/TabBar";
import { OverviewTab } from "@/components/company/tabs/OverviewTab";
import { FinancialsTab } from "@/components/company/tabs/FinancialsTab";
import { QuarterlyTab } from "@/components/company/tabs/QuarterlyTab";
import { ShareholdingTab } from "@/components/company/tabs/ShareholdingTab";
import { PeersTab } from "@/components/company/tabs/PeersTab";
import { ValuationTab } from "@/components/company/tabs/ValuationTab";
import { NewsTab } from "@/components/company/tabs/NewsTab";
import { NotesTab } from "@/components/company/tabs/NotesTab";
import type { CompanyProfile, CompanyTab, DataTransparency } from "@/types";
import { useState } from "react";

const TABS: { id: CompanyTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "quarterly", label: "Quarterly" },
  { id: "shareholding", label: "Shareholding" },
  { id: "peers", label: "Peers" },
  { id: "valuation", label: "Valuation" },
  { id: "news", label: "News" },
  { id: "notes", label: "Notes" },
];

interface CompanyTabsProps {
  company: CompanyProfile;
  dataTransparency?: DataTransparency;
}

export function CompanyTabs({ company, dataTransparency }: CompanyTabsProps) {
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");

  return (
    <div className="space-y-4">
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        size="md"
        className="w-full flex-wrap"
      />

      <div>
        {activeTab === "overview" && <OverviewTab company={company} />}
        {activeTab === "financials" && (
          <FinancialsTab annualFinancials={company.annualFinancials} />
        )}
        {activeTab === "quarterly" && (
          <QuarterlyTab quarterlyResults={company.quarterlyResults} />
        )}
        {activeTab === "shareholding" && (
          <ShareholdingTab shareholding={company.shareholding} />
        )}
        {activeTab === "peers" && <PeersTab peers={company.peers} />}
        {activeTab === "valuation" && (
          <ValuationTab valuation={company.valuation} dataTransparency={dataTransparency} />
        )}
        {activeTab === "news" && <NewsTab news={company.news} />}
        {activeTab === "notes" && (
          <NotesTab notes={company.notes} symbol={company.symbol} />
        )}
      </div>
    </div>
  );
}
