import { useEffect, useState, useRef } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  className?: string;
  hasComments?: boolean;
}

type TOCThumb = [top: number, height: number];

function calc(container: HTMLElement, active: string[]): TOCThumb {
  if (active.length === 0 || container.clientHeight === 0) {
    return [0, 0];
  }

  let upper = Number.MAX_VALUE;
  let lower = 0;

  // Get all TOC items to calculate cumulative positions
  const allTocItems = Array.from(container.querySelectorAll('a[href^="#"]'));

  for (const item of active) {
    const element = container.querySelector<HTMLElement>(`a[href="#${item}"]`);
    if (!element) continue;

    // Find the index of this item in the TOC
    const itemIndex = allTocItems.indexOf(element);
    if (itemIndex === -1) continue;

    // Calculate cumulative position by adding up all previous items' heights
    let cumulativeTop = 0;
    for (let i = 0; i < itemIndex; i++) {
      const prevElement = allTocItems[i] as HTMLElement;
      const prevStyles = getComputedStyle(prevElement);
      cumulativeTop += prevElement.clientHeight;
    }

    const styles = getComputedStyle(element);
    const paddingTop = parseFloat(styles.paddingTop);
    const paddingBottom = parseFloat(styles.paddingBottom);
    const elementTop = cumulativeTop + paddingTop;
    const elementBottom = cumulativeTop + element.clientHeight - paddingBottom;

    upper = Math.min(upper, elementTop);
    lower = Math.max(lower, elementBottom);
  }
  return [upper, lower - upper];
}

function update(element: HTMLElement, info: TOCThumb): void {
  element.style.setProperty("--fd-top", `${info[0]}px`);
  element.style.setProperty("--fd-height", `${info[1]}px`);
}

function TocThumb({
  containerRef,
  activeItems,
  className = "",
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  activeItems: string[];
  className?: string;
}) {
  const thumbRef = useRef<HTMLDivElement>(null);

  const onResize = () => {
    if (!containerRef.current || !thumbRef.current) return;
    const result = calc(containerRef.current, activeItems);
    update(thumbRef.current, result);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    onResize();
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, onResize]);

  useEffect(() => {
    if (!containerRef.current || !thumbRef.current) return;
    const result = calc(containerRef.current, activeItems);
    update(thumbRef.current, result);
  }, [activeItems, containerRef]);

  if (!containerRef.current) return null;

  return (
    <div
      ref={thumbRef}
      className={`absolute -left-1 w-4 bg-blue-600 transition-all duration-200 dark:bg-blue-300 ${className}`}
      style={{
        top: "var(--fd-top, 0px)",
        height: "var(--fd-height, 0px)",
        minHeight: activeItems.length > 0 ? "2px" : "0px",
      }}
    />
  );
}

function getItemOffset(depth: number): number {
  if (depth <= 2) return 14;
  if (depth === 3) return 26;
  return 36;
}

function getLineOffset(depth: number): number {
  return depth >= 3 ? 10 : 0;
}

