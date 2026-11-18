'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const HERO_IMAGES = [
  '/imagenes/1.png',
  '/imagenes/2.png',
  '/imagenes/3.png',
  '/imagenes/4.png',
  '/imagenes/5.png',
  '/imagenes/6.png',
  '/imagenes/7.png',
  '/imagenes/8.png',
  '/imagenes/9.png',
  '/imagenes/10.png',
  '/imagenes/11.png',
  '/imagenes/12.png',
  '/imagenes/13.png',
  '/imagenes/14.png',
];

interface HeroCarouselProps {
  intervalMs?: number;
  durationMs?: number;
}

export function HeroCarousel({ intervalMs = 7000, durationMs = 2000 }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {HERO_IMAGES.map((src, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity ease-in-out ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDuration: `${durationMs}ms` }}
            aria-hidden={!isActive}
          >
            <Image
              src={src}
              alt={`Click Agro fondo ${index + 1}`}
              fill
              priority={index === 0 || index === 1}
              sizes="100vw"
              className="object-cover object-center scale-105"
            />
          </div>
        );
      })}


    </div>
  );
}
