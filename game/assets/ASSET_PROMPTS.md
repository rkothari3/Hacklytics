# WonkaLift — Nanobanana Asset Generation Prompts

All assets: PNG with transparent background unless noted. Pixel art style, 2x resolution minimum.

---

## 1. Chocolate River Tile (background, seamless)
**Filename:** `chocolate_river_tile.png`
**Size:** 390×200px (will tile vertically)
**Prompt:** Top-down view of a flowing chocolate river, rich dark brown (#5C3317) with lighter ripple streaks in warm caramel (#A0622A), small bubbles at surface, slight shimmer on the liquid. Seamless tileable texture — no visible seam at top or bottom edge. Willy Wonka fantasy aesthetic. No text, no borders.

---

## 2. Wonka Boat (top-down)
**Filename:** `wonka_boat.png`
**Size:** 100×140px, transparent background
**Prompt:** Top-down aerial view of a purple and gold wooden rowboat in Willy Wonka style. Deep purple hull (#6B2D8B) with gold trim (#FFD700). White cursive "WonkaLift" text on side. A single oar visible on each side. No people in boat. Slight drop shadow beneath hull. Fantasy cartoon style, crisp edges.

---

## 3. Candy Cane Wall Tile (seamless vertical)
**Filename:** `candy_cane_wall.png`
**Size:** 60×200px, seamless vertical tile
**Prompt:** A vertical candy cane stripe pattern — alternating diagonal red (#E8002D) and white (#FFFFFF) stripes at 45 degrees, thick bold stripes, glossy surface with a subtle shine highlight down the center. Seamless tile — no visible seam at top or bottom. Classic Wonka factory style. No text.

---

## 4. Lollipop (bank decoration)
**Filename:** `lollipop.png`
**Size:** 60×80px, transparent background
**Prompt:** A single cartoon lollipop from a slight top-down angle. Round candy head with a swirling purple and gold spiral pattern. White stick. Slight gloss highlight on the candy. Bright, saturated colors. Wonka fantasy aesthetic. No background.

---

## 5. Oompa Loompa (top-down, standing on bank)
**Filename:** `oompa_loompa.png`
**Size:** 60×80px, transparent background
**Prompt:** Top-down view of a small Oompa Loompa character standing upright, looking slightly upward. Orange skin, green hair. Wearing white overalls with a brown belt. Arms at sides. Cute, cartoon, Willy Wonka factory style. Visible feet and hands. No background. Crisp pixel-art-adjacent style.

---

## 6. Golden Ticket
**Filename:** `golden_ticket.png`
**Size:** 340×160px, transparent background
**Prompt:** A shimmering golden ticket in classic Willy Wonka style. Bright gold background (#FFD700) with ornate scroll-work border in dark gold (#C8A800). Center text in chocolate brown cursive: "GOLDEN TICKET". Subtle sparkle/glitter effect across the surface. Slight perspective tilt (5 degrees). Drop shadow beneath. No other text.

---

## 7. Factory Rejected Stamp
**Filename:** `factory_rejected.png`
**Size:** 300×120px, transparent background
**Prompt:** A red rubber stamp impression reading "FACTORY REJECTED" in bold block capitals, slightly tilted 8 degrees counterclockwise. Stamped red ink texture, rough edges as if stamped on paper. Dark red (#8B0000) ink color. No background — transparent outside stamp impression.

---

## How to swap emoji placeholders with real assets

Once assets are generated, replace emoji in these files:

| Emoji | File | Replace with |
|-------|------|-------------|
| 🚣 boat | `game/RiverCanvas.tsx` | `<Image source={require('./assets/wonka_boat.png')} style={styles.boatImg} />` |
| 🍭 lollipop | `game/RiverCanvas.tsx` | `<Image source={require('./assets/lollipop.png')} style={styles.lollipopImg} />` |
| 🧍 Oompa Loompa | `game/RiverCanvas.tsx` | `<Image source={require('./assets/oompa_loompa.png')} style={styles.oompaImg} />` |
| 🎫 ticket icon | `game/WonkaGameScreen.tsx` header | `<Image source={require('./assets/golden_ticket.png')} style={styles.ticketSmall} />` |
| 🎫 results banner | `game/ResultsScreen.tsx` | `<Image source={require('./assets/golden_ticket.png')} style={styles.ticketBanner} />` |
| 🏭 rejected banner | `game/ResultsScreen.tsx` | `<Image source={require('./assets/factory_rejected.png')} style={styles.rejectedBanner} />` |

For the river background, replace `ScrollingRiver`'s `RiverTile` with an `<Image>` tiled using `resizeMode="repeat"` on the `chocolate_river_tile.png` asset.
