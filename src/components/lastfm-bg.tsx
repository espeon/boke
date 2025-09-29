import { useEffect, useState, useRef } from "react";
import { CrossFade } from "react-crossfade-simple";
import { useBackgroundState } from "../hooks/useBackgroundState";
import MeshArtBackground from "./home/BackgroundClock";
import { GrainOverlay } from "./home/GrainOverlay";

interface LastFmBackgroundProps {
  useDefaultImages?: boolean;
}

export function LastFmBackground({
  useDefaultImages = false,
}: LastFmBackgroundProps) {
  const { backgroundState } = useBackgroundState();
  const [skipFadeIn, setSkipFadeIn] = useState(false);
  const initialImage = useDefaultImages
    ? undefined
    : backgroundState.currentImageUrl;
  const [currentImage, setCurrentImage] = useState<string | undefined>(
    initialImage,
  );
  const [previousImage, setPreviousImage] = useState<string | undefined>(
    initialImage,
  );
  const [activeKey, setActiveKey] = useState<"first" | "second">("first");
  const previousImageRef = useRef<string | undefined>(initialImage);

  useEffect(() => {
    // Check if we're restoring from a persisted state
    const wrapper = document.getElementById("persist-wrapper");
    const existingCanvas = wrapper?.querySelector("canvas");

    if (existingCanvas) {
      // Canvas exists from previous page, skip fade-in
      setSkipFadeIn(true);
    }
  }, []);

  useEffect(() => {
    const newImage = useDefaultImages
      ? undefined
      : backgroundState.currentImageUrl;

    // Only trigger cross-fade if the image actually changed
    if (newImage !== previousImageRef.current) {
      previousImageRef.current = newImage;

      // Store current as previous before updating
      setPreviousImage(currentImage);
      setCurrentImage(newImage);

      // Toggle the active key to trigger cross-fade
      setActiveKey(activeKey === "first" ? "second" : "first");
    }
  }, [
    backgroundState.currentImageUrl,
    useDefaultImages,
    currentImage,
    activeKey,
  ]);

  // Calculate opacity reactively
  const [opacity, setOpacity] = useState(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    const isHomePage = new URL(window.location.href).pathname === "/";
    return isHomePage ? (isDarkMode ? 0.75 : 0.55) : 0.99;
  });

  useEffect(() => {
    const updateOpacity = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      const isHomePage = new URL(window.location.href).pathname === "/";
      setOpacity(isHomePage ? (isDarkMode ? 0.75 : 0.55) : 0.99);
    };

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateOpacity();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <CrossFade contentKey={activeKey}>
        <div
          className="bg-white dark:bg-black"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: opacity,
            transition: skipFadeIn ? "none" : "opacity 0.6s ease-in-out",
          }}
        >
          <MeshArtBackground
            imageUrl={currentImage}
            backgroundOpacity={opacity}
          />
        </div>
      </CrossFade>
      <GrainOverlay opacity={opacity / 8} />
    </>
  );
}
