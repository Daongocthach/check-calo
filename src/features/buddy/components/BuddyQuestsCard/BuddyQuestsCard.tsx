import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Icon, ProgressBar, SegmentedControl, Text } from '@/common/components';
import { formatWholeNumber } from '@/features/food-log/utils/format';
import { QUEST_KINDS } from '../../constants/quests';
import { filterStatuses, type QuestStatus, type QuestUnit } from '../../quests/questEngine';
import type { QuestKind } from '../../types';
import { getQuestTitle } from '../../utils/questText';
import { styles } from './BuddyQuestsCard.styles';

const PROGRESS_KEYS = {
  kcal: 'buddy.quests.progress.kcal',
  g: 'buddy.quests.progress.g',
  macros: 'buddy.quests.progress.macros',
  days: 'buddy.quests.progress.days',
} as const satisfies Record<QuestUnit, string>;

function isQuestKind(value: string): value is QuestKind {
  return QUEST_KINDS.some((kind) => kind === value);
}

export interface BuddyQuestsCardProps {
  statuses: QuestStatus[];
  name: string;
  /** Opens sign-up, for the account quest. */
  onCreateAccount: () => void;
}

/** Daily, weekly and special quests with where each stands and what it pays. */
export function BuddyQuestsCard({ statuses, name, onCreateAccount }: BuddyQuestsCardProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<QuestKind>('daily');
  const shown = filterStatuses(statuses, kind);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" weight="bold">
          {t('buddy.quests.title')}
        </Text>
        <Text variant="caption" color="secondary">
          {t('buddy.quests.subtitle', { name })}
        </Text>
      </View>

      <SegmentedControl
        size="sm"
        value={kind}
        onChange={(value) => {
          if (isQuestKind(value)) {
            setKind(value);
          }
        }}
        options={QUEST_KINDS.map((value) => {
          const ofKind = filterStatuses(statuses, value);
          const done = ofKind.filter((status) => status.state === 'done').length;
          const label = t(`buddy.quests.tabs.${value}`);

          return {
            value,
            label: value === 'special' ? label : `${label} ${done}/${ofKind.length}`,
          };
        })}
      />

      {shown.length === 0 ? (
        <Text variant="bodySmall" color="secondary">
          {t('buddy.quests.empty')}
        </Text>
      ) : (
        shown.map((status) => (
          <QuestRow key={status.quest.id} status={status} onCreateAccount={onCreateAccount} />
        ))
      )}
    </View>
  );
}

function QuestRow({
  status,
  onCreateAccount,
}: {
  status: QuestStatus;
  onCreateAccount: () => void;
}) {
  const { t, i18n } = useTranslation();
  const statusText = useStatusText(status);
  const { quest, state, progress, week } = status;
  const done = state === 'done';
  const opensSignUp = quest.metric === 'create_account' && !done;
  const showsBar = !done && progress && (progress.unit !== 'macros' || quest.kind === 'weekly');

  const content = (
    <View style={styles.row}>
      <View style={[styles.icon, done && styles.iconDone]}>
        {done ? (
          <Icon name="checkmark" variant="brand" size={18} />
        ) : (
          <Text variant="body" color="secondary" accessible={false}>
            {'–'}
          </Text>
        )}
      </View>

      <View style={styles.body}>
        <Text
          variant="bodySmall"
          weight="semibold"
          color={done ? 'secondary' : 'primary'}
          numberOfLines={2}
        >
          {getQuestTitle(quest, i18n.language)}
        </Text>
        <Text variant="caption" color={state === 'settling' ? 'link' : 'secondary'}>
          {statusText}
        </Text>
        {showsBar && progress ? (
          <ProgressBar value={Math.min(100, (100 * progress.value) / progress.target)} size="sm" />
        ) : null}
        {week ? (
          <View style={styles.week}>
            {week.map((dayState, index) => (
              <View key={index} style={[styles.weekDot, styles[`weekDot_${dayState}`]]} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.reward, done && styles.rewardDone]}>
        <Text variant="caption" weight="bold" color={done ? 'secondary' : 'link'}>
          {quest.points > 0
            ? t('buddy.quests.points', { points: quest.points })
            : t('buddy.quests.badge')}
        </Text>
      </View>
    </View>
  );

  if (!opensSignUp) {
    return content;
  }

  return (
    <Pressable
      onPress={onCreateAccount}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

/** The line under a quest's title: where it stands, in words. */
function useStatusText(status: QuestStatus) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { quest, state, progress, needsData, timesDone } = status;
  const formatProgress = () =>
    progress
      ? t(PROGRESS_KEYS[progress.unit], {
          value: formatWholeNumber(progress.value, language),
          target: formatWholeNumber(progress.target, language),
        })
      : '';

  switch (quest.metric) {
    case 'pet_level_up':
      return timesDone > 0
        ? t('buddy.quests.levelUp', { count: timesDone })
        : t('buddy.quests.levelUpOpen');
    case 'weight_goal_reached':
      return timesDone > 0
        ? t('buddy.quests.weightGoalDone', { count: timesDone })
        : t('buddy.quests.weightGoalOpen');
    case 'create_account':
      return state === 'done' ? t('buddy.quests.accountDone') : t('buddy.quests.accountOpen');
    default:
      break;
  }

  if (state === 'done') {
    return quest.kind === 'weekly' ? t('buddy.quests.weekDone') : t('buddy.quests.done');
  }

  if (state === 'settling') {
    return t('buddy.quests.settling');
  }

  if (quest.kind === 'weekly') {
    return formatProgress();
  }

  switch (quest.metric) {
    case 'first_log':
      return t('buddy.quests.firstLogOpen');
    case 'within_limits':
      return needsData ? t('buddy.quests.limitsNeedsData') : t('buddy.quests.limitsOpen');
    default:
      return formatProgress();
  }
}
