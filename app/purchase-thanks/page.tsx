import { Suspense } from "react";
import PurchaseThanksClient from "./purchase-thanks-client";

export default function PurchaseThanksPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            padding: "2rem",
          }}
        >
          Loading…
        </main>
      }
    >
      <PurchaseThanksClient />
    </Suspense>
  );
}
