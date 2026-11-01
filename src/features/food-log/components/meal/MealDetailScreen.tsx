import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Loading,
  ScreenHeader,
  Text,
} from '@/common/components';
import { useBottomPadding } from '@/hooks';
import { appAlert } from '@/providers/app-alert';
import { toast } from '@/utils/toast';
import { useMealDetail } from '../../hooks/useMealDetail';
import { formatDayDate, formatTime } from '../../utils/format';
import { getMealSlot } from '../../utils/mealSlot';
import { hasAnyNutrient } from '../../utils/nutrients';
import { FoodImagePreview } from '../FoodImagePreview';
import { MacroRings } from '../MacroRings';
import { NutrientList } from '../NutrientList';
import { MealDetailEditForm } from './MealDetailEditForm';

export interface MealDetailScreenProps {
  entryId: string;
}

export function MealDetailScreen({ entryId }: MealDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const { entry, profile, isLoading, update, remove } = useMealDetail(entryId);
  const [isEditing, setIsEditing] = useState(false);

  const confirmDelete = () => {
    appAlert.alert(t('mealDetail.deleteTitle'), t('mealDetail.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void remove()
            .then(() => {
              toast.success(t('mealDetail.deleteSuccess'));
              router.back();
            })
            .catch((error: unknown) => {
              toast.error(error instanceof Error ? error.message : t('errors.generic'));
            });
        },
      },
    ]);
  };

  const headerRight = entry ? (
    <IconButton
      icon={isEditing ? 'close' : 'create-outline'}
      variant="outline"
      onPress={() => setIsEditing((value) => !value)}
      accessibilityLabel={isEditing ? t('common.cancel') : t('common.edit')}
    />
  ) : null;

  let content = null;

  if (isLoading) {
    content = <Loading />;
  } else if (!entry) {
    content = (
      <EmptyState
        icon={<Icon name="alert-circle-outline" variant="secondary" size={32} />}
        title={t('mealDetail.notFound')}
      />
    );
  } else if (isEditing) {
    content = (
      <MealDetailEditForm
        entry={entry}
        onCancel={() => setIsEditing(false)}
        onSubmit={async (input) => {
          await update(input);
          toast.success(t('mealDetail.saveSuccess'));
          setIsEditing(false);
        }}
      />
    );
  } else {
    content = (
      <>
        <FoodImagePreview
          imageUri={entry.imageUri}
          thumbnailUri={entry.thumbnailUri}
          style={styles.image}
        />
        <View style={styles.section}>
          <Text variant="h2" weight="bold">
            {entry.mealName}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <Icon name="calendar-outline" variant="secondary" size={16} />
              <Text variant="bodySmall" color="secondary">
                {formatDayDate(entry.entryDate, i18n.language)}
              </Text>
            </View>
            <View style={styles.meta}>
              <Icon name="time-outline" variant="secondary" size={16} />
              <Text variant="bodySmall" color="secondary">
                {formatTime(entry.consumedAt, i18n.language)}
              </Text>
            </View>
            <View style={styles.meta}>
              <Icon name="restaurant-outline" variant="secondary" size={16} />
              <Text variant="bodySmall" color="secondary">
                {t(`mealSlots.${getMealSlot(entry.consumedAt)}`)}
              </Text>
            </View>
            {entry.quantityLabel ? (
              <View style={styles.meta}>
                <Icon name="scale-outline" variant="secondary" size={16} />
                <Text variant="bodySmall" color="secondary">
                  {entry.quantityLabel}
                </Text>
              </View>
            ) : null}
          </View>
          {entry.notes ? (
            <Text variant="bodySmall" color="secondary">
              {entry.notes}
            </Text>
          ) : null}
        </View>
        <View style={styles.card}>
          <Text variant="body" weight="bold">
            {t('mealDetail.nutrition')}
          </Text>
          <MacroRings
            calories={entry.totalCalories}
            proteinGrams={entry.proteinGrams}
            carbsGrams={entry.carbsGrams}
            fatGrams={entry.fatGrams}
            targets={{
              calories: profile?.dailyCalorieTarget ?? 0,
              proteinGrams: profile?.proteinTargetGrams ?? 0,
              carbsGrams: profile?.carbsTargetGrams ?? 0,
              fatGrams: profile?.fatTargetGrams ?? 0,
            }}
          />
          <Text variant="caption" color="tertiary">
            {t('mealDetail.ringsHint')}
          </Text>
        </View>
        <View style={styles.card}>
          <Text variant="body" weight="bold">
            {t('nutrients.title')}
          </Text>
          {hasAnyNutrient(entry) ? null : (
            <Text variant="bodySmall" color="secondary">
              {t('nutrients.emptyHint')}
            </Text>
          )}
          <NutrientList values={entry} />
        </View>
        <Button
          title={t('mealDetail.deleteAction')}
          variant="outline"
          leftIcon={<Icon name="trash-outline" destructive size={18} />}
          labelStyle={styles.deleteLabel}
          onPress={confirmDelete}
          fullWidth
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('mealDetail.title')} right={headerRight} />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p16,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  image: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: theme.metrics.borderRadius.xl,
    overflow: 'hidden',
  },
  section: {
    gap: theme.metrics.spacingV.p8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p16,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  deleteLabel: {
    color: theme.colors.state.error,
  },
  card: {
    gap: theme.metrics.spacingV.p16,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
}));
