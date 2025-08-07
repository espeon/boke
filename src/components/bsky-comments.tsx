"use client";
import React, { useState, useEffect } from "react";
import {
  AppBskyEmbedRecord,
  AppBskyFeedPost,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedGetPostThread,
} from "@atcute/bluesky";
import { LuX, LuArrowRight, LuHeart, LuRecycle, LuReply } from "react-icons/lu";

type BlueskyPost = AppBskyFeedPost.Main;
type BlueskyExternalEmbed = AppBskyEmbedExternal.View;
type ThreadView = AppBskyFeedDefs.ThreadViewPost;

// Utility function to get Bluesky CDN links
const getBlueskyCdnLink = (did: string, cid: string, ext: string) => {
  return `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@${ext}`;
};

// Multi-image layout component with modal support
const MultiImageLayout = ({
  did,
  images,
}: {
  did: string;
  images: AppBskyEmbedImages.Image[];
}) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const imageCount = images.length;

  // Different grid layouts based on number of images
  const gridClassName =
    {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-2",
      4: "grid-cols-2",
    }[Math.min(imageCount, 4)] || "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClassName} w-full gap-2`}>
        {images.map((image, i) => (
          <div
            key={i}
            className={`relative cursor-pointer overflow-hidden rounded-lg ${
              imageCount === 3 && i === 0 ? "col-span-2" : ""
            }`}
            onClick={() => setSelectedImage(i)}
          >
            <img
              src={getBlueskyCdnLink(
                did,
                (image.image as any).ref.$link,
                "jpeg",
              )}
              alt=""
              className="h-full max-h-64 w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-105"
              style={{
                aspectRatio: imageCount === 1 ? "" : "1/1",
              }}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {selectedImage !== null && (
        <>
          {/* Image Preview Modal */}
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-black/80"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={getBlueskyCdnLink(
                did,
                (images[selectedImage].image as any).ref.$link,
                "png",
              )}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            {images[selectedImage].alt && (
              <div className="text-white">
                Alt text: {images[selectedImage].alt}
              </div>
            )}
          </div>
          <div className="fixed top-2 right-2 z-50">
            <button
              className="text-blue-100 transition-colors duration-300 hover:text-red-400"
              onClick={() => setSelectedImage(null)}
            >
              <LuX />
            </button>
          </div>
        </>
      )}
    </>
  );
};

// Embed component for handling different types of Bluesky embeds
const BlueskyEmbed = ({
  embed,
  did,
}: {
  embed: BlueskyPost["embed"];
  did: string;
}) => {
  if (!embed || !embed.$type) {
    return null; // No embed data
  }
  return (
    <div className="mb-3 max-w-96 rounded-lg border border-neutral-500/50">
      {embed.$type === "app.bsky.embed.external" ? (
        <div className="items-left flex flex-col justify-center p-2">
          {embed.external.thumb && (
            <img
              src={getBlueskyCdnLink(
                did,
                (embed.external.thumb as any).ref.$link,
                "jpeg",
              )}
              alt={embed.external.title}
              className="mb-2 rounded-lg"
            />
          )}
          <h3 className="font-bold">{embed.external.title}</h3>
          <p className="text-sm text-gray-600">{embed.external.description}</p>
        </div>
      ) : embed.$type === "app.bsky.embed.images" ? (
        <div className="flex flex-col items-center justify-center">
          <MultiImageLayout did={did} images={embed.images} />
        </div>
      ) : (
        <div className="mb-3 max-w-64 rounded-lg border p-3">
          This embed type ({embed.$type}) is not yet implemented.
        </div>
      )}
    </div>
  );
};

// Type guard to check if record is a BlueskyPost
function isPost(post: any): post is BlueskyPost {
  return post.$type === "app.bsky.feed.post";
}

// Individual reply component with threading support
export interface BlueskyReplyProps {
  thread: ThreadView;
  depth?: number;
  skipFirst?: boolean;
}

