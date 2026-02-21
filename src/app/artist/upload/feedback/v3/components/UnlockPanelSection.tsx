import React from "react";
import UnlockPanel from "../../_components/UnlockPanel";

type Props = {
  error: string;
  creditBalance: number;
  queueId: string;
  unlockPaidFeedbackAction: any;
};

export default function UnlockPanelSection({ error, creditBalance, queueId, unlockPaidFeedbackAction }: Props) {
  return (
    <section>
      <UnlockPanel
        unlocked={true}
        error={error}
        creditBalance={creditBalance}
        queueId={queueId}
        unlockPaidFeedbackAction={unlockPaidFeedbackAction}
      />
    </section>
  );
}
