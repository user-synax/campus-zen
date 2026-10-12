import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { Feather } from "@expo/vector-icons";
import type { PostMediaItem } from "../lib/posts";
import { useTheme } from "../theme";

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ActiveVideo({ url, aspect }: { url: string; aspect: number }) {
  const player = useVideoPlayer(url, (p) => p.play());
  return (
    <VideoView
      player={player}
      style={[styles.video, { aspectRatio: aspect }]}
      contentFit="contain"
      nativeControls
    />
  );
}

function VideoCell({ item, single }: { item: PostMediaItem; single: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const aspect =
    item.width && item.height ? item.width / item.height : single ? 16 / 9 : 1;
  const dur = formatDuration(item.duration);

  if (expanded) return <ActiveVideo url={item.url} aspect={aspect} />;

  return (
    <Pressable
      onPress={() => setExpanded(true)}
      accessibilityRole="button"
      accessibilityLabel="Play video"
      style={[styles.videoPoster, single ? { aspectRatio: aspect } : styles.gridCell]}
    >
      {item.posterUrl ? (
        <Image
          source={{ uri: item.posterUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
      )}
      <View style={styles.scrim} />
      <View style={styles.playCircle}>
        <Feather name="play" size={20} color="#fff" />
      </View>
      {dur ? (
        <View style={styles.durBadge}>
          <Text style={styles.durText}>{dur}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Mirrors web PostMedia: single item in a 16px bordered frame, 2–4 in a
 * 2-column grid. Images render inline; video expands to a native player
 * on tap (poster-first, no autoplay in the feed).
 */
export function PostMedia({ items }: { items: PostMediaItem[] }) {
  const t = useTheme();
  if (!items.length) return null;

  if (items.length === 1) {
    const item = items[0];
    if (item.kind === "video") {
      return (
        <View style={[styles.frame, { borderColor: t.border }]}>
          <VideoCell item={item} single />
        </View>
      );
    }
    const aspect = item.width && item.height ? item.width / item.height : undefined;
    return (
      <View style={[styles.frame, { borderColor: t.border }]}>
        <Image
          source={{ uri: item.url }}
          style={[styles.single, aspect ? { aspectRatio: aspect } : styles.singleFallback]}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          accessibilityLabel="Post image"
        />
        {item.kind === "gif" ? (
          <View style={styles.gifBadge}>
            <Text style={styles.gifText}>GIF</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.frame, { borderColor: t.border }]}>
      <View style={styles.grid}>
        {items.map((item, i) => (
          <View key={`${item.url}-${i}`} style={styles.gridCellWrap}>
            {item.kind === "video" ? (
              <VideoCell item={item} single={false} />
            ) : (
              <Image
                source={{ uri: item.url }}
                style={styles.gridCell}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                accessibilityLabel="Post image"
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  single: { width: "100%", maxHeight: 510, minHeight: 200 },
  singleFallback: { height: 300 },
  gifBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gifText: { color: "#fff", fontSize: 11, lineHeight: 14, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  gridCellWrap: { width: "49%", flexGrow: 1 },
  gridCell: { width: "100%", aspectRatio: 1, minHeight: 140 },
  video: { width: "100%", backgroundColor: "#000" },
  videoPoster: { width: "100%", minHeight: 140, backgroundColor: "#000" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)" },
  playCircle: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  durBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durText: { color: "#fff", fontSize: 12, lineHeight: 16, fontWeight: "600" },
});
