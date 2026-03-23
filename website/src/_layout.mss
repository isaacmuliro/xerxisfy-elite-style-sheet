@import "./_tokens";

.site-shell {
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.topbar {
  z-index: 50;
  backdrop-filter: blur(18px);
  background: var(--topbar);
  border-bottom: 1px solid var(--line);
}

.topbar__inner {
  @include muro-container($content-max, 1.25rem);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: $topbar-height;
}

.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: $radius-sm;
  color: var(--text-inverse);
  background: var(--bg-strong);
}

.brand-copy {
  display: grid;
  gap: 0.15rem;
}

.brand-copy strong {
  font-size: 0.98rem;
  letter-spacing: -0.02em;
}

.brand-copy span {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.topbar__nav {
  display: inline-flex;
  align-items: center;
  gap: 1.1rem;
  justify-self: center;
}

.topbar__nav a {
  font-size: 0.92rem;
  color: var(--text-muted);
}

.topbar__nav a.is-active {
  color: var(--text);
}

.topbar__utility {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  justify-self: end;
}

.page-grid {
  @include muro-container($content-max, 1.25rem);
  display: grid;
  grid-template-columns: $sidebar-width minmax(0, 1fr) $rail-width;
  gap: 1.25rem;
  align-items: start;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  padding-block: 1.5rem 3.25rem;
}

.sidebar,
.main-column,
.utility-rail {
  min-height: 0;
  height: 100%;
  overflow: auto;
  scrollbar-gutter: stable;
}

.sidebar,
.utility-rail {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.main-column {
  min-width: 0;
  padding-right: 0.15rem;
}

.section-stack {
  display: grid;
  gap: 1rem;
}

@media (max-width: 76rem) {
  .page-grid {
    grid-template-columns: $sidebar-width minmax(0, 1fr);
  }

  .utility-rail {
    display: none;
  }
}

@media (max-width: 62rem) {
  .topbar__inner {
    grid-template-columns: auto auto;
    min-height: auto;
    padding-block: 0.9rem;
  }

  .topbar__nav {
    display: none;
  }
}

@media (max-width: 56rem) {
  .site-shell {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }

  .page-grid {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .sidebar,
  .main-column,
  .utility-rail {
    height: auto;
    overflow: visible;
  }

  .utility-rail {
    display: grid;
    gap: 1rem;
  }
}

@media (max-width: 40rem) {
  .topbar__inner {
    grid-template-columns: 1fr;
  }

  .topbar__utility {
    justify-self: start;
    flex-wrap: wrap;
  }
}
