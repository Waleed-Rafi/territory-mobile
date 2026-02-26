import React, { createContext, useCallback, useContext, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { CheckCircle, AlertCircle, Info } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../theme";

export type AlertVariant = "success" | "error" | "info";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AlertOptions {
  title: string;
  message: string;
  variant?: AlertVariant;
  buttons?: AlertButton[];
}

function inferVariant(title: string): AlertVariant {
  const t = title.toLowerCase();
  if (t === "error") return "error";
  if (t === "success") return "success";
  return "info";
}

type AlertContextValue = {
  show: (options: AlertOptions | string, message?: string) => void;
  /** Show alert and resolve with the index of the button pressed (0, 1, ...) or undefined if dismissed. */
  showAsync: (options: AlertOptions) => Promise<number | undefined>;
};

const defaultAlertValue: AlertContextValue = {
  show: () => {},
  showAsync: () => Promise.resolve(undefined),
};

const AlertContext = createContext<AlertContextValue>(defaultAlertValue);

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  return ctx ?? defaultAlertValue;
}

interface AlertProviderProps {
  children: React.ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const resolveRef = React.useRef<(index: number | undefined) => void>(() => {});

  const show = useCallback((opts: AlertOptions | string, message?: string) => {
    resolveRef.current = () => {};
    const resolved: AlertOptions =
      typeof opts === "string"
        ? { title: message ? opts : "Territory", message: message ?? opts, buttons: [{ text: "OK" }] }
        : { ...opts, buttons: opts.buttons?.length ? opts.buttons : [{ text: "OK" }] };
    if (resolved.variant == null) resolved.variant = inferVariant(resolved.title);
    setOptions(resolved);
    setVisible(true);
  }, []);

  const showAsync = useCallback((opts: AlertOptions) => {
    const resolved: AlertOptions = {
      ...opts,
      variant: opts.variant ?? inferVariant(opts.title),
      buttons: opts.buttons?.length ? opts.buttons : [{ text: "OK" }],
    };
    setOptions(resolved);
    setVisible(true);
    return new Promise<number | undefined>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setOptions(null);
    resolveRef.current(undefined);
  }, []);

  const handlePress = useCallback(
    (button: AlertButton, index: number) => {
      setVisible(false);
      setOptions(null);
      resolveRef.current(index);
      button.onPress?.();
    },
    []
  );

  return (
    <AlertContext.Provider value={{ show, showAsync }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={hide}
      >
        <Pressable style={styles.overlay} onPress={hide}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {options ? (
              <>
                <View style={styles.titleRow}>
                  <View style={styles.titleRowInner}>
                    <View style={[styles.iconWrap, options.variant === "success" ? styles.iconWrap_success : options.variant === "error" ? styles.iconWrap_error : styles.iconWrap_info]}>
                      {options.variant === "success" && <CheckCircle size={20} color={colors.primary} strokeWidth={2.5} />}
                      {options.variant === "error" && <AlertCircle size={20} color={colors.destructive} strokeWidth={2.5} />}
                      {(options.variant === "info" || !options.variant) && <Info size={20} color={colors.mutedForeground} strokeWidth={2} />}
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{options.title}</Text>
                  </View>
                </View>
                <Text style={styles.message}>{options.message}</Text>
                <View style={[styles.buttons, options.buttons!.length === 1 && styles.buttonsSingle]}>
                  {options.buttons!.map((btn, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.button,
                        options.buttons!.length === 1 && styles.buttonFull,
                        options.buttons!.length >= 2 && styles.buttonFlex,
                        btn.style === "destructive" && styles.buttonDestructive,
                        btn.style === "cancel" && styles.buttonCancel,
                      ]}
                      onPress={() => handlePress(btn, i)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          btn.style === "destructive" && styles.buttonTextDestructive,
                          btn.style === "cancel" && styles.buttonTextCancel,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

const CARD_PADDING = 24;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: CARD_PADDING,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: "#161f2e",
    paddingHorizontal: CARD_PADDING,
    paddingTop: CARD_PADDING + 4,
    paddingBottom: CARD_PADDING,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 32,
      },
      android: { elevation: 24 },
    }),
  },
  titleRow: {
    alignSelf: "stretch",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  titleRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap_success: { backgroundColor: "rgba(0, 255, 136, 0.14)" },
  iconWrap_error: { backgroundColor: "rgba(239, 68, 68, 0.14)" },
  iconWrap_info: { backgroundColor: "rgba(100, 116, 139, 0.2)" },
  title: {
    fontFamily: typography.display,
    fontSize: 17,
    color: colors.foreground,
  },
  message: {
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
    alignSelf: "stretch",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "stretch",
    gap: 12,
    alignSelf: "stretch",
    width: "100%",
  },
  buttonsSingle: {
    width: "100%",
  },
  buttonFull: {
    flex: 1,
    alignSelf: "stretch",
  },
  buttonFlex: {
    flex: 1,
    minWidth: 0,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: colors.destructive,
  },
  buttonText: {
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    color: colors.primaryForeground,
  },
  buttonTextCancel: {
    color: colors.foreground,
  },
  buttonTextDestructive: {
    color: colors.destructiveForeground,
  },
});
