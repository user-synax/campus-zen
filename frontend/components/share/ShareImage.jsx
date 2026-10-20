/**
 * The actual PNG artwork used for link unfurls and downloads.
 *
 * Rendered by Satori through next/og, so this file sticks to the supported
 * subset: flexbox only, divs for text, px units and explicit image sizes.
 * Keep the visual language in sync with the HTML previews in ShareDialog.
 */

const BRAND = {
  name: "CampusZen",
  domain: "campuszen.tech",
  tagline: "Open source social media for students.",
};

const INK = "#f4f8fb";
const MUTED = "#9fb3c4";
const ACCENT = "#1d9bf0";
const BG = "#070d13";

function BrandMark({ data, story }) {
  const size = story ? 82 : 52;
  if (data.logoData) {
    return (
      // biome-ignore lint/performance/noImgElement: Satori only renders raw img elements
      <img
        src={data.logoData}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: story ? 24 : 15,
          marginRight: story ? 22 : 15,
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: story ? 24 : 15,
        marginRight: story ? 22 : 15,
        backgroundColor: ACCENT,
        color: "#ffffff",
        fontSize: story ? 34 : 22,
        fontWeight: 700,
      }}
    >
      CZ
    </div>
  );
}

function Avatar({ data, story, dark = false }) {
  const size = story ? 74 : 48;
  if (data.avatarData) {
    return (
      // biome-ignore lint/performance/noImgElement: Satori only renders raw img elements
      <img
        src={data.avatarData}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          marginRight: story ? 20 : 13,
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        marginRight: story ? 20 : 13,
        backgroundColor: dark ? "rgba(255,255,255,0.12)" : "#d1d5db",
        color: dark ? INK : "#374151",
        fontSize: story ? 30 : 20,
        fontWeight: 700,
      }}
    >
      {data.initial || "C"}
    </div>
  );
}

function Kicker({ data, story }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.18)",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 999,
        padding: story ? "10px 24px" : "7px 16px",
        color: "rgba(255,255,255,0.72)",
        fontSize: story ? 22 : 15,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {data.kicker}
    </div>
  );
}

function Footer({ data, story }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
        <Avatar data={data} story={story} dark />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: INK,
              fontSize: story ? 32 : 22,
              fontWeight: 700,
              letterSpacing: -0.4,
            }}
          >
            {data.name}
          </div>
          <div
            style={{
              display: "flex",
              color: MUTED,
              fontSize: story ? 24 : 17,
              marginTop: story ? 3 : 1,
            }}
          >
            {data.authorLine}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          backgroundColor: ACCENT,
          color: "#ffffff",
          padding: story ? "18px 34px" : "13px 24px",
          fontSize: story ? 26 : 19,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {data.cta}
      </div>
    </div>
  );
}

export function ShareImage({ data, variant = "card" }) {
  const story = variant === "story";
  const hasMedia = Boolean(data.mediaData);
  const isArticle = data.kind === "article";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: BG,
        backgroundImage:
          "linear-gradient(135deg, #060c12 0%, #0b1b26 52%, #060c12 100%)",
        color: INK,
        fontFamily: "Inter",
        padding: story ? "92px 72px 104px" : "44px 54px 36px",
      }}
    >
      {/* Blueprint grid */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 64px)",
        }}
      />

      {/* Accent glows */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: story ? -240 : -260,
          right: story ? -180 : -150,
          width: story ? 820 : 700,
          height: story ? 820 : 700,
          borderRadius: 999,
          backgroundColor: "rgba(29,155,240,0.16)",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: story ? -320 : -300,
          left: story ? -260 : -220,
          width: story ? 900 : 760,
          height: story ? 900 : 760,
          borderRadius: 999,
          backgroundColor: "rgba(29,155,240,0.08)",
        }}
      />

      {!hasMedia ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: story ? 40 : 30,
            bottom: story ? -130 : -100,
            color: "rgba(29,155,240,0.12)",
            fontSize: story ? 560 : 420,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          “
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          height: "100%",
          justifyContent: "space-between",
        }}
      >
        {/* Brand lockup + content type */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <BrandMark data={data} story={story} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  color: INK,
                  fontSize: story ? 54 : 35,
                  fontWeight: 700,
                  letterSpacing: story ? -1.4 : -0.9,
                }}
              >
                {BRAND.name}
              </div>
              <div
                style={{
                  display: "flex",
                  color: MUTED,
                  fontSize: story ? 24 : 16,
                  marginTop: story ? 5 : 2,
                }}
              >
                {BRAND.tagline}
              </div>
            </div>
          </div>
          <Kicker data={data} story={story} />
        </div>

        {/* Post / article body */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            marginTop: story ? 70 : 22,
            marginBottom: story ? 62 : 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              paddingRight: hasMedia ? (story ? 46 : 42) : 0,
              minWidth: 0,
            }}
          >
            {isArticle ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    color: INK,
                    fontSize: story ? 68 : 47,
                    fontWeight: 700,
                    lineHeight: 1.16,
                    letterSpacing: story ? -2 : -1.4,
                  }}
                >
                  {data.title}
                </div>
                {data.excerpt ? (
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      color: MUTED,
                      fontSize: story ? 30 : 21,
                      lineHeight: 1.4,
                      marginTop: story ? 34 : 20,
                    }}
                  >
                    {data.excerpt}
                  </div>
                ) : null}
              </div>
            ) : data.quote ? (
              <div
                style={{
                  display: "flex",
                  color: INK,
                  fontSize: story ? 66 : 46,
                  fontWeight: 700,
                  lineHeight: 1.24,
                  letterSpacing: story ? -2 : -1.3,
                }}
              >
                “{data.quote}”
              </div>
            ) : null}
          </div>

          {hasMedia ? (
            // biome-ignore lint/performance/noImgElement: Satori only renders raw img elements
            <img
              src={data.mediaData}
              alt=""
              width={story ? 380 : 360}
              height={story ? 380 : 360}
              style={{
                width: story ? 380 : 360,
                height: story ? 380 : 360,
                borderRadius: story ? 36 : 26,
                objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
          ) : null}
        </div>

        <Footer data={data} story={story} />
      </div>
    </div>
  );
}

export { BRAND as SHARE_IMAGE_BRAND };
