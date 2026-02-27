import { Text } from '@pixi/react';
import { useTick } from '@pixi/react';
import { useRef } from 'react';
import * as PIXI from 'pixi.js';

const FLOAT_DURATION = 1500;
const FLOAT_DISTANCE = 20;

export function FloatingEmote({ emoji, startTime }: { emoji: string; startTime: number }) {
  const textRef = useRef<PIXI.Text | null>(null);

  useTick(() => {
    if (!textRef.current) return;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / FLOAT_DURATION);
    textRef.current.y = -24 - progress * FLOAT_DISTANCE;
    textRef.current.alpha = 1 - progress * progress; // ease-out fade
  });

  return (
    <Text
      ref={textRef}
      text={emoji}
      x={0}
      y={-24}
      scale={{ x: -0.8, y: 0.8 }}
      anchor={{ x: 0.5, y: 0.5 }}
    />
  );
}
