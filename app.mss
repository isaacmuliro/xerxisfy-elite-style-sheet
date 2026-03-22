# Muro full showcase file
** This sample exercises most language and compiler features in one place. **

@import "muro:all";
@import "./_app.tokens.mss";

@layers page, nav, overlay, modal, toast, tooltip;

@context header {
  $primary: darken($primary, 12%);
  $surface: lighten($surface, 6%);
}

@context footer {
  $primary: mix($primary, #ffffff, 32%);
}

@mixin orbit-chip($tone: $accent, $pad: 0.625rem 0.875rem) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: $pad;
  border-radius: 999px;
  background: alpha($tone, 0.12);
  color: darken($tone, 10%);
  user-select: none;
}

@if $theme-mode == editorial {
  .theme-note {
    letter-spacing: 0.01em;
    text-decoration-skip-ink: auto;
  }
} @else {
  .theme-note {
    letter-spacing: 0;
  }
}

html {
  color-scheme: light dark;
}

body {
  background: light($surface) dark(#0f1720);
  color: light($ink) dark(#eef2f7);
}

.theme-shell {
  @include elevated-panel(28px, 1.5rem);
  background: mix($surface, #ffffff, 42%);
  color: $ink;
  inline-size: ci(100%);
  max-inline-size: cmin(100% - 2rem);
  margin-inline: auto;
  padding-block: 1.25rem 1.75rem;
}

@lock .theme-shell => background;

header.site-header {
  @include muro-container(84rem, 1.25rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  position: sticky;
  inset-block-start: 0;
  padding-block: 1rem;
  background: light($surface) dark(#101924);
  color: $primary;
  layer: nav;

  .brand-shell {
    @include orbit-chip($primary, 0.75rem 1rem);
    background: mix($primary, #ffffff, 18%);
    color: $primary;
    @lock color, background;
  }

  .brand-mark {
    inline-size: 2.75rem;
    block-size: 2.75rem;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, lighten($accent, 12%), darken($primary, 10%));
  }

  .brand-copy {
    display: grid;
    row-gap: 0.15rem;
  }
}

.dashboard {
  @include muro-container(84rem, 1.25rem);
  display: grid;
  gap: 1.5rem;
  padding-block: 2rem 4rem;
}

// Add a real ./fixtures/hero.jpg to exercise automatic .webp conversion.
.hero {
  @include elevated-panel(32px, 1.5rem);
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  place-items: center start;
  gap: 1.5rem;
  container-type: inline-size;
  background-image: url("./fixtures/hero.jpg");
  background-size: cover;
  background-position: center;
  clip-path: inset(0 round 32px);
  mask-image: linear-gradient(#000000, transparent 130%);
  overflow: clip;

  .hero-copy {
    inline-size: ci(78%);
    max-inline-size: cmin(62% - 0.5rem);
    min-block-size: cmax(20% + 2rem);
    padding-inline: 0.5rem 1.25rem;
  }

  .hero-kicker {
    @include orbit-chip($accent);
  }

  .hero-title {
    @include muro-heading(4rem, 800);
    margin-block: 0.25rem 1rem;
    color: light($ink) dark(#ffffff);
  }

  .hero-body {
    @include muro-copy(56ch);
    color: mix($ink, #ffffff, 12%);
  }
}

.feature-card {
  @include elevated-panel;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-inline: 0 0;
  inset: auto;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.04);
  }
}

.stat-card {
  @include elevated-panel;
  display: flex;
  align-items: center;
  gap: 1rem;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

.cta-button {
  @include orbit-chip($primary, 0.875rem 1.125rem);
  appearance: none;
  border: 0;
  text-decoration: none;
  backdrop-filter: blur(16px);
  transform: translateY(0);
  transition: transform 180ms ease, filter 180ms ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.03);
  }
}

.cta-button--primary {
  @extend .cta-button;
  background: $primary;
  color: #ffffff;
}

.cta-button--ghost {
  @extend .cta-button;
  background: alpha($primary, 0.12);
  color: $primary;
}

.brand-button {
  @extend .cta-button;
  background: $accent;
  color: #ffffff;
  @lock color, background;
}

@each $tone in primary, accent, neutral {
  .badge-#{$tone} {
    @include orbit-chip;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  @if $tone == primary {
    .badge-#{$tone} {
      background: alpha($primary, 0.14);
      color: $primary;
    }
  } @else if $tone == accent {
    .badge-#{$tone} {
      background: alpha($accent, 0.16);
      color: darken($accent, 6%);
    }
  } @else {
    .badge-#{$tone} {
      background: alpha($neutral, 0.24);
      color: darken($ink, 8%);
    }
  }
}

@for $i from 1 through 4 {
  .metric-#{$i} {
    inline-size: math(100% / 4);
    max-inline-size: cmin(25% + 1rem);
    min-block-size: cb(100% / 2);
  }
}

.dialog {
  @include elevated-panel(24px, 1.5rem);
  layer: modal;
  inset-inline: 1.5rem 1.5rem;
  inset-block-start: 2rem;
  max-inline-size: fit-content;
  perspective: 1200px;
  perspective-origin: center top;
}

.tooltip {
  @include orbit-chip($ink, 0.4rem 0.6rem);
  layer: tooltip;
  inset: auto auto 100% 0;
}

.unused-ghost-rule {
  color: hotpink;
}

@supports (container-type: inline-size) {
  .dashboard-grid {
    display: grid;
    gap: 1rem;
    column-gap: 1.5rem;
  }
}

@media (min-width: 48rem) {
  .hero {
    min-inline-size: 60rem;
  }
}

footer.site-footer {
  @include muro-container(84rem, 1.25rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 2rem;
  color: $primary;
}
