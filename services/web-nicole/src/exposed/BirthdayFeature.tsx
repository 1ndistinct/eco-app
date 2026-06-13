import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import { Box, Stack, Typography } from "@mui/material";

import { heroPhotos, orbitNotes, photoWall, renderCards } from "../data";
import "./birthdayFeature.css";

export type BirthdayFeatureProps = {
  workspaceId?: string;
  workspaceName?: string;
  currentUserEmail?: string;
};

const traitBadges = [
  "Jazz loyalist",
  "V60 specialist",
  "OSINT enthusiast",
  "3D side quests",
  "Kyiv roots",
  "Jewish joy",
  "Marketing brain",
];

export default function BirthdayFeature({ workspaceName }: BirthdayFeatureProps) {
  return (
    <Box className="nicole-app">
      <Stack spacing={2.5} className="nicole-shell">
        <section className="nicole-hero">
          <article className="nicole-card nicole-hero-copy">
            <p className="nicole-kicker">Federated birthday drop</p>
            <h1 className="nicole-title">Happy birthday, Nicole.</h1>
            <p className="nicole-lead">
              One tiny microfrontend for one very specific icon: a collage of the photos,
              renders, obsessions, and excellent side quests that make your orbit feel brighter.
              Jazz in the background, V60 on the counter, OSINT tabs open, and a bit of Kyiv in
              the color palette.
            </p>
            {workspaceName ? (
              <div className="nicole-runtime-pill">
                <PlaceRoundedIcon fontSize="small" />
                Mounted inside {workspaceName}
              </div>
            ) : null}
            <div className="nicole-chip-row" aria-label="Nicole highlights">
              {traitBadges.map((trait) => (
                <span key={trait} className="nicole-chip">
                  {trait}
                </span>
              ))}
            </div>
            <div className="nicole-link-row">
              <a
                className="nicole-link"
                href="https://uk.linkedin.com/in/thenicoleborman"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn orbit
                <LaunchRoundedIcon fontSize="inherit" />
              </a>
              <a
                className="nicole-link"
                href="https://www.behance.net/nborman"
                target="_blank"
                rel="noreferrer"
              >
                Behance renders
                <LaunchRoundedIcon fontSize="inherit" />
              </a>
            </div>
          </article>

          <aside className="nicole-card nicole-hero-visual">
            <div className="nicole-hero-grid">
              {heroPhotos.map((photo) => (
                <figure
                  key={photo.src}
                  className={`nicole-photo-card ${photo.layout}`}
                >
                  <img src={photo.src} alt={photo.alt} />
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          </aside>
        </section>

        <section className="nicole-orbit-grid" aria-label="Nicole orbit notes">
          {orbitNotes.map((note) => (
            <article key={note.title} className="nicole-card nicole-note-card">
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </article>
          ))}
        </section>

        <section className="nicole-card nicole-photo-wall">
          <header className="nicole-section-header">
            <div>
              <p className="nicole-section-kicker">Photo wall</p>
              <h2 className="nicole-section-title">Everything in one place</h2>
            </div>
            <Typography className="nicole-section-copy">
              A small scrapbook of the real thing: city nights, quiet moments, and the usual
              impossible amount of glow.
            </Typography>
          </header>

          <div className="nicole-photo-grid">
            {photoWall.map((photo) => (
              <figure
                key={photo.src}
                className={`nicole-photo-card ${photo.layout}`}
              >
                <img src={photo.src} alt={photo.alt} />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section>
          <div className="nicole-section-header">
            <div>
              <p className="nicole-section-kicker">Render shelf</p>
              <h2 className="nicole-section-title">Some of the fun 3D work too</h2>
            </div>
            <Typography className="nicole-section-copy">
              Pulled from Behance because the birthday app should obviously include the side quests
              that also look unfairly good.
            </Typography>
          </div>

          <div className="nicole-renders-grid">
            {renderCards.map((render) => (
              <a
                key={render.title}
                className="nicole-card nicole-render-card"
                href={render.href}
                target="_blank"
                rel="noreferrer"
              >
                <img src={render.src} alt={`${render.title} render by Nicole Borman`} />
                <div className="nicole-render-copy">
                  <p className="nicole-render-eyebrow">Behance project</p>
                  <h3 className="nicole-render-title">{render.title}</h3>
                  <p className="nicole-render-note">{render.note}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="nicole-card nicole-footer-card">
          <div>
            <p className="nicole-section-kicker">Runtime notes</p>
            <h2 className="nicole-section-title">The short version</h2>
            <p className="nicole-footer-copy">
              You are funny, brilliant, visually dangerous, and weirdly capable of making every
              tiny hobby feel like a fully art-directed universe. This app is just a neat excuse
              to keep all of that in one place and say happy birthday with slightly more structure
              than a normal message.
            </p>
          </div>

          <div className="nicole-footer-list">
            <div className="nicole-footer-item">Coffee accuracy: high</div>
            <div className="nicole-footer-item">OSINT curiosity: relentless</div>
            <div className="nicole-footer-item">Jazz compatibility: native</div>
            <div className="nicole-footer-item">Cat support: disabled by policy</div>
          </div>
        </section>
      </Stack>
    </Box>
  );
}
