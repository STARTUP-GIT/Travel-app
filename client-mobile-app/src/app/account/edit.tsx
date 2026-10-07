/**
 * Edit profile.
 *
 * The backend's edit-profile route takes name, username, email, phonenumber and
 * profilepic only — there is no password field — so this form deliberately omits
 * one rather than implying a password change that would silently do nothing.
 *
 * Identity always comes from the session token, so no user id is sent.
 */

import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { RemoteImage } from "@/components/ui/remote-image";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { updateProfile, uploadProfilePhoto } from "@/services/profile.service";
import { EMAIL_PATTERN } from "@/lib/form-validation";
import { ApiError, toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, typography } from "@/theme";

type Values = {
  name: string;
  username: string;
  email: string;
  phonenumber: string;
};

const EMPTY: Values = { name: "", username: "", email: "", phonenumber: "" };

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { profile, refreshProfile } = useAuth();

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed from the loaded profile once, so a slow profile fetch does not overwrite
  // text the user has already started typing.
  useEffect(() => {
    if (!profile) return;
    setValues({
      name: profile.name ?? "",
      username: profile.username ?? "",
      email: profile.email ?? "",
      phonenumber: profile.phonenumber ?? "",
    });
    setPhoto(profile.profilepic ?? null);
  }, [profile]);

  const update = (key: keyof Values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const next: Partial<Record<keyof Values, string>> = {};

    if (values.name.trim().length < 2) next.name = "Enter your full name.";
    if (values.username.trim().length < 3) next.username = "Usernames are at least 3 characters.";
    if (!EMAIL_PATTERN.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!/^\d{10,15}$/.test(values.phonenumber.trim())) {
      next.phonenumber = "Enter a phone number of 10 to 15 digits.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        toast.show("Photo access was declined", "info");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);
      try {
        // Uploaded immediately: the URL is what the profile record stores, so
        // there is no local blob to send with the save.
        const url = await uploadProfilePhoto({
          uri: asset.uri,
          name: asset.fileName ?? "profile.png",
          mimeType: asset.mimeType ?? "image/png",
          size: asset.fileSize ?? undefined,
        });
        setPhoto(url);
      } finally {
        setUploading(false);
      }
    } catch (cause) {
      toast.show(toUserMessage(cause), "error");
    }
  };

  const save = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await updateProfile({
        name: values.name.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        phonenumber: values.phonenumber.trim(),
        ...(photo ? { profilepic: photo } : {}),
      });

      await refreshProfile();
      toast.show("Profile updated", "success");
      router.back();
    } catch (cause) {
      // Field-level failures are surfaced next to their input; anything else is a
      // general message rather than a guessed field.
      if (cause instanceof ApiError && cause.kind === "validation") {
        const byField: Record<string, string | undefined> = {};
        for (const entry of cause.fieldErrors ?? []) {
          byField[entry.field] = entry.message;
        }

        setErrors({
          name: byField.name ?? byField.fullname,
          username: byField.username,
          email: byField.email,
          phonenumber: byField.phonenumber ?? byField.phone,
        });
        toast.show("Please check the highlighted fields", "info");
      } else {
        toast.show(toUserMessage(cause), "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarBlock}>
        <RemoteImage
          uri={photo}
          style={styles.avatar}
          fallbackLabel={values.name}
          radius={radii.pill}
          accessibilityLabel="Your profile photo"
        />
        <Button
          label={uploading ? "Uploading…" : "Change photo"}
          variant="ghost"
          size="sm"
          icon="camera-outline"
          loading={uploading}
          onPress={() => void pickPhoto()}
        />
      </View>

      <TextField
        label="Full name"
        value={values.name}
        onChangeText={update("name")}
        error={errors.name}
        required
      />

      <TextField
        label="Username"
        value={values.username}
        onChangeText={update("username")}
        error={errors.username}
        autoCapitalize="none"
        required
      />

      <TextField
        label="Email"
        value={values.email}
        onChangeText={update("email")}
        error={errors.email}
        inputType="email"
        required
      />

      <TextField
        label="Phone number"
        value={values.phonenumber}
        onChangeText={update("phonenumber")}
        error={errors.phonenumber}
        inputType="phone"
        required
      />

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Your email and username identify your account. Changing either may require
          signing in again.
        </Text>
      </View>

      <Button
        label="Save changes"
        icon="checkmark-outline"
        size="lg"
        fullWidth
        loading={saving}
        onPress={() => void save()}
        style={styles.save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  avatarBlock: { alignItems: "center", marginBottom: spacing.xl },
  avatar: { width: 96, height: 96 },
  note: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  noteText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  save: { marginTop: spacing.xl },
});