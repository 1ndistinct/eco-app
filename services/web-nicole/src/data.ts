export type PhotoLibraryItem = {
  id: string;
  src: string;
  alt: string;
  description: string;
  featured: boolean;
};

const FEATURED_FILE_NAMES = [
  "IMG_6689_4.jpg",
  "IMG_6687.jpg",
  "IMG_6671.jpg",
  "IMG_6592.jpg",
  "IMG_6550.jpg",
  "0f0af00a-7876-4cc9-bb24-c35c6ab850b9.jpg",
];

const localPhotoModules = import.meta.glob("./assets/local/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const libraryPhotoModules = import.meta.glob("./assets/library/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

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
    "IMG_6689_4.jpg": "One of those frames that already feels like it belongs in the permanent favorites folder.",
    "IMG_6687.jpg": "A very us kind of photo: relaxed, sharp, and better the longer you look at it.",
    "IMG_6671.jpg": "This one feels like a good reminder that the ordinary days with you are never actually ordinary.",
    "IMG_6592.jpg": "The kind of snapshot that makes keeping a running library of us feel obviously worth it.",
    "IMG_6550.jpg": "A proper core-memory photo, and exactly the sort of thing this page should keep close.",
    "0f0af00a-7876-4cc9-bb24-c35c6ab850b9.jpg": "A slightly chaotic favorite, which means it fits the collection perfectly.",
  };

  const seeded = seededDescriptions[fileName];

  if (seeded) {
    return seeded;
  }

  const stem = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return `Another keeper from our library together: ${stem}.`;
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
