import React from "react";
import UnlockPanelSection from "./UnlockPanelSection";

type Props = {
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: (formData: FormData) => Promise<void>;
};

export default function UnlockFooterSection({
  error,
  creditBalance,
  queueId,
  unlockPaidFeedbackAction,
}: Props) {
  return (
    <UnlockPanelSection
      error={error}
      creditBalance={creditBalance}
      queueId={queueId}
      unlockPaidFeedbackAction={unlockPaidFeedbackAction}
    />
  );
}
