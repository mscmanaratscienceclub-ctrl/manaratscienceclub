"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
  { ssr: false }
);

interface LottiePlayerProps {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export default function LottiePlayer({
  src,
  className,
  loop = false,
  autoplay = true,
}: LottiePlayerProps) {
  return (
    <DotLottieReact
      src={src}
      className={className}
      loop={loop}
      autoplay={autoplay}
    />
  );
}
