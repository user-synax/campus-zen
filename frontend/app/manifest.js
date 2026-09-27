export default function manifest() {
  return {
    name: "CampusZen — Student Social Network",
    short_name: "CampusZen",
    description:
      "CampusZen is a student-first social network to discover students, share thoughts, and stay connected to campus life across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/campusZen.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/campusZen.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
