import type { ChatFoodItem } from '../services/foodAnalyzer';
import { PORTION_FACTORS, type MealPortion } from './mealImpact';
import { pickNutrients } from './nutrients';

const PORTION_SYMBOLS: Record<MealPortion, string> = { twoThirds: '⅔', half: '½' };

/** Quantity scales offered on a chat card, applied to what Check AI estimated. */
export const CHAT_ITEM_SCALES = [
  { factor: 0.5, symbol: '½' },
  { factor: 1, symbol: '1' },
  { factor: 1.5, symbol: '1½' },
  { factor: 2, symbol: '2' },
] as const;

/** A card's foods, what they were before scaling, and the scale picked for each. */
export interface ChatItemState {
  items: ChatFoodItem[];
  baseItems: ChatFoodItem[];
  scales: number[];
}

/** The item scaled by `factor`, its quantity prefixed with `symbol`, e.g. "⅔ × 1 bowl". */
function scaleItem(item: ChatFoodItem, factor: number, symbol: string): ChatFoodItem {
  const scale = (value: number | null) =>
    value === null ? null : Math.round(value * factor * 10) / 10;
  const nutrients = Object.fromEntries(
    Object.entries(pickNutrients(item)).map(([key, value]) => [key, scale(value)])
  );

  return {
    ...item,
    ...nutrients,
    quantityLabel: item.quantityLabel ? `${symbol} × ${item.quantityLabel}` : symbol,
    quantityGrams: item.quantityGrams === null ? null : Math.round(item.quantityGrams * factor),
    calories: Math.round(item.calories * factor),
    proteinGrams: scale(item.proteinGrams) ?? 0,
    carbsGrams: scale(item.carbsGrams) ?? 0,
    fatGrams: scale(item.fatGrams) ?? 0,
  };
}

/** The item cut down to a smaller portion before it is saved. */
export function toPortion(item: ChatFoodItem, portion: MealPortion) {
  return scaleItem(item, PORTION_FACTORS[portion], PORTION_SYMBOLS[portion]);
}

function replaceAt<T>(values: T[], index: number, value: T) {
  return values.map((current, position) => (position === index ? value : current));
}

/** Replaces a food with the user's corrections; its scale starts over at 1. */
export function editChatItem(state: ChatItemState, index: number, item: ChatFoodItem) {
  return {
    items: replaceAt(state.items, index, item),
    baseItems: replaceAt(state.baseItems, index, item),
    scales: replaceAt(state.scales, index, 1),
  };
}

export function removeChatItem(state: ChatItemState, index: number) {
  return {
    items: state.items.filter((_, position) => position !== index),
    baseItems: state.baseItems.filter((_, position) => position !== index),
    scales: state.scales.filter((_, position) => position !== index),
  };
}

/** Scales a food from what Check AI estimated; unknown factors leave the state as is. */
export function scaleChatItem(state: ChatItemState, index: number, factor: number) {
  const option = CHAT_ITEM_SCALES.find((scale) => scale.factor === factor);
  const base = state.baseItems[index];

  if (!option || !base) {
    return state;
  }

  return {
    items: replaceAt(
      state.items,
      index,
      factor === 1 ? base : scaleItem(base, factor, option.symbol)
    ),
    baseItems: state.baseItems,
    scales: replaceAt(state.scales, index, factor),
  };
}
