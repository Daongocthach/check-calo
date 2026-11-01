import { createContext, useContext, useState, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

/** Widest a screen's content grows; wider windows (iPad) centre it with side gutters. */
export const CONTENT_MAX_WIDTH = 720;

const ContentWidthContext = createContext<number | null>(null);

export interface ContentColumnProps {
  children: ReactNode;
}

/**
 * Centres a screen in a column capped at `CONTENT_MAX_WIDTH`. Phones are narrower than the cap,
 * so it only changes the layout on tablets. Descendants read the column width with
 * `useContentWidth()` instead of the window width.
 */
export function ContentColumn({ children }: ContentColumnProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const width = measuredWidth ?? Math.min(windowWidth, CONTENT_MAX_WIDTH);

  return (
    <View style={styles.page}>
      <View
        style={styles.column}
        onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      >
        <ContentWidthContext.Provider value={width}>{children}</ContentWidthContext.Provider>
      </View>
    </View>
  );
}

/** Width available to the current screen's content: its column, or the window outside one. */
export function useContentWidth(): number {
  const columnWidth = useContext(ContentWidthContext);
  const { width } = useWindowDimensions();

  return columnWidth ?? width;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
});
