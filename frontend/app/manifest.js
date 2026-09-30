export default function manifest() {
  return {
    name: "CampusZen — Student Social Network",
    short_name: "CampusZen",
    description:
      "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/campusZen.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
