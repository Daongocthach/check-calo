import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ChatFoodItem } from '../services/foodAnalyzer';
import {
  editChatItem,
  removeChatItem,
  scaleChatItem,
  type ChatItemState,
} from '../utils/chatItems';
import type { ChatMessage } from './useFoodChat';

/** Corrections to the foods on a chat card before it is saved: edit, remove, rescale. */
export function useChatItemEdits(setMessages: Dispatch<SetStateAction<ChatMessage[]>>) {
  /** Applies a change to one assistant message's foods while none of them is saved yet. */
  const updateUnsavedItems = useCallback(
    (messageId: string, change: (state: ChatItemState) => ChatItemState) => {
      setMessages((previous) =>
        previous.map((message) => {
          if (
            message.id !== messageId ||
            message.role !== 'assistant' ||
            Object.keys(message.loggedEntryIds).length > 0
          ) {
            return message;
          }

          const next = change({
            items: message.items,
            baseItems: message.baseItems ?? message.items,
            scales: message.itemScales ?? message.items.map(() => 1),
          });
          return {
            ...message,
            items: next.items,
            baseItems: next.baseItems,
            itemScales: next.scales,
          };
        })
      );
    },
    [setMessages]
  );

  const editMessageItem = useCallback(
    (messageId: string, itemIndex: number, item: ChatFoodItem) =>
      updateUnsavedItems(messageId, (state) => editChatItem(state, itemIndex, item)),
    [updateUnsavedItems]
  );

  /** Drops a food Check AI found by mistake. */
  const removeMessageItem = useCallback(
    (messageId: string, itemIndex: number) =>
      updateUnsavedItems(messageId, (state) => removeChatItem(state, itemIndex)),
    [updateUnsavedItems]
  );

  const scaleMessageItem = useCallback(
    (messageId: string, itemIndex: number, factor: number) =>
      updateUnsavedItems(messageId, (state) => scaleChatItem(state, itemIndex, factor)),
    [updateUnsavedItems]
  );

  return { editMessageItem, removeMessageItem, scaleMessageItem };
}
