import { Suspense } from "react";
import PlanPageClient from "./PlanPageClient";

export default function PlansPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <PlanPageClient />
    </Suspense>
  );
}
