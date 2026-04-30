export const STORAGE_KEYS = {
  device: {
    localId: 'device_local_id',
  },
  preferences: {
    theme: 'user_theme_preference',
    themePreset: 'user_theme_preset',
    language: 'user_language',
    onboardingCompleted: 'onboarding_completed',
    notificationsEnabled: 'notifications_enabled',
    calorieRemindersEnabled: 'calorie_reminders_enabled',
    calorieReminderBreakfastTime: 'calorie_reminder_breakfast_time',
    calorieReminderLunchTime: 'calorie_reminder_lunch_time',
    calorieReminderDinnerTime: 'calorie_reminder_dinner_time',
  },
  auth: {
    lastEmail: 'auth_last_email',
    anonymousSessionAttempted: 'auth_anonymous_session_attempted',
  },
  profile: {
    bmiProfile: 'profile_bmi_data',
  },
  app: {
    lastVersion: 'app_last_version',
    launchCount: 'app_launch_count',
    homeAiReviewHistory: 'home_ai_review_history',
  },
} as const;
