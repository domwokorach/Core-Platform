import { MarketSection } from "@/components/market/market-section";
import { PaperTrading } from "@/components/market/paper-trading";

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <MarketSection />
      <PaperTrading />
    </div>
  );
}
