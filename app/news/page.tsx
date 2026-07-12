import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchMarketNews } from "@/services/marketData";

export default async function NewsPage() {
  const news = await fetchMarketNews();

  return (
    <div className="p-6">
      <PageHeader
        title="Market News"
        subtitle="Headlines, sector updates and macro developments"
      />

      <section className="animate-fade-in-up max-w-3xl">
        <LatestMarketNews news={news} />
      </section>
    </div>
  );
}