function TOCItem({
  item,
  upper = item.level,
  lower = item.level,
  isActive = false,
  onClick,
}: {
  item: TocItem;
  upper?: number;
  lower?: number;
  isActive?: boolean;
  onClick: () => void;
}) {
  const offset = getLineOffset(item.level);
  const upperOffset = getLineOffset(upper);
  const lowerOffset = getLineOffset(lower);

  return (
    <div className="relative">
      <a
        href={`#${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={`relative block py-1.5 text-sm transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${
          isActive
            ? "text-blue-800 dark:text-blue-300"
            : "text-neutral-600 dark:text-neutral-400"
        }`}
        style={{
          paddingLeft: `${getItemOffset(item.level)}px`,
        }}
      >
        {item.text}
      </a>
    </div>
  );
}

export default function TableOfContents({
  className = "",
  hasComments = false,
}: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeItems, setActiveItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [svg, setSvg] = useState<{
    path: string;
    width: number;
    height: number;
  }>();

  // Extract headings from the page
  useEffect(() => {
    const headings = document.querySelectorAll(
      "article h1, article h2, article h3, article h4, article h5, article h6",
    );
    const tocItems: TocItem[] = [];

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

      tocItems.push({
        id,
        text: heading.textContent || "",
        level,
      });
    });

    // Add comments section if it exists
    if (hasComments) {
      tocItems.push({
        id: "comments",
        text: "Comments",
        level: 2,
      });
    }

    setToc(tocItems);
  }, [hasComments]);

  // Track screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1500);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Track scroll position for sticky TOC
  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate SVG mask
  useEffect(() => {
    if (!containerRef.current || toc.length === 0) return;
    const container = containerRef.current;

    function onResize(): void {
      if (container.clientHeight === 0) return;
      let w = 0;
      let h = 0;
      const d: string[] = [];

      let cumulativeTop = 0;

      for (let i = 0; i < toc.length; i++) {
        const element: HTMLElement | null = container.querySelector(
          `a[href="#${toc[i].id}"]`,
        );
        if (!element) continue;

        const styles = getComputedStyle(element);
        const offset = getLineOffset(toc[i].level) + 1,
          top = cumulativeTop + parseFloat(styles.paddingTop),
          bottom =
            cumulativeTop +
            element.clientHeight -
            parseFloat(styles.paddingBottom);

        w = Math.max(offset, w);
        h = Math.max(h, bottom);

        d.push(`${i === 0 ? "M" : "L"}${offset} ${top}`);
        d.push(`L${offset} ${bottom}`);

        // Add this item's height to cumulative position
        cumulativeTop += element.clientHeight;
      }

      setSvg({
        path: d.join(" "),
        width: w + 1,
        height: h,
      });
    }

    const observer = new ResizeObserver(onResize);
    onResize();
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [toc]);

  // Track active sections
  useEffect(() => {
    if (toc.length === 0) return;

    const calculateActiveItems = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const activeIds: string[] = [];

      if (!isLargeScreen) {
        // For small screens (sticky mode), just find the current heading (most recently scrolled past)
        for (let i = toc.length - 1; i >= 0; i--) {
          const element = document.getElementById(toc[i].id);
          if (element && element.getBoundingClientRect().top <= 100) {
            activeIds.push(toc[i].id);
            break;
          }
        }
      } else {
        // For large screens (regular mode), find all headings that are actually visible in the viewport
        for (const item of toc) {
          const element = document.getElementById(item.id);
          if (!element) continue;

          const rect = element.getBoundingClientRect();

          // Only include headings that are actually visible in the viewport
          // Top of element is above bottom of viewport AND bottom of element is below top of viewport
          if (rect.top < windowHeight && rect.bottom > 0) {
            activeIds.push(item.id);
          }
        }
      }

      // If no headings are detected, use the most recent one we've scrolled past
      if (activeIds.length === 0) {
        for (let i = toc.length - 1; i >= 0; i--) {
          const element = document.getElementById(toc[i].id);
          if (
            element &&
            element.getBoundingClientRect().top <= windowHeight * 0.5
          ) {
            activeIds.push(toc[i].id);
            break;
          }
        }
      }

      // If still no headings, use the first one
      if (activeIds.length === 0 && toc.length > 0) {
        activeIds.push(toc[0].id);
      }

      setActiveItems(activeIds);
    };

    const handleScroll = () => {
      calculateActiveItems();
    };

    window.addEventListener("scroll", handleScroll);
    calculateActiveItems();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }
  };

  if (toc.length === 0) {
    return null;
  }

  if (!isLargeScreen) {
    const currentItem =
      activeItems.length > 0
        ? toc.find((item) => item.id === activeItems[0])
        : toc[0];

    return (
      <nav
        className={`fixed top-0 right-0 left-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-sm transition-transform duration-300 dark:border-zinc-700 dark:bg-zinc-900/90 ${
          showSticky ? "translate-y-0" : "-translate-y-full"
        } ${className}`}
      >
        <div className="mx-auto max-w-prose">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex w-full items-center justify-between p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="h-4 w-4 text-zinc-500"
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
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {currentItem?.text || "Table of Contents"}
                </span>
              </div>
              <svg
                className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${
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
              <div className="fixed top-0 right-0 left-0 max-h-screen overflow-y-auto border-b border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToHeading(item.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                      activeItems.includes(item.id)
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-zinc-700 dark:text-zinc-300"
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

  return (
    <nav className={`table-of-contents ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          On this page
        </h4>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label={
            isCollapsed
              ? "Expand table of contents"
              : "Collapse table of contents"
          }
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              isCollapsed ? "rotate-0" : "rotate-180"
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
      </div>

      <div className="relative">
        {/* SVG mask for connecting lines */}
        {svg && (
          <div
            className="absolute top-0 left-0"
            style={{
              width: svg.width,
              height: svg.height,
              maskImage: `url("data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svg.width} ${svg.height}"><path d="${svg.path}" stroke="black" stroke-width="3" fill="none" /></svg>`,
              )}")`,
            }}
          >
            <div className="h-full bg-gray-300 dark:bg-gray-600" />

            <TocThumb
              containerRef={containerRef}
              activeItems={activeItems}
              className="bg-blue-500 dark:bg-blue-400"
            />
          </div>
        )}

        {/* TOC items */}
        <div
          ref={containerRef}
          data-toc-container
          className={`flex flex-col overflow-y-auto transition-all duration-200 ${
            isCollapsed ? "max-h-0 lg:block lg:max-h-none" : "max-h-96"
          }`}
        >
          {toc.map((item, i) => (
            <TOCItem
              key={item.id}
              item={item}
              upper={toc[i - 1]?.level}
              lower={toc[i + 1]?.level}
              isActive={activeItems.includes(item.id)}
              onClick={() => {
                scrollToHeading(item.id);
                setIsCollapsed(true);
              }}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
