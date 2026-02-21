import React from "react";
import UnlockPanel from "../../_components/UnlockPanel";

type Props = {
  unlocked: boolean; // should be false in locked state
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: any;
};

export default function UnlockPanelLockedSection({ unlocked, error, creditBalance, queueId, unlockPaidFeedbackAction }: Props) {
  return (
    <section>
      <UnlockPanel
        unlocked={unlocked}
        error={error}
        creditBalance={creditBalance}
        queueId={queueId}
        unlockPaidFeedbackAction={unlockPaidFeedbackAction}
      />
    </section>
  );
}
