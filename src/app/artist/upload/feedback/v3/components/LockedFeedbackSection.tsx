import React from "react";
import UnlockPanelLockedSection from "./UnlockPanelLockedSection";

type Props = {
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: (formData: FormData) => Promise<void>;
};

export default function LockedFeedbackSection({
  error,
  creditBalance,
  queueId,
  unlockPaidFeedbackAction,
}: Props) {
  return (
    <div className="mt-6">
      <p className="text-white/70">
        Detailed AI feedback is locked. Unlock to view the full analysis for this upload.
      </p>

      <div className="mt-6">
        <UnlockPanelLockedSection
          unlocked={false}
          error={error}
          creditBalance={creditBalance}
          queueId={queueId}
          unlockPaidFeedbackAction={unlockPaidFeedbackAction}
        />
      </div>
    </div>
  );
}
