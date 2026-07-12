import { notFound } from "next/navigation";
import { CompanyBreadcrumb } from "@/components/company/CompanyBreadcrumb";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { ActionButtons } from "@/components/company/ActionButtons";
import { FinancialSummaryCards } from "@/components/company/FinancialSummaryCards";
import { CompanyTabs } from "@/components/company/CompanyTabs";
import { ResearchTerminal } from "@/components/company/research/ResearchTerminal";
import { EquityIntelligenceEngine } from "@/components/company/intelligence/EquityIntelligenceEngine";
import { fetchCompanyProfile } from "@/services/companyData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import { fetchCompanyResearch } from "@/services/researchData";

interface CompanyPageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: CompanyPageProps) {
  const { symbol } = await params;
  const company = await fetchCompanyProfile(symbol);

  if (!company) {
    return { title: "Company Not Found · EquityOS" };
  }

  return {
    title: `${company.name} (${company.symbol}) · EquityOS`,
    description: `Research ${company.name} — price, financials, valuation, and news.`,
  };
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { symbol } = await params;
  const [company, research, intelligence] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchCompanyResearch(symbol),
    fetchEquityIntelligence(symbol),
  ]);

  if (!company || !research || !intelligence) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <CompanyBreadcrumb symbol={company.symbol} name={company.name} />
      </div>

      <div className="space-y-6">
        <CompanyHeader company={company} />
        <ActionButtons symbol={company.symbol} />
        <ResearchTerminal company={company} research={research} />
        <EquityIntelligenceEngine intelligence={intelligence} />
        <FinancialSummaryCards financials={company.financials} dataTransparency={intelligence.dataTransparency} />
        <CompanyTabs company={company} dataTransparency={intelligence.dataTransparency} />
      </div>
    </div>
  );
}
