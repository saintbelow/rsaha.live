import React from "react";

export default function HomePage() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/ivy.mp4" type="video/mp4" />
      </video>
      <audio autoPlay loop>
        <source src="/ivy_s.mp3" type="audio/mpeg" />
      </audio>
      <div className="relative z-10">
      </div>
    </main>
  );
}