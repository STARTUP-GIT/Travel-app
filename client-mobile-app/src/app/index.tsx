/**
 * Full-screen tourism landing hero for ATLASWANDERS.
 * Exact mobile replica of frontend/app/page.tsx and frontend/components/shared/top-bar.tsx.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppShell } from "@/providers/app-shell-provider";
import { useAuth } from "@/providers/auth-provider";
import { Logo } from "@/components/ui/logo";

const DESTINATION_HINTS = [
  "Mysuru Palace",
  "Hampi",
  "Jog Falls",
  "Coorg",
  "Gokarna",
  "Kerala",
  "Goa",
  "Taj Mahal",
];

const FALLBACK_LANDING_SLIDES = [
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/1920px-Mysore_Palace_Morning.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Complex_of_Virupaksha_Temple%2C_Hampi_%2804%29.jpg/1920px-Complex_of_Virupaksha_Temple%2C_Hampi_%2804%29.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Jog_Falls_05092016.jpg/1920px-Jog_Falls_05092016.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Abbey_Falls_New.jpg/1920px-Abbey_Falls_New.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/8/8f/Bangalore_Mysore_Maharaja_Palace.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/d/dd/Delight_india.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Kumarkom.jpg/1920px-Kumarkom.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Palolem_Beach%2C_South_Goa.jpg/1920px-Palolem_Beach%2C_South_Goa.jpg",
  "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1920px-Taj_Mahal_%28Edited%29.jpeg",
];

const FALLBACK_INTRO =
  "Discover heritage, nature, culture and unforgettable destinations across India — then book guides, stays and experiences.";

const SLIDE_INTERVAL_MS = 6000;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useAppShell();
  const { isSignedIn, profile } = useAuth();

  const displayBrandName = (config.app_name || "ATLASWANDERS").trim();
  const displayTagline = (
    config.text ||
    "Discover Places. Experience Local."
  ).trim();
  const intro = (config.app_description || FALLBACK_INTRO).trim();

  // Slideshow images: admin-configured banners or fallback gallery
  const slides = useMemo(() => {
    const banners = (config.imageBanners ?? []).filter((b) => Boolean(b?.trim()));
    return banners.length > 0 ? banners : FALLBACK_LANDING_SLIDES;
  }, [config.imageBanners]);

  const [slideIndex, setSlideIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setSlideIndex((prev) => (prev + 1) % slides.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [slides.length, fadeAnim]);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const firstName = profile?.name ? profile.name.split(" ")[0] : "Customer";

  return (
    <View style={styles.container}>
      {/* 1. Full-screen background photography layer */}
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <Image
            source={{ uri: slides[slideIndex] }}
            style={styles.backgroundImage}
            contentFit="cover"
            priority="high"
            transition={300}
          />
        </Animated.View>

        {/* 2. Dedicated dark navy / black overlay (matching frontend gradient) */}
        <LinearGradient
          colors={[
            "rgba(11, 37, 69, 0.82)",
            "rgba(0, 0, 0, 0.55)",
            "rgba(11, 37, 69, 0.90)",
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* 3. TopBar (matching frontend TopBar) */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topBarInner}>
          {/* Logo & Brand text */}
          <Pressable
            onPress={() => router.push("/")}
            style={styles.logoRow}
            accessibilityRole="button"
            accessibilityLabel={`${displayBrandName} home`}
          >
            <Logo variant="on-dark" />
          </Pressable>

          {/* Action buttons: Bell & Login/Profile */}
          <View style={styles.topBarActions}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push("/about");
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityLabel="About app"
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </Pressable>

            {isSignedIn ? (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push("/profile");
                }}
                style={styles.avatarBtn}
                accessibilityLabel="My profile"
              >
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push("/login");
                }}
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityLabel="Log in"
              >
                <Text style={styles.loginBtnText}>Login</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* 4. Hero Content Layer — Centered vertically & horizontally */}
      <ScrollView
        contentContainerStyle={[
          styles.heroScrollContent,
          {
            paddingBottom: insets.bottom + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.heroInner}>
          {/* Eyebrow / Tagline */}
          <Text style={styles.eyebrow} numberOfLines={2}>
            {displayTagline}
          </Text>

          {/* 3-Line Heading: Exactly WELCOME / TO / {displayBrandName} */}
          <View style={styles.headingGroup}>
            <Text style={styles.welcomeText}>WELCOME</Text>
            <Text style={styles.toText}>TO</Text>
            <Text style={styles.brandNameText} numberOfLines={2}>
              {displayBrandName}
            </Text>
          </View>

          {/* Supporting Description */}
          <Text style={styles.introText}>{intro}</Text>

          {/* CTA Destination Button & Quick Destination Links */}
          <View style={styles.ctaContainer}>
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push("/explore");
              }}
              style={({ pressed }) => [
                styles.chooseBtn,
                pressed && styles.chooseBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Choose destination"
            >
              <Ionicons name="map" size={18} color="#FFFFFF" style={styles.btnIcon} />
              <Text style={styles.chooseBtnText}>CHOOSE DESTINATION</Text>
            </Pressable>

            {/* Popular destination hints chips */}
            <View style={styles.hintsWrap}>
              {DESTINATION_HINTS.map((name, i) => (
                <View key={name} style={styles.hintItem}>
                  {i > 0 && <Text style={styles.hintDot}>•</Text>}
                  <Pressable
                    onPress={() => {
                      triggerHaptic();
                      router.push("/explore");
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.hintText}>{name}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 5. Footer navigation links */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => {
              triggerHaptic();
              router.push("/about");
            }}
            style={styles.footerLink}
          >
            <Ionicons name="phone-portrait-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.footerText}>About App</Text>
          </Pressable>

          <Text style={styles.footerDot}>•</Text>

          <Pressable
            onPress={() => {
              triggerHaptic();
              router.push("/report");
            }}
            style={styles.footerLink}
          >
            <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.footerText}>Report Issue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B2545",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },

  /* Top Bar */
  topBar: {
    backgroundColor: "rgba(11, 37, 69, 0.75)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    zIndex: 20,
  },
  topBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    minHeight: 52,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(11, 37, 69, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(217, 164, 65, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTextCol: {
    justifyContent: "center",
    flexShrink: 1,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    color: "#D9A441",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 1,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D9A441",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },

  /* Hero Content */
  heroScrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  heroInner: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    marginVertical: "auto",
    paddingVertical: 12,
  },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FDE68A",
    textTransform: "uppercase",
    letterSpacing: 2.2,
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headingGroup: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.95)",
    letterSpacing: 4,
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  toText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FCD34D",
    letterSpacing: 4.5,
    textTransform: "uppercase",
    marginVertical: 4,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandNameText: {
    fontSize: Math.min(width * 0.09, 38),
    fontWeight: "900",
    color: "#FFFFFF",
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    maxWidth: 380,
    marginBottom: 26,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* CTA */
  ctaContainer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  chooseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 300,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#059669",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  chooseBtnPressed: {
    backgroundColor: "#047857",
    transform: [{ scale: 0.98 }],
  },
  btnIcon: {
    marginRight: 8,
  },
  chooseBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  /* Destination hints */
  hintsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    maxWidth: 360,
  },
  hintItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
  },
  hintDot: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    marginHorizontal: 6,
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 11.5,
    fontWeight: "500",
    textDecorationLine: "underline",
  },

  /* Footer */
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    gap: 12,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  footerDot: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
  },
});
