import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
  modalRoot: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 960,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    zIndex: 2,
  },
  headerText: {
    color: theme.colors.shadow.onShadow,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      theme.colors.mode === 'dark' ? theme.colors.background.elevated : theme.colors.overlay.modal,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  footerTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  footerSafeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    zIndex: 2,
  },
  footerSafeAreaTablet: {
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p24,
  },
  secondaryAction: {
    width: 46,
    height: 46,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      theme.colors.mode === 'dark' ? theme.colors.background.elevated : theme.colors.overlay.modal,
  },
  secondaryActionTablet: {
    width: 58,
    height: 58,
  },
  secondaryActionDisabled: {
    opacity: 0.45,
  },
  captureOuter: {
    width: 82,
    height: 82,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 4,
    borderColor: theme.colors.shadow.onShadow,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.focus,
  },
  captureOuterTablet: {
    width: 96,
    height: 96,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.shadow.onShadow,
  },
  captureInnerTablet: {
    width: 70,
    height: 70,
  },
  captureDisabled: {
    opacity: 0.6,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p16,
  },
  scanFrame: {
    width: 300,
    height: 300,
    borderWidth: 3,
    borderRadius: theme.metrics.borderRadius.md,
    borderColor: theme.colors.shadow.onShadow,
  },
  scanFocusDot: {
    width: 12,
    height: 12,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.shadow.onShadow,
  },
  scanHint: {
    color: theme.colors.shadow.onShadow,
    textAlign: 'center',
  },
  scanModeSpacer: {
    width: 82,
    height: 82,
  },
  scanModeSpacerTablet: {
    width: 96,
    height: 96,
  },
}));