const BlueskyReply = ({
  thread,
  depth = 0,
  skipFirst = false,
}: BlueskyReplyProps) => {
  if (thread.$type !== "app.bsky.feed.defs#threadViewPost") {
    return null;
  }

  const { post, replies } = thread;
  const { author, embed, replyCount, repostCount, likeCount, record } = post;
  let bskyPost: BlueskyPost | null = null;
  if (isPost(record)) {
    bskyPost = record as BlueskyPost;
  }

  // Limit nesting depth to prevent too deep chains
  const MAX_DEPTH = 5;

  // Add visual connector line for nested replies
  const connectorClass =
    depth > 1 ? "border-l border-gray-300 dark:border-gray-700 pl-6" : "";

  return (
    <div
      className={`bluesky-reply-chain`}
      style={{ marginLeft: depth > 1 ? 12 : 0 }}
    >
      {!skipFirst && (
        <div className={`bluesky-reply py-2 pb-1 ${connectorClass}`}>
          {/* Author Section */}
          <div className="mb-2 flex items-center">
            <img
              src={author.avatar}
              alt={author.displayName}
              className="mr-3 h-10 w-10 rounded-full"
            />
            <div>
              <a
                className="font-bold"
                href={`https://bsky.app/profile/${author.did}`}
              >
                {author.displayName}
              </a>
              <div className="text-gray-700 dark:text-gray-400">
                <a href={`https://bsky.app/profile/${author.did}`}>
                  @{author.handle}
                </a>
              </div>
            </div>
          </div>

          {/* Content Section */}

          {bskyPost && (
            <>
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <span>{bskyPost?.text}</span>
                </div>
              </div>

              {/* Embed Section */}
              {embed && (
                <BlueskyEmbed embed={bskyPost.embed} did={author.did} />
              )}
            </>
          )}

          {/* Engagement Stats */}
          <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>{likeCount}</span> <LuHeart />
            </div>
            <div className="flex items-center gap-2">
              <span>{replyCount}</span> <LuReply />
            </div>
            <div className="flex items-center gap-2">
              <span>{repostCount}</span> <LuRecycle />
            </div>
            <a
              href={`https://bsky.app/profile/${author.did}/post/${post.uri.split("/").pop()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Go to post
              <LuArrowRight />
            </a>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {depth < MAX_DEPTH && replies && replies.length > 0 && (
        <div className="nested-replies">
          {replies
            .filter((r) => r.$type === "app.bsky.feed.defs#threadViewPost")
            .map((nestedReply, index) => (
              <BlueskyReply
                key={`${(nestedReply as any).post?.uri}-${index}`}
                thread={nestedReply as ThreadView}
                depth={depth + 1}
              />
            ))}
        </div>
      )}

      {/* Show "View more replies" button if depth limit reached */}
      {depth === MAX_DEPTH && replies && replies.length > 0 && (
        <button className="mt-2 ml-4 text-blue-500">
          View more replies...
        </button>
      )}
    </div>
  );
};

// Type guard for ThreadView
function isThreadView(thread: unknown): thread is ThreadView {
  return (thread as ThreadView)?.$type === "app.bsky.feed.defs#threadViewPost";
}

// Main comments component props
export interface CommentsProps {
  // The DID of the OP
  did: string;
  // The CID of the app.bsky.feed.post
  postCid: string;
  // Skip rendering the first post (useful when showing comments below the main post)
  skipFirst?: boolean;
}

// Main Bluesky Comments component
export default function BlueskyComments({
  did,
  postCid,
  skipFirst = false,
}: CommentsProps) {
  const [comments, setComments] =
    useState<AppBskyFeedGetPostThread.$output | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: AppBskyFeedGetPostThread.$params = {
          uri: `at://${did}/app.bsky.feed.post/${postCid}`,
          depth: 6, // Optional: how deep to fetch replies (default is 6)
        };

        const searchParams = new URLSearchParams();
        searchParams.append("uri", params.uri);
        if (params.depth !== undefined) {
          searchParams.append("depth", params.depth.toString());
        }
        if (params.parentHeight !== undefined) {
          searchParams.append("parentHeight", params.parentHeight.toString());
        }

        const response = await fetch(
          "https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?" +
            searchParams,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch comments: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched comments:", data);
        setComments(data);
      } catch (err) {
        console.error("Error fetching comments:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (did && postCid) {
      fetchComments();
    }
  }, [did, postCid]);

  // Loading state
  if (loading) {
    return (
      <div className="ml-4 text-2xl">
        Loading comments...
        <noscript className="ml-4 text-xl text-neutral-800 dark:text-neutral-300">
          You may need to enable JavaScript to view comments.
        </noscript>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ml-4 text-red-600">Error loading comments: {error}</div>
    );
  }

  // No comments data
  if (!comments) {
    return <div className="ml-4 text-neutral-600">No comments available.</div>;
  }

  // Invalid thread type
  if (!isThreadView(comments.thread)) {
    return (
      <div className="ml-4 text-red-600">
        Error: Invalid thread data received
      </div>
    );
  }

  // Render the thread
  return (
    <div className="not-prose w-full min-w-full">
      <BlueskyReply thread={comments.thread} skipFirst={skipFirst} />
    </div>
  );
}

// Export individual components for potential reuse
export { BlueskyReply, BlueskyEmbed, MultiImageLayout };
