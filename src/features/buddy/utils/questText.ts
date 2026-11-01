import type { BuddyQuest } from '../types';

/** A quest's title in the app language, else English, else whatever it has. */
export function getQuestTitle(quest: BuddyQuest, language: string) {
  return quest.title[language] ?? quest.title.en ?? Object.values(quest.title)[0] ?? quest.id;
}
