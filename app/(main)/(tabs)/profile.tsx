import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Card, Chip, Icon, ScreenContainer, Text } from '@/common/components';
import {
  deleteCurrentUserCloudNutritionData,
  disconnectCurrentSyncAccount,
  logout,
  resetAnonymousSession,
} from '@/features/auth/services/authService';
import { clearManagedFoodEntryImageCache } from '@/features/nutrition/services/foodEntryImageSync';
import {
  deleteUserProfile,
  getUserProfile,
  resetNutritionData,
} from '@/features/nutrition/services/nutritionDatabase';
import { useAppAlert } from '@/providers/app-alert';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';

export default function ProfileTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const appAlert = useAppAlert();
  const authUser = useAuthStore((state) => state.user);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingSyncAccount, setIsDeletingSyncAccount] = useState(false);
  const [isResettingAnonymousSession, setIsResettingAnonymousSession] = useState(false);
  const [profileSummary, setProfileSummary] = useState<{
    bmi: string;
    calorieTarget: string;
    age: string;
    height: string;
    weight: string;
    activityLevel: string;
    gender: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getUserProfile().then((profile) => {
        if (!active) {
          return;
        }

        if (!profile) {
          setProfileSummary(null);
          return;
        }

        setProfileSummary({
          bmi: profile.bmi.toFixed(1),
          calorieTarget: String(profile.dailyCalorieTarget),
          age: String(profile.age),
          height: String(profile.heightCm),
          weight: String(profile.weightKg),
          activityLevel: t(`welcomeScreen.activityLevels.${profile.activityLevel}`),
          gender: t(`welcomeScreen.genderOptions.${profile.gender}`),
        });
      });

      return () => {
        active = false;
      };
    }, [t])
  );

  const handleDeleteProfile = useCallback(() => {
    appAlert.alert(t('profileScreen.deleteConfirmTitle'), t('profileScreen.deleteConfirmMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          setIsDeletingProfile(true);

          void deleteUserProfile()
            .then(() => {
              setProfileSummary(null);
              toast.success(t('profileScreen.deleteSuccess'));
            })
            .catch(() => {
              toast.error(t('profileScreen.actionError'));
            })
            .finally(() => {
              setIsDeletingProfile(false);
            });
        },
      },
    ]);
  }, [appAlert, t]);

  const handleResetData = useCallback(() => {
    appAlert.alert(t('profileScreen.resetConfirmTitle'), t('profileScreen.resetConfirmMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          setIsResettingData(true);

          void (async () => {
            if (!authUser?.isAnonymous) {
              await deleteCurrentUserCloudNutritionData();
            }

            await resetNutritionData();
            await clearManagedFoodEntryImageCache();
          })()
            .then(() => {
              setProfileSummary(null);
              toast.success(t('profileScreen.resetSuccess'));
            })
            .catch((error: unknown) => {
              const message =
                error instanceof Error ? error.message : t('profileScreen.actionError');
              toast.error(message);
            })
            .finally(() => {
              setIsResettingData(false);
            });
        },
      },
    ]);
  }, [appAlert, authUser?.isAnonymous, t]);

  const handleDeleteSyncAccount = useCallback(() => {
    appAlert.alert(
      t('profileScreen.deleteSyncAccountConfirmTitle'),
      t('profileScreen.deleteSyncAccountConfirmMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profileScreen.deleteSyncAccountAction'),
          style: 'destructive',
          onPress: () => {
            setIsDeletingSyncAccount(true);

            void disconnectCurrentSyncAccount()
              .then(() => {
                toast.success(t('profileScreen.deleteSyncAccountSuccess'));
              })
              .catch((error: unknown) => {
                const message =
                  error instanceof Error ? error.message : t('profileScreen.actionError');
                toast.error(message);
              })
              .finally(() => {
                setIsDeletingSyncAccount(false);
              });
          },
        },
      ]
    );
  }, [appAlert, t]);

  const handleSignOut = useCallback(() => {
    appAlert.alert(t('profileScreen.logoutConfirmTitle'), t('profileScreen.logoutConfirmMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('profileScreen.logoutAction'),
        style: 'destructive',
        onPress: () => {
          setIsSigningOut(true);

          void logout()
            .then(() => {
              toast.success(t('profileScreen.logoutSuccess'));
            })
            .catch((error: unknown) => {
              const message =
                error instanceof Error ? error.message : t('profileScreen.actionError');
              toast.error(message);
            })
            .finally(() => {
              setIsSigningOut(false);
            });
        },
      },
    ]);
  }, [appAlert, t]);

  const handleResetAnonymousSession = useCallback(() => {
    appAlert.alert(
      t('profileScreen.debug.resetAnonymousSessionTitle'),
      t('profileScreen.debug.resetAnonymousSessionMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('profileScreen.debug.resetAnonymousSessionAction'),
          style: 'destructive',
          onPress: () => {
            setIsResettingAnonymousSession(true);

            void resetAnonymousSession()
              .then(() => {
                toast.success(t('profileScreen.debug.resetAnonymousSessionSuccess'));
              })
              .catch((error: unknown) => {
                const message =
                  error instanceof Error ? error.message : t('profileScreen.actionError');
                toast.error(message);
              })
              .finally(() => {
                setIsResettingAnonymousSession(false);
              });
          },
        },
      ]
    );
  }, [appAlert, t]);

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Icon name="body-outline" variant="inverse" size={22} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="h2">{t('profileScreen.title')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('profileScreen.subtitle')}
            </Text>
          </View>
          <Button
            title={t('profileScreen.editAction')}
            variant="secondary"
            size="sm"
            onPress={() => router.push('/welcome')}
          />
        </Card>

        {profileSummary ? (
          <>
            <Card variant="filled" style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text variant="h3">{t('profileScreen.goalTitle')}</Text>
                <Chip
                  label={`${profileSummary.calorieTarget} kcal`}
                  variant="outline"
                  icon={<Icon name="flash-outline" variant="accent" size={16} />}
                />
              </View>
              <View style={styles.goalGrid}>
                <View style={styles.goalMetric}>
                  <Text variant="caption" color="secondary">
                    {t('profileScreen.metrics.bmi')}
                  </Text>
                  <Text variant="h2">{profileSummary.bmi}</Text>
                </View>
                <View style={styles.goalMetric}>
                  <Text variant="caption" color="secondary">
                    {t('profileScreen.metrics.gender')}
                  </Text>
                  <Text variant="body" weight="semibold">
                    {profileSummary.gender}
                  </Text>
                </View>
                <View style={styles.goalMetric}>
                  <Text variant="caption" color="secondary">
                    {t('profileScreen.metrics.activity')}
                  </Text>
                  <Text variant="body" weight="semibold">
                    {profileSummary.activityLevel}
                  </Text>
                </View>
              </View>
            </Card>

            <Card variant="filled" style={styles.detailCard}>
              <Text variant="h3">{t('profileScreen.bodyMetricsTitle')}</Text>
              <View style={styles.detailRow}>
                <Text variant="bodySmall" color="secondary">
                  {t('welcomeScreen.fields.age')}
                </Text>
                <Text variant="body" weight="semibold">
                  {profileSummary.age}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="bodySmall" color="secondary">
                  {t('welcomeScreen.fields.height')}
                </Text>
                <Text variant="body" weight="semibold">
                  {`${profileSummary.height} ${t('common.units.cm')}`}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="bodySmall" color="secondary">
                  {t('welcomeScreen.fields.weight')}
                </Text>
                <Text variant="body" weight="semibold">
                  {`${profileSummary.weight} ${t('common.units.kg')}`}
                </Text>
              </View>
              <Button
                title={t('profileScreen.deleteAction')}
                variant="outline"
                loading={isDeletingProfile}
                disabled={isResettingData || isDeletingSyncAccount || isSigningOut}
                onPress={handleDeleteProfile}
              />
            </Card>
          </>
        ) : (
          <Card variant="filled" style={styles.emptyCard}>
            <Text variant="h3">{t('profileScreen.emptyTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('profileScreen.emptySubtitle')}
            </Text>
            <Button title={t('profileScreen.editAction')} onPress={() => router.push('/welcome')} />
          </Card>
        )}

        <Card variant="filled" style={styles.authCard}>
          <Text variant="h3">{t('profileScreen.account.dangerTitle')}</Text>

          <Button
            title={t('profileScreen.resetAction')}
            variant="outline"
            loading={isResettingData}
            disabled={isDeletingProfile || isDeletingSyncAccount || isSigningOut}
            onPress={handleResetData}
          />

          {!authUser?.isAnonymous ? (
            <Button
              title={t('profileScreen.deleteSyncAccountAction')}
              variant="outline"
              loading={isDeletingSyncAccount}
              disabled={isDeletingProfile || isResettingData || isSigningOut}
              onPress={handleDeleteSyncAccount}
            />
          ) : null}

          {!authUser?.isAnonymous ? (
            <View style={styles.authCopy}>
              <Text variant="bodySmall" color="secondary">
                {t('profileScreen.account.connectedSubtitle')}
              </Text>
            </View>
          ) : null}

          {__DEV__ ? (
            <Button
              title={t('profileScreen.debug.resetAnonymousSessionAction')}
              variant="outline"
              loading={isResettingAnonymousSession}
              disabled={
                isDeletingProfile || isResettingData || isDeletingSyncAccount || isSigningOut
              }
              onPress={handleResetAnonymousSession}
            />
          ) : null}

          <Button
            title={authUser?.isAnonymous ? t('auth.signIn') : t('profileScreen.logoutAction')}
            variant="primary"
            loading={isSigningOut}
            disabled={
              isDeletingProfile ||
              isResettingData ||
              isDeletingSyncAccount ||
              isResettingAnonymousSession
            }
            onPress={authUser?.isAnonymous ? () => router.push('/(auth)/login') : handleSignOut}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  heroIcon: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.secondary,
  },
  heroCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  goalCard: {
    gap: theme.metrics.spacingV.p16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p12,
  },
  goalMetric: {
    flex: 1,
    minWidth: '30%',
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  detailCard: {
    gap: theme.metrics.spacingV.p12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p12,
  },
  authCard: {
    gap: theme.metrics.spacingV.p12,
  },
  authCopy: {
    gap: theme.metrics.spacingV.p4,
  },
  dangerCopy: {
    gap: theme.metrics.spacingV.p4,
  },
}));
