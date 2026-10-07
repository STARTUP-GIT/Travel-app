/**
 * About.
 *
 * All copy here is admin-controlled through `GET /api/settings`, so rebranding,
 * legal text and contact details are an admin action rather than a code change.
 * The app shell already holds this config, so the screen renders from context and
 * makes no request of its own.
 */

import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { RemoteImage } from "@/components/ui/remote-image";
import { useAppShell } from "@/providers/app-shell-provider";
import { colors, radii, spacing, typography } from "@/theme";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { config } = useAppShell();

  const contact = config.contacts?.trim();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={styles.header}>
        <RemoteImage
          uri={config.icon || null}
          style={styles.icon}
          fallbackLabel={config.app_name}
          radius={radii.xl}
          accessibilityLabel={`${config.app_name} logo`}
        />
        <Text style={styles.name}>{config.app_name}</Text>
        <Text style={styles.tagline}>{config.text}</Text>
      </View>

      <Card>
        <Text style={styles.description}>{config.app_description}</Text>
      </Card>

      {config.termsandconditions?.trim() ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms and conditions</Text>
          <Text style={styles.body}>{config.termsandconditions}</Text>
        </View>
      ) : null}

      {config.privacy?.trim() ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.body}>{config.privacy}</Text>
        </View>
      ) : null}

      {contact ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Card>
            <InfoRow label="Support" value={contact} />
          </Card>

          {/^(https?:\/\/|mailto:|tel:)/i.test(contact) ? (
            <View style={styles.contactRow}>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
              <Text
                accessibilityRole="link"
                onPress={() => void Linking.openURL(contact)}
                style={styles.contactLink}
              >
                Open contact details
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  icon: { width: 96, height: 96 },
  name: { ...typography.title, color: colors.text, marginTop: spacing.lg },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  description: { ...typography.body, color: colors.textSecondary },
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary },
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  contactLink: { ...typography.smallStrong, color: colors.primary },
});