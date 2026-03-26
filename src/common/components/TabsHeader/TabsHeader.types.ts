export interface TabsHeaderProps {
  title: string;
  onBack?: () => void;
  onSyncPress?: () => void;
  showSync?: boolean;
  backDisabled?: boolean;
}
