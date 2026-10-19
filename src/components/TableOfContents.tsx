import { useEffect, useRef, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  className?: string;
  hasComments?: boolean;
}

/** Viewport-top offset used for both the scroll target and the "current section" mark. */
const SCROLL_OFFSET = 80;
/** Horizontal indent (px) per heading level below the shallowest heading. */
const INDENT_PER_LEVEL = 12;

function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const y =
    element.getBoundingClientRect().top + window.pageYOffset - SCROLL_OFFSET;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function getItemIndent(level: number, baseLevel: number) {
  return Math.max(0, level - baseLevel) * INDENT_PER_LEVEL;
}

export default function TableOfContents({
  className = "",
  hasComments = false,
}: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  // Flex-grow weight per row, plus the spacer above the first row, so the list
  // is laid out proportionally to how much of the article each heading owns.
  const [weights, setWeights] = useState<{
    lead: number;
    rows: Record<string, number>;
  }>({ lead: 0, rows: {} });

  const rowsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const lastWeights = useRef("");
  const lastActive = useRef("");

  // Collect the headings rendered in the article body.
  useEffect(() => {
    const headings = document.querySelectorAll(
      "article h1, article h2, article h3, article h4, article h5, article h6",
    );
    const items: TocItem[] = [];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      let id = heading.id;

      if (!id) {
        id =
          heading.textContent
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `heading-${index}`;
        heading.id = id;
      }

      items.push({ id, text: heading.textContent || "", level });
    });

    if (hasComments) {
      items.push({ id: "comments", text: "Comments", level: 2 });
    }

    setToc(items);
  }, [hasComments]);

  // The rail only fits next to the article on wide viewports; below that the
  // sticky bar takes over.
  useEffect(() => {
    const update = () => setIsLargeScreen(window.innerWidth >= 1500);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Reveal the sticky bar once the reader has scrolled past the article header.
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section being read together with every heading currently on
  // screen, so the lit rows line up with the segment drawn on the rail.
  useEffect(() => {
    if (toc.length === 0) return;
    const update = () => {
      const windowHeight = window.innerHeight;
      let current = toc[0].id;
      const ids: string[] = [];
      for (const item of toc) {
        const element = document.getElementById(item.id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top <= SCROLL_OFFSET) current = item.id;
        if (rect.top < windowHeight && rect.bottom > 0) ids.push(item.id);
      }
      // The current section stays lit even once its heading scrolls off the top.
      if (!ids.includes(current)) ids.push(current);

      const key = `${current}|${ids.join(",")}`;
      if (key === lastActive.current) return;
      lastActive.current = key;
      setCurrentId(current);
      setActiveIds(ids);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [toc]);

  // Give each row a share of the rail's height proportional to the amount of
  // article it covers, so the list reads as a vertical map of the post.
  useEffect(() => {
    if (!isLargeScreen || toc.length === 0) return;
    const article = document.querySelector("article");
    if (!article) return;

    const measure = () => {
      const articleTop =
        article.getBoundingClientRect().top + window.pageYOffset;
      const total = article.offsetHeight || 1;

      const marks: { id: string; doc: number }[] = [];
      for (const item of toc) {
        const heading = document.getElementById(item.id);
        if (heading) {
          marks.push({
            id: item.id,
            doc: heading.getBoundingClientRect().top + window.pageYOffset,
          });
        }
      }
      if (marks.length === 0) return;

      const rows: Record<string, number> = {};
      marks.forEach((mark, i) => {
        const next =
          i + 1 < marks.length ? marks[i + 1].doc : articleTop + total;
        rows[mark.id] = Math.max(0, (next - mark.doc) / total);
      });

      const lead = Math.max(0, (marks[0].doc - articleTop) / total);
      const key = JSON.stringify({ lead, rows });
      if (key === lastWeights.current) return;
      lastWeights.current = key;
      setWeights({ lead, rows });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(article);
    return () => observer.disconnect();
  }, [toc, isLargeScreen]);

  // Draw the viewport segment on the rail. Heading positions in the article are
  // paired with the rail position of their row; the segment spans the rail
  // positions of the viewport's top and bottom edges.
  useEffect(() => {
    const track = trackRef.current;
    const rows = rowsRef.current;
    const thumb = thumbRef.current;
    const article = document.querySelector("article");
    if (!isLargeScreen || !track || !rows || !thumb || !article) return;

    let keypoints: { doc: number; rail: number }[] = [];
    // Heading position -> rail position, in document order. The rail band is
    // anchored to these so it starts at a heading rather than mid-section.
    let rowMarks: { doc: number; rail: number }[] = [];

    const measure = () => {
      const railHeight = track.getBoundingClientRect().height;
      if (railHeight === 0) return;
      const railTop = track.offsetTop;
      const articleRect = article.getBoundingClientRect();
      const next: { doc: number; rail: number }[] = [
        {
          doc: articleRect.top + window.pageYOffset,
          rail: railTop,
        },
      ];
      const marks: { doc: number; rail: number }[] = [];
      for (const item of toc) {
        const heading = document.getElementById(item.id);
        const row = rows.querySelector<HTMLElement>(
          `[data-toc-id="${item.id}"]`,
        );
        if (!heading || !row) continue;
        const mark = {
          doc: heading.getBoundingClientRect().top + window.pageYOffset,
          rail: row.offsetTop + row.offsetHeight / 2,
        };
        next.push(mark);
        marks.push(mark);
      }
      next.push({
        doc: articleRect.bottom + window.pageYOffset,
        rail: railTop + railHeight,
      });
      next.sort((a, b) => a.doc - b.doc);
      keypoints = next;
      rowMarks = marks;
    };

    const interpolate = (docY: number) => {
      if (keypoints.length === 0) return 0;
      if (docY <= keypoints[0].doc) return keypoints[0].rail;
      for (let i = 1; i < keypoints.length; i++) {
        const hi = keypoints[i];
        if (docY <= hi.doc) {
          const lo = keypoints[i - 1];
          const span = hi.doc - lo.doc;
          const t = span > 0 ? (docY - lo.doc) / span : 0;
          return lo.rail + t * (hi.rail - lo.rail);
        }
      }
      return keypoints[keypoints.length - 1].rail;
    };

    // The band's top snaps between headings, so ease it toward its target
    // instead of jumping. The bottom edge stays exact: height is derived from
    // the eased top, so the band still tracks the viewport one-to-one.
    const EASE_MS = 100;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let easedTop: number | null = null;
    let lastFrame = 0;

    const render = (now: number) => {
      const railHeight = track.getBoundingClientRect().height;
      if (railHeight === 0 || keypoints.length === 0) return false;
      const railTop = track.offsetTop;
      const railBottom = railTop + railHeight;

      // Anchor the band's top to the current section's heading so the highlight
      // covers whole sections instead of starting part-way down one. Same mark
      // as the row highlight, so the two always agree.
      const mark = window.scrollY + SCROLL_OFFSET;
      let target = interpolate(window.scrollY);
      for (const row of rowMarks) {
        if (row.doc > mark) break;
        target = row.rail;
      }

      if (easedTop === null || reduceMotion) {
        easedTop = target;
      } else if (easedTop !== target) {
        // Frame-rate independent exponential ease.
        const dt = lastFrame === 0 ? 16 : now - lastFrame;
        easedTop += (target - easedTop) * (1 - Math.exp(-dt / EASE_MS));
        if (Math.abs(target - easedTop) < 0.5) easedTop = target;
      }
      lastFrame = now;

      const bottom = interpolate(window.scrollY + window.innerHeight);
      const height = Math.max(8, bottom - easedTop);
      const top = Math.max(railTop, Math.min(easedTop, railBottom - height));
      thumb.style.setProperty("--toc-top", `${top}px`);
      thumb.style.setProperty("--toc-height", `${height}px`);
      return easedTop !== target;
    };

    // Heading and row positions both move as the page settles (web fonts,
    // images), so re-measure on each frame rather than trusting a cached map.
    let frame: number | null = null;
    const tick = (now: number) => {
      measure();
      if (render(now)) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = null;
        lastFrame = 0;
      }
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    tick(0);

    const observer = new ResizeObserver(schedule);
    observer.observe(rows);
    observer.observe(track);
    observer.observe(article);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [toc, isLargeScreen, weights]);

  if (toc.length === 0) {
    return null;
  }

  if (!isLargeScreen) {
    const currentItem = toc.find((item) => item.id === currentId) ?? toc[0];

    return (
      <nav
        className={`border-border bg-background/90 fixed top-0 right-0 left-0 z-40 border-b backdrop-blur-sm transition-transform duration-300 ${
          showSticky ? "translate-y-0" : "-translate-y-full"
        } ${className}`}
      >
        <div className="mx-auto max-w-prose">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="hover:bg-accent flex w-full items-center justify-between p-3 text-left"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="text-muted-foreground h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <span className="text-foreground truncate text-sm font-medium">
                  {currentItem?.text || "Table of Contents"}
                </span>
              </div>
              <svg
                className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="border-border bg-background fixed top-0 right-0 left-0 max-h-screen overflow-y-auto border-b shadow-lg">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToHeading(item.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`hover:bg-accent w-full px-4 py-2 text-left text-sm ${
                      item.id === currentId
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground"
                    }`}
                    style={{
                      paddingLeft: `${12 + (item.level - 1) * 16}px`,
                    }}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
    );
  }

  const baseLevel = Math.min(...toc.map((item) => item.level));

  return (
    <nav className={`table-of-contents ${className}`}>
      <div className="relative h-full py-8">
        {/* Rail */}
        <div
          ref={trackRef}
          className="bg-border pointer-events-none absolute inset-y-8 right-0 w-px"
        />
        {/* Viewport segment */}
        <div
          ref={thumbRef}
          className="bg-foreground/40 pointer-events-none absolute right-0 w-0.5 rounded-full"
          style={{
            top: "var(--toc-top, 0px)",
            height: "var(--toc-height, 0px)",
          }}
        />
        <div ref={rowsRef} className="flex h-full flex-col">
          {weights.lead > 0 && (
            <div aria-hidden style={{ flexGrow: weights.lead }} />
          )}
          {toc.map((item) => {
            const isActive = activeIds.includes(item.id);
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-toc-id={item.id}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHeading(item.id);
                }}
                style={{
                  flexGrow: weights.rows[item.id] ?? 0,
                  paddingRight: 2 + getItemIndent(item.level, baseLevel),
                }}
                className="group flex shrink-0 basis-0 items-center justify-end gap-1.5 py-1 text-right text-[13px] leading-snug"
              >
                <span
                  className={`transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {item.text}
                </span>
                <span
                  className={`h-[5px] w-[5px] shrink-0 rounded-full transition-colors ${
                    isActive
                      ? "bg-foreground"
                      : "bg-muted-foreground/50 group-hover:bg-foreground/60"
                  }`}
                />
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
