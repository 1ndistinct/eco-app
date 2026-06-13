export type PhotoLibraryItem = {
  id: string;
  src: string;
  alt: string;
  description: string;
  featured: boolean;
};

const FEATURED_FILE_NAMES = [
  "643c3a9d-ba46-4259-9807-eca73b608f48.JPG",
  "820e515c-9eea-4032-9d44-a966408f3da5.JPG",
  "1cbb8bc9-9029-4c00-b255-6887a861cf27.JPG",
  "9c95df43-3640-48ca-b9bf-a9129969784b.JPG",
  "10256d2a-028c-47a1-a08e-d47cef0e82c9.JPG",
  "IMG_6615.jpg",
];

const localPhotoModules = import.meta.glob(
  ["./assets/local/*.{jpg,jpeg,png,webp}", "./assets/local/*.{JPG,JPEG,PNG,WEBP}"],
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const libraryPhotoModules = import.meta.glob(
  ["./assets/library/*.{jpg,jpeg,png,webp}", "./assets/library/*.{JPG,JPEG,PNG,WEBP}"],
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function buildFallbackDescription(fileName: string) {
  const openings = [
    "One for the permanent rotation.",
    "An easy favorite from the archive.",
    "A very strong case for keeping this library growing.",
    "Exactly the sort of frame that earns a place in here.",
    "A small moment that was always worth saving.",
    "A solid reminder that the in-between shots are usually the best ones.",
  ];
  const endings = [
    "It has the kind of energy that gets better every time it comes back around.",
    "This is why a running collection of us makes so much sense.",
    "It lands somewhere between soft, funny, and impossible not to keep.",
    "The whole point of this page is having moments like this easy to revisit.",
    "It feels personal in the best, least overworked way.",
    "It still has that immediate keep-this-one feeling.",
  ];
  const hash = hashString(fileName);

  return `${openings[hash % openings.length]} ${endings[Math.floor(hash / openings.length) % endings.length]}`;
}

function pathToFileName(path: string) {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

function fileNameToAlt(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "");

  if (/^[0-9a-f-]{36}$/i.test(stem)) {
    return "A photo from Nicole's birthday library.";
  }

  return `A photo from Nicole's birthday library: ${stem.replace(/[_-]+/g, " ")}.`;
}

function fileNameToDescription(fileName: string) {
  const seededDescriptions: Record<string, string> = {
    "IMG_6689_4.jpg":
      "One of those frames that already feels like it belongs in the permanent favorites folder.",
    "IMG_6687.jpg":
      "A very us kind of photo: relaxed, sharp, and better the longer you look at it.",
    "IMG_6671.jpg":
      "This one feels like a good reminder that the ordinary days with you are never actually ordinary.",
    "IMG_6592.jpg":
      "The kind of snapshot that makes keeping a running library of us feel obviously worth it.",
    "IMG_6550.jpg":
      "A proper core-memory photo, and exactly the sort of thing this page should keep close.",
    "0f0af00a-7876-4cc9-bb24-c35c6ab850b9.jpg":
      "A slightly chaotic favorite, which means it fits the collection perfectly.",
    "10256d2a-028c-47a1-a08e-d47cef0e82c9.JPG":
      "The mirrored-room chaos makes this feel like our own little universe for a minute.",
    "1cbb8bc9-9029-4c00-b255-6887a861cf27.JPG":
      "Sun, half a frame each, and exactly the kind of happy accident worth keeping forever.",
    "2590e3f2-c6ef-4e41-9061-7ced577f6f37.JPG":
      "A low-light end-of-night photo that still somehow feels bright because it has you in it.",
    "543a3243-268a-41dd-adc9-d77a8093a37f.JPG":
      "Unfairly cinematic, heavily backlit, and still somehow completely effortless.",
    "5c5ac879-8159-4d45-82dd-c74bd09c2f1d.JPG":
      "Strong evidence that even waiting around with you turns into its own very specific kind of fun.",
    "5f8ce4e0-3ecc-42fa-a185-b03d914a835a.JPG":
      "A reminder that some of our best photos are the ones taking themselves the least seriously.",
    "643c3a9d-ba46-4259-9807-eca73b608f48.JPG":
      "Museum-date energy, good outfit energy, and very solid proof that we clean up well.",
    "7535cee0-c426-4c1f-8ba2-31425e503242.JPG":
      "Turning a station platform into an impromptu braid workshop feels extremely on brand for us.",
    "79c0b4e3-d2b1-48b3-8dd4-02b95259fb38.JPG":
      "The sunlight was doing too much, and somehow you still outdid it.",
    "7d57f1ca-b29d-439d-973d-af503ad2c02c.JPG":
      "Comically committed to the braid, which only makes this one better.",
    "820e515c-9eea-4032-9d44-a966408f3da5.JPG":
      "Soft, pink, and impossible not to keep near the front of the rotation.",
    "9c95df43-3640-48ca-b9bf-a9129969784b.JPG":
      "A blurry blue little moment that still lands exactly right.",
    "IMG_6615.jpg":
      "A proper front-of-the-library photo: calm, sharp, and exactly the right kind of favorite.",
    "c33b2336-3885-4fdb-b05e-67693a542484.JPG":
      "Close-up proof that even the tiny in-between moments end up worth saving.",
    "db0b2101-d685-4c3f-8774-fe8ea4529b63.JPG":
      "One of those sun-struck photos that makes the whole day feel easy to revisit.",
  };

  const seeded = seededDescriptions[fileName];

  if (seeded) {
    return seeded;
  }

  return buildFallbackDescription(fileName);
}

const featuredPhotoLookup = new Set(FEATURED_FILE_NAMES);

export const photoLibrary: PhotoLibraryItem[] = Object.entries({
  ...localPhotoModules,
  ...libraryPhotoModules,
})
  .map(([path, src]) => {
    const fileName = pathToFileName(path);

    return {
      id: fileName,
      src,
      alt: fileNameToAlt(fileName),
      description: fileNameToDescription(fileName),
      featured: featuredPhotoLookup.has(fileName),
    };
  })
  .sort((left, right) => {
    if (left.featured !== right.featured) {
      return Number(right.featured) - Number(left.featured);
    }

    return left.id.localeCompare(right.id);
  });

export const featuredPhotoIds = FEATURED_FILE_NAMES;
