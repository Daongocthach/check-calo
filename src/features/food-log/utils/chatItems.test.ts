import { describe, expect, it } from '@jest/globals';
import type { ChatFoodItem } from '../services/foodAnalyzer';
import { editChatItem, removeChatItem, scaleChatItem, toPortion } from './chatItems';
import { EMPTY_NUTRIENTS } from './nutrients';

function createItem(name: string, calories: number): ChatFoodItem {
  return {
    ...EMPTY_NUTRIENTS,
    sodiumMg: 800,
    name,
    quantityLabel: '1 bowl',
    quantityGrams: 400,
    calories,
    proteinGrams: 30,
    carbsGrams: 60,
    fatGrams: 10,
  };
}

const pho = createItem('Pho', 500);
const tea = createItem('Iced tea', 20);
const state = { items: [pho, tea], baseItems: [pho, tea], scales: [1, 1] };

describe('chat item edits', () => {
  it('scales from the estimate, not from the last scale', () => {
    const doubled = scaleChatItem(state, 0, 2);
    const halved = scaleChatItem(doubled, 0, 0.5);

    expect(doubled.items[0]).toMatchObject({
      quantityLabel: '2 × 1 bowl',
      quantityGrams: 800,
      calories: 1000,
      proteinGrams: 60,
      sodiumMg: 1600,
      fiberGrams: null,
    });
    expect(halved.items[0]).toMatchObject({ quantityLabel: '½ × 1 bowl', calories: 250 });
    expect(halved.scales).toEqual([0.5, 1]);
    expect(scaleChatItem(halved, 0, 1).items[0]).toBe(pho);
  });

  it('ignores scales that are not offered', () => {
    expect(scaleChatItem(state, 0, 3)).toBe(state);
  });

  it('makes an edit the new estimate and resets its scale', () => {
    const edited = { ...pho, name: 'Pho tai', calories: 450 };
    const next = editChatItem(scaleChatItem(state, 0, 2), 0, edited);

    expect(next.items[0]).toBe(edited);
    expect(next.scales).toEqual([1, 1]);
    expect(scaleChatItem(next, 0, 2).items[0].calories).toBe(900);
  });

  it('removes a food with its scale', () => {
    const next = removeChatItem(scaleChatItem(state, 1, 2), 0);

    expect(next.items.map((item) => item.name)).toEqual(['Iced tea']);
    expect(next.scales).toEqual([2]);
  });

  it('cuts a food down to a smaller portion', () => {
    expect(toPortion(pho, 'twoThirds')).toMatchObject({
      quantityLabel: '⅔ × 1 bowl',
      calories: 333,
    });
  });
});
