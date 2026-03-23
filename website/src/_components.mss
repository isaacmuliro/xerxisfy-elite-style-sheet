@import "./_tokens";

@mixin panel($padding: 1.2rem, $radius: $radius-md) {
  padding: $padding;
  border-radius: $radius;
  background: var(--bg-elevated);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 2.75rem;
  padding-inline: 1rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--bg-elevated);
  color: var(--text);
  font-weight: 600;
  transition:
    transform $transition-fast,
    background $transition-fast,
    border-color $transition-fast,
    color $transition-fast;
}

.button:hover {
  transform: translateY(-1px);
  border-color: var(--line-strong);
}

.button--primary {
  background: var(--bg-strong);
  color: var(--text-inverse);
  border-color: var(--bg-strong);
}

.button--secondary {
  background: var(--bg-muted);
}

.button--ghost {
  background: transparent;
}

.copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding-inline: 0.72rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast, border-color $transition-fast;
}

.copy-button:hover {
  color: var(--text);
  border-color: var(--line-strong);
}

.copy-button.is-copied {
  background: var(--bg-strong);
  color: var(--text-inverse);
  border-color: var(--bg-strong);
}

.copy-button--chip {
  min-width: 2rem;
  min-height: 2rem;
  padding-inline: 0;
  border-radius: 0.8rem;
  background: alpha(#ffffff, 0.08);
  border-color: alpha(#ffffff, 0.12);
  color: #f4f4f1;
}

.theme-switcher {
  display: inline-grid;
  grid-auto-flow: column;
  gap: 0.35rem;
  padding: 0.25rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg-elevated);
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.2rem;
  padding-inline: 0.8rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast, border-color $transition-fast;
}

.theme-toggle[aria-pressed="true"] {
  background: var(--bg-strong);
  color: var(--text-inverse);
  border-color: var(--bg-strong);
}

.sidebar-card,
.rail-card,
.hero-card,
.section-card,
.feature-card,
.code-card,
.mini-card {
  @include panel;
}

.sidebar-card,
.rail-card {
  margin-bottom: 0;
}

.sidebar-card--muted {
  background: var(--bg-soft);
}

.sidebar-title,
.rail-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hero-card {
  padding: 1.2rem;
  border-radius: $radius-lg;
  background:
    linear-gradient(180deg, var(--bg-elevated), var(--bg-soft));
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(18rem, 0.88fr);
  gap: 0.95rem;
  align-items: stretch;
}

.hero-copy {
  max-width: 40rem;
}

.hero-copy h1 {
  @include muro-heading(3.05rem, 700);
  margin: 0.55rem 0 0.85rem;
  max-width: 11ch;
  letter-spacing: -0.05em;
  line-height: 0.98;
}

.hero-copy p {
  @include muro-copy(62ch);
  margin: 0 0 1rem;
  color: var(--text-muted);
  font-size: 0.96rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.hero-command {
  display: grid;
  gap: 0.8rem;
}

.hero-command pre {
  font-size: 0.84rem;
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.65rem;
  margin-top: 1rem;
}

.meta-card {
  @include panel(0.85rem, $radius-sm);
  background: var(--bg-soft);
}

.meta-card strong {
  display: block;
  font-size: 0.98rem;
  margin-bottom: 0.2rem;
}

.meta-card span {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.section-card {
  display: grid;
  gap: 1rem;
}

.section-head h2 {
  @include muro-heading(2rem, 700);
  margin: 0.35rem 0 0;
  letter-spacing: -0.04em;
  line-height: 1.02;
}

.section-head p {
  color: var(--text-muted);
  margin: 0.7rem 0 0;
  max-width: 64ch;
  font-size: 0.95rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1rem;
}

.feature-card,
.mini-card {
  display: grid;
  align-content: start;
  gap: 0.8rem;
}

.feature-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.feature-card p,
.mini-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.65;
}

.icon-pill {
  display: inline-grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  color: var(--text);
  border: 1px solid var(--line);
  background: var(--bg-muted);
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1rem;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
}

.code-card {
  overflow: hidden;
}

.code-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.code-card pre {
  padding: 1rem;
  border-radius: $radius-sm;
  background: var(--bg-code);
  border: 1px solid alpha(#ffffff, 0.08);
  color: #f4f4f1;
  font-size: 0.88rem;
  line-height: 1.7;
}

.inline-list,
.support-list,
.track-list,
.rail-list {
  display: grid;
  gap: 0.65rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.nav-group {
  display: grid;
  gap: 0.65rem;
}

.nav-group + .nav-group {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}

.nav-group__title {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.track-item {
  display: grid;
  grid-template-columns: 2rem 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.8rem 0.9rem;
  border-radius: $radius-sm;
  border: 1px solid transparent;
  transition: background $transition-fast, border-color $transition-fast;
}

.track-item:hover {
  background: var(--bg-soft);
  border-color: var(--line);
}

.track-item.is-active {
  background: var(--bg-soft);
  border-color: var(--line-strong);
}

.track-item i {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.75rem;
  color: var(--text);
  background: var(--bg-muted);
  border: 1px solid var(--line);
}

.track-item.is-active i {
  background: var(--bg-strong);
  color: var(--text-inverse);
  border-color: var(--bg-strong);
}

.track-item strong {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--text);
  font-size: 0.93rem;
}

.track-item span,
.support-list li,
.inline-list li,
.rail-item a {
  color: var(--text-muted);
  line-height: 1.55;
}

.support-list li,
.inline-list li {
  padding-left: 1.1rem;
  position: relative;
}

.support-list li::before,
.inline-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.7rem;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--text);
}

.callout {
  @include panel(1rem, $radius-md);
  background: var(--bg-soft);
  color: var(--text-muted);
}

.callout strong {
  color: var(--text);
}

.rail-list {
  gap: 0.8rem;
}

.rail-item {
  display: grid;
  grid-template-columns: 1.1rem 1fr;
  gap: 0.75rem;
  align-items: start;
}

.rail-item i {
  color: var(--text-muted);
  padding-top: 0.2rem;
}

.rail-item a:hover {
  color: var(--text);
}

.rail-item a.is-active {
  color: var(--text);
  font-weight: 600;
}

.terminal-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.7rem;
  padding-inline: 0.9rem;
  border-radius: $radius-sm;
  background: var(--bg-code);
  color: #f4f4f1;
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  font-size: 0.8rem;
}

.terminal-chip span {
  min-width: 0;
}

.terminal-chip + .terminal-chip {
  margin-top: 0.75rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.48rem 0.72rem;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text);
  border: 1px solid var(--line);
  font-size: 0.86rem;
  font-weight: 700;
}

.site-footer {
  @include muro-container($content-max, 1.25rem);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 0.38rem 0.55rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  border-top: 1px solid var(--line);
}

@media (max-width: 72rem) {
  .hero-grid,
  .mini-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 60rem) {
  .hero-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 42rem) {
  .hero-copy h1 {
    font-size: 2.9rem;
  }

  .hero-card,
  .section-card,
  .feature-card,
  .code-card,
  .mini-card {
    padding: 1.1rem;
  }

  .theme-toggle span,
  .brand-copy span {
    display: none;
  }
}
