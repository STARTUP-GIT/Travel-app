/**
 * Report a listing or a problem.
 *
 * There is no public report endpoint on the backend, so a submission is recorded on
 * the device — the same behaviour as the customer web frontend. The screen says so
 * plainly: promising that a report reached the tourism office when it did not
 * would be worse than storing it.
 *
 * When the report is about a specific listing, `refId`/`refType` are passed by the
 * calling screen so the record identifies what was reported without needing a
 * foreign key.
 */

import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Chip } from "@/components/ui/badge";
import { useToast } from "@/providers/toast-provider";
import {
  REPORT_TOPICS,
  saveReport,
  type ReportTopic,
} from "@/services/reports.service";
import { colors, spacing, typography } from "@/theme";

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [topic, setTopic] = useState<ReportTopic>("place");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [errors, setErrors] = useState<{ description?: string; contact?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (description.trim().length < 10) {
      next.description = "Please describe the issue in at least 10 characters.";
    }
    // Optional, but if given it must be something a person can actually be reached on.
    if (contact.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) {
      next.contact = "Enter a valid email address, or leave this blank.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await saveReport({
        topic,
        description: description.trim(),
        contact: contact.trim() || undefined,
      });

      toast.show("Report saved on this device", "success");
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.noticeText}>
            Reports are stored on this device. The backend does not yet accept public
            report submissions, so this is a personal record rather than a message
            sent to the tourism office.
          </Text>
        </View>

        <Text style={styles.label}>What is this about?</Text>
        <View style={styles.topics}>
          {REPORT_TOPICS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={item.id === topic}
              onPress={() => setTopic(item.id)}
            />
          ))}
        </View>

        <TextField
          label="Describe the problem"
          value={description}
          onChangeText={setDescription}
          error={errors.description}
          placeholder="What is wrong or missing?"
          hint="Include the place name and anything that would help someone fix it."
          multiline
          required
        />

        <TextField
          label="Your email (optional)"
          value={contact}
          onChangeText={setContact}
          error={errors.contact}
          inputType="email"
          placeholder="you@example.com"
          hint="Optional. Recorded alongside the report so a follow-up is possible."
        />

        <Button
          label="Save report"
          icon="checkmark-outline"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: colors.infoLight,
    marginBottom: spacing.xl,
  },
  noticeText: { ...typography.small, color: colors.info, flex: 1 },
  label: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  topics: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
});