import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Select, Text } from '@/common/components';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { GENDER_KEYS } from '@/features/profile/constants';
import { getUserProfile, toUserProfileInput } from '@/features/profile/services/profileRepository';
import { saveProfile } from '@/features/profile/services/profileService';
import type { UserProfile, UserProfileInput } from '@/features/profile/types';
import { toast } from '@/utils/toast';
import { SettingsGroup, SettingsRow } from './SettingsRow';

/** Activity levels offered in the app; `very_active` profiles show as `active`. */
const ACTIVITIES = ['sedentary', 'light', 'moderate', 'active'] as const;

type OfferedActivity = (typeof ACTIVITIES)[number];

type TextField = 'displayName' | 'age' | 'heightCm';

const NUMBER_LIMITS: Record<Exclude<TextField, 'displayName'>, { min: number; max: number }> = {
  age: { min: 10, max: 100 },
  heightCm: { min: 100, max: 230 },
};

/** Reads a typed value for the field; null when it is not valid. */
function parseField(field: TextField, value: string): Partial<UserProfileInput> | null {
  const trimmed = value.trim();

  if (field === 'displayName') {
    return trimmed.length > 0 && trimmed.length <= 40 ? { displayName: trimmed } : null;
  }

  const number = Number(trimmed.replace(',', '.'));
  const { min, max } = NUMBER_LIMITS[field];

  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }

  return field === 'age' ? { age: Math.round(number) } : { heightCm: Math.round(number) };
}

/**
 * Body stats in Settings: each row saves on its own. Calorie targets follow; the running
 * goal keeps going.
 */
export function PersonalInfoGroup() {
  const { t } = useTranslation();
  const { data: profile } = useFoodLogQuery('profile', getUserProfile);
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const [editing, setEditing] = useState<TextField | null>(null);

  if (!profile) {
    return null;
  }

  const save = async (changes: Partial<UserProfileInput>) => {
    await saveProfile({ ...toUserProfileInput(profile), ...changes });
    markFoodEntriesChanged();
    toast.success(t('personalInfo.saved'));
  };

  const saveQuietly = (changes: Partial<UserProfileInput>) => {
    save(changes).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    });
  };

  const activity: OfferedActivity =
    profile.activityLevel === 'very_active' ? 'active' : profile.activityLevel;
  const genderOptions = GENDER_KEYS.map((value) => ({
    value,
    label: t(`onboarding.genders.${value}`),
  }));
  const activityOptions = ACTIVITIES.map((value) => ({
    value,
    label: t(`onboarding.activities.${value}`),
  }));

  return (
    <SettingsGroup title={t('personalInfo.title')}>
      <SettingsRow
        icon="person-outline"
        title={t('onboarding.displayName')}
        value={profile.displayName}
        onPress={() => setEditing('displayName')}
      />
      <SettingsRow
        icon="male-female-outline"
        title={t('onboarding.gender')}
        right={
          <Select
            value={profile.gender}
            onChange={(value) => {
              const gender = GENDER_KEYS.find((key) => key === value);
              if (gender) saveQuietly({ gender });
            }}
            options={genderOptions}
            size="sm"
            triggerVariant="plain"
            accessibilityLabel={t('onboarding.gender')}
          >
            <Text variant="bodySmall" color="secondary">
              {t(`onboarding.genders.${profile.gender}`)}
            </Text>
          </Select>
        }
      />
      <SettingsRow
        icon="calendar-outline"
        title={t('onboarding.age')}
        value={String(profile.age)}
        onPress={() => setEditing('age')}
      />
      <SettingsRow
        icon="resize-outline"
        title={t('onboarding.height')}
        value={`${Math.round(profile.heightCm)} ${t('common.units.cm')}`}
        onPress={() => setEditing('heightCm')}
      />
      <SettingsRow
        icon="walk-outline"
        title={t('onboarding.activity')}
        right={
          <Select
            value={activity}
            onChange={(value) => {
              const activityLevel = ACTIVITIES.find((key) => key === value);
              if (activityLevel) saveQuietly({ activityLevel });
            }}
            options={activityOptions}
            size="sm"
            triggerVariant="plain"
            accessibilityLabel={t('onboarding.activity')}
          >
            <Text variant="bodySmall" color="secondary">
              {t(`onboarding.activities.${activity}`)}
            </Text>
          </Select>
        }
      />

      <ProfileFieldDialog
        field={editing}
        profile={profile}
        onDismiss={() => setEditing(null)}
        onSave={save}
      />
    </SettingsGroup>
  );
}

function ProfileFieldDialog({
  field,
  profile,
  onDismiss,
  onSave,
}: {
  field: TextField | null;
  profile: UserProfile;
  onDismiss: () => void;
  onSave: (changes: Partial<UserProfileInput>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (field) {
      setDraft(String(field === 'heightCm' ? Math.round(profile.heightCm) : profile[field]));
      setError(undefined);
    }
  }, [field, profile]);

  if (!field) {
    return null;
  }

  const labels: Record<TextField, { title: string; invalid: string }> = {
    displayName: { title: t('onboarding.displayName'), invalid: t('validation.required') },
    age: { title: t('onboarding.age'), invalid: t('onboarding.validation.age') },
    heightCm: { title: t('onboarding.height'), invalid: t('personalInfo.heightInvalid') },
  };

  const save = async () => {
    const changes = parseField(field, draft);

    if (!changes) {
      setError(labels[field].invalid);
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave(changes);
      onDismiss();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : t('errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      visible
      onDismiss={onDismiss}
      title={labels[field].title}
      size="sm"
      keyboardAware
      actions={[
        { label: t('common.cancel'), onPress: onDismiss, variant: 'ghost' },
        {
          label: t('common.save'),
          onPress: () => {
            void save();
          },
          variant: 'primary',
          loading: isSaving,
        },
      ]}
    >
      <Input
        value={draft}
        onChangeText={(value: string) => {
          setDraft(value);
          setError(undefined);
        }}
        keyboardType={field === 'displayName' ? 'default' : 'number-pad'}
        autoCapitalize={field === 'displayName' ? 'words' : 'none'}
        maxLength={field === 'displayName' ? 40 : 3}
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => {
          void save();
        }}
      />
    </Dialog>
  );
}
