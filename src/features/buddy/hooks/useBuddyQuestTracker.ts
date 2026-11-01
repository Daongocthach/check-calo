import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { toast } from '@/utils/toast';
import { DEFAULT_QUESTS } from '../constants/quests';
import { recordQuestCompletions } from '../services/questCompletionRepository';
import { pushPendingQuestCompletions } from '../services/questCompletionSync';
import { getQuestTitle } from '../utils/questText';
import { useBackgroundQuestEvaluation, useQuestConfig } from './useBuddyQuests';

/**
 * Records quests as they are completed, wherever the user is in the app, and says so. Mount
 * once near the app root.
 */
export function useBuddyQuestTracker() {
  const { t, i18n } = useTranslation();
  const evaluation = useBackgroundQuestEvaluation();
  const { data: quests } = useQuestConfig();
  // Completions being written, so a re-render before the refresh does not record them twice.
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    const due = (evaluation?.newCompletions ?? []).filter(
      (item) => !inFlight.current.has(`${item.questId}|${item.periodKey}`)
    );

    if (due.length === 0) {
      return;
    }

    due.forEach((item) => inFlight.current.add(`${item.questId}|${item.periodKey}`));

    void recordQuestCompletions(due)
      .then((recorded) => {
        const earned = recorded.filter((item) => item.points > 0);
        const points = earned.reduce((sum, item) => sum + item.points, 0);

        if (earned.length === 1) {
          const quest = [...quests, ...DEFAULT_QUESTS].find(
            (item) => item.id === earned[0].questId
          );
          toast.success(
            t('buddy.quests.earnedToast', {
              points,
              title: quest ? getQuestTitle(quest, i18n.language) : '',
            }),
            { title: t('buddy.quests.earnedTitle') }
          );
        } else if (earned.length > 1) {
          toast.success(t('buddy.quests.earnedManyToast', { points, count: earned.length }), {
            title: t('buddy.quests.earnedTitle'),
          });
        }

        if (recorded.length > 0) {
          useFoodEntryRefreshStore.getState().markFoodEntriesChanged();
          void pushPendingQuestCompletions().catch(() => undefined);
        }
      })
      .finally(() => {
        due.forEach((item) => inFlight.current.delete(`${item.questId}|${item.periodKey}`));
      });
  }, [evaluation, i18n.language, quests, t]);
}
