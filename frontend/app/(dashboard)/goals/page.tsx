import { PreviewNotice } from "@/components/banking/preview-notice";
import { GoalCards } from "@/components/dashboard/preview-cards";

export default function GoalsPage() {
  return (
    <>
      <PreviewNotice>Savings goals are an interface preview with sample targets. They aren’t linked to ledger balances yet.</PreviewNotice>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><GoalCards /></div>
    </>
  );
}
