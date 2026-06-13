import coffeeShow from "./assets/behance/ukrainian-coffee-show.jpg";
import legoLoop from "./assets/behance/lego-loop.jpg";
import popArtVibes from "./assets/behance/pop-art-vibes.jpg";
import tinyPlane from "./assets/behance/tiny-plane.jpg";
import photoCandid from "./assets/local/photo-candid.jpg";
import photoCity from "./assets/local/photo-city.jpg";
import photoDinner from "./assets/local/photo-dinner.jpg";
import photoEvening from "./assets/local/photo-evening.jpg";
import photoHampstead from "./assets/local/photo-hampstead.jpg";
import photoLaugh from "./assets/local/photo-laugh.jpg";
import photoPortrait from "./assets/local/photo-portrait.jpg";
import photoSidewalk from "./assets/local/photo-sidewalk.jpg";
import photoSmile from "./assets/local/photo-smile.jpg";
import photoSunlight from "./assets/local/photo-sunlight.jpg";
import photoTogether from "./assets/local/photo-together.jpg";
import photoTrain from "./assets/local/photo-train.jpg";

export type BirthdayPhoto = {
  src: string;
  alt: string;
  caption: string;
  layout: "feature" | "portrait" | "landscape" | "standard";
};

export type RenderCard = {
  title: string;
  src: string;
  href: string;
  note: string;
};

export const heroPhotos: BirthdayPhoto[] = [
  {
    src: photoPortrait,
    alt: "Nicole smiling on a sunlit street",
    caption: "Sun after rain energy.",
    layout: "feature",
  },
  {
    src: photoSmile,
    alt: "Nicole smiling during a night out",
    caption: "The grin that wins every room.",
    layout: "portrait",
  },
  {
    src: photoSunlight,
    alt: "Nicole in warm afternoon light",
    caption: "Golden-hour operator mode.",
    layout: "standard",
  },
];

export const photoWall: BirthdayPhoto[] = [
  {
    src: photoHampstead,
    alt: "Nicole outdoors in a black outfit",
    caption: "Sharp glasses, sharper vibe.",
    layout: "portrait",
  },
  {
    src: photoLaugh,
    alt: "Nicole laughing in a candid moment",
    caption: "Happy chaos, properly documented.",
    layout: "standard",
  },
  {
    src: photoSidewalk,
    alt: "Nicole walking through the city",
    caption: "Main-character pace.",
    layout: "landscape",
  },
  {
    src: photoTrain,
    alt: "Nicole during a train trip",
    caption: "Transit, but make it cinematic.",
    layout: "portrait",
  },
  {
    src: photoDinner,
    alt: "Nicole at dinner",
    caption: "Marketing-strategy dinner energy.",
    layout: "standard",
  },
  {
    src: photoCity,
    alt: "Nicole in the city at night",
    caption: "London backdrop, Kyiv resolve.",
    layout: "portrait",
  },
  {
    src: photoTogether,
    alt: "Nicole reading on a bed",
    caption: "Still somehow doing research for fun.",
    layout: "portrait",
  },
  {
    src: photoCandid,
    alt: "Nicole smiling candidly",
    caption: "Zero effort, maximum glow.",
    layout: "standard",
  },
  {
    src: photoEvening,
    alt: "Nicole in the evening light",
    caption: "Soft light, strong opinions.",
    layout: "landscape",
  },
];

export const renderCards: RenderCard[] = [
  {
    title: "Tiny Plane",
    src: tinyPlane,
    href: "https://www.behance.net/gallery/98729687/Tiny-Plane",
    note: "Bright, playful, and very Nicole.",
  },
  {
    title: "LEGO LOOP",
    src: legoLoop,
    href: "https://www.behance.net/gallery/99284171/LEGO-LOOP",
    note: "Toy-scale precision with real charm.",
  },
  {
    title: "UKRAINIAN COFFEE SHOW IDENTITY",
    src: coffeeShow,
    href: "https://www.behance.net/gallery/98819327/UKRAINIAN-COFFEE-SHOW-IDENTITY",
    note: "Coffee, identity, and Kyiv-coded color sense.",
  },
  {
    title: "Pop Art Vibes",
    src: popArtVibes,
    href: "https://www.behance.net/gallery/98726479/Pop-Art-Vibes",
    note: "A reminder that her side quests are not side quality.",
  },
];

export const orbitNotes = [
  {
    title: "Jazz soundtrack",
    body: "Every good evening improves when the room sounds like a trumpet solo and a deep-cut playlist.",
  },
  {
    title: "V60 precision",
    body: "The coffee ritual gets the same care as a good render: measured, patient, and annoyingly exact in the best way.",
  },
  {
    title: "OSINT brain",
    body: "Loose threads do not stay loose for long. Curiosity gets followed all the way to the receipts.",
  },
  {
    title: "Cat-free runtime",
    body: "The platform supports many integrations. Cats remain intentionally unsupported.",
  },
];
