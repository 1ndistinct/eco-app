import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Box, Stack } from "@mui/material";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import entryPhoto from "../assets/IMG_6615.jpg";
import birthdayTrack from "../assets/audio/Arabella.mp3";
import { featuredPhotoIds, photoLibrary, type PhotoLibraryItem } from "../data";
import "./birthdayFeature.css";

export type BirthdayFeatureProps = {
  workspaceId?: string;
  workspaceName?: string;
  currentUserEmail?: string;
};

type PlaybackState = "idle" | "playing" | "paused" | "blocked";

type SelectedPhoto = PhotoLibraryItem & {
  tilt: number;
};

const TRACK_VOLUME = 0.34;
const PHOTO_SET_SIZE = 6;

const birthdayMessage =
  "Happy birthday, Nicole. I wanted this to feel less like a page and more like a little place made for you: a running library of the moments that matter, the photos that feel like us, and the kind of memories that are better when they stay easy to revisit.";

const shortVersion =
  "Short version: life with you is brighter, sharper, funnier, and more interesting, and I wanted one corner of the app that feels personal enough to keep filling in over time.";

function shuffleItems<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];

    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }

  return copy;
}

function withTilt(items: PhotoLibraryItem[]) {
  return items.map((item) => ({
    ...item,
    tilt: Number((Math.random() * 7 - 3.5).toFixed(2)),
  }));
}

function buildInitialSelection() {
  const featuredLookup = new Set(featuredPhotoIds);
  const featured = featuredPhotoIds
    .map((photoId) => photoLibrary.find((photo) => photo.id === photoId))
    .filter((photo): photo is PhotoLibraryItem => Boolean(photo));
  const remainder = photoLibrary.filter((photo) => !featuredLookup.has(photo.id));

  return withTilt([...featured, ...remainder.slice(0, Math.max(0, PHOTO_SET_SIZE - featured.length))].slice(0, PHOTO_SET_SIZE));
}

function buildNextSelection(currentIds: string[]) {
  const currentIdLookup = new Set(currentIds);
  const available = photoLibrary.filter((photo) => !currentIdLookup.has(photo.id));

  if (available.length >= PHOTO_SET_SIZE) {
    return withTilt(shuffleItems(available).slice(0, PHOTO_SET_SIZE));
  }

  const shuffled = shuffleItems(photoLibrary).slice(0, Math.min(PHOTO_SET_SIZE, photoLibrary.length));
  const shuffledIds = shuffled.map((photo) => photo.id).join("|");
  const currentKey = currentIds.join("|");

  if (shuffledIds !== currentKey) {
    return withTilt(shuffled);
  }

  return withTilt(shuffleItems([...photoLibrary].reverse()).slice(0, Math.min(PHOTO_SET_SIZE, photoLibrary.length)));
}

export default function BirthdayFeature(_props: BirthdayFeatureProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasOpenedCard, setHasOpenedCard] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>(() => buildInitialSelection());

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = TRACK_VOLUME;
    audio.loop = true;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleEnterExperience = async () => {
    const audio = audioRef.current;

    if (!audio) {
      setHasOpenedCard(true);
      return;
    }

    try {
      await audio.play();
      setPlaybackState("playing");
    } catch {
      setPlaybackState("blocked");
    }

    setHasOpenedCard(true);
  };

  const handleTogglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (playbackState === "playing") {
      audio.pause();
      setPlaybackState("paused");
      return;
    }

    try {
      await audio.play();
      setPlaybackState("playing");
    } catch {
      setPlaybackState("blocked");
    }
  };

  const handleShufflePhotos = () => {
    setSelectedPhotos((current) => buildNextSelection(current.map((photo) => photo.id)));
  };

  const musicButtonLabel = playbackState === "playing" ? "Pause music" : "Play music";

  if (!hasOpenedCard) {
    return (
      <Box className="nicole-app">
        <audio ref={audioRef} src={birthdayTrack} preload="auto" loop playsInline />
        <div className="nicole-entry-shell">
          <section className="nicole-card nicole-entry-card">
            <img className="nicole-entry-photo" src={entryPhoto} alt="Nicole on the opening card" />
            <p className="nicole-kicker">Happy birthday</p>
            <h1 className="nicole-title">Open card</h1>
            <button
              type="button"
              className="nicole-entry-button"
              onClick={() => {
                void handleEnterExperience();
              }}
            >
              Open card
            </button>
          </section>
        </div>
      </Box>
    );
  }

  return (
    <Box className="nicole-app">
      <audio ref={audioRef} src={birthdayTrack} preload="auto" loop playsInline />
      <Stack spacing={2} className="nicole-shell">
        <header className="nicole-card nicole-message-card">
          <div className="nicole-toolbar-copy">
            <p className="nicole-kicker">Happy birthday</p>
            <h1 className="nicole-title">Happy birthday, Nicole.</h1>
            <p className="nicole-message">{birthdayMessage}</p>
            <p className="nicole-short-version">{shortVersion}</p>
          </div>

          <div className="nicole-message-actions">
            <button
              type="button"
              className="nicole-icon-button"
              aria-label={musicButtonLabel}
              title={musicButtonLabel}
              onClick={() => {
                void handleTogglePlayback();
              }}
            >
              {playbackState === "playing" ? (
                <PauseRoundedIcon fontSize="small" />
              ) : (
                <PlayArrowRoundedIcon fontSize="small" />
              )}
            </button>
          </div>
        </header>

        <section className="nicole-card nicole-library-panel">
          <div className="nicole-library-header">
            <div>
              <h2 className="nicole-section-title">Photo library</h2>
              <p className="nicole-section-copy">
                Showing {selectedPhotos.length} photos from a library of {photoLibrary.length}.
                Refresh it any time for a different mix.
              </p>
            </div>
            <button
              type="button"
              className="nicole-icon-button"
              aria-label="Shuffle photos"
              title="Shuffle photos"
              onClick={handleShufflePhotos}
            >
              <AutorenewRoundedIcon fontSize="small" />
            </button>
          </div>

          <div className="nicole-photo-library">
            {selectedPhotos.map((photo) => (
              <article
                key={`${photo.id}-${photo.tilt}`}
                className="nicole-library-card"
                style={{ "--nicole-tilt": `${photo.tilt}deg` } as CSSProperties}
              >
                <img src={photo.src} alt={photo.alt} />
                <p className="nicole-photo-description">{photo.description}</p>
              </article>
            ))}
          </div>
        </section>
      </Stack>
    </Box>
  );
}
