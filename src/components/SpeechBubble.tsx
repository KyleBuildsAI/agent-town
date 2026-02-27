import { Container, Graphics, Text } from '@pixi/react';
import { useCallback, useRef } from 'react';
import { useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';

const MAX_CHARS = 50;
const BUBBLE_PADDING = 4;
const MAX_WIDTH = 80;
const FADE_DURATION_MS = 5000;
const FADE_OUT_MS = 500;

const textStyle = new PIXI.TextStyle({
  fontFamily: 'Arial',
  fontSize: 7,
  fill: 0x222222,
  wordWrap: true,
  wordWrapWidth: MAX_WIDTH,
  lineHeight: 9,
});

export function SpeechBubble({ text, x, y }: { text: string; x: number; y: number }) {
  const displayText = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS - 3) + '...' : text;

  // Measure text dimensions for the bubble background
  const metrics = PIXI.TextMetrics.measureText(displayText, textStyle);
  const textWidth = Math.min(metrics.width, MAX_WIDTH);
  const textHeight = metrics.height;

  const bubbleWidth = textWidth + BUBBLE_PADDING * 2;
  const bubbleHeight = textHeight + BUBBLE_PADDING * 2;
  const tailSize = 4;

  const startTime = useRef(Date.now());
  const alphaRef = useRef(1);
  const containerRef = useRef<PIXI.Container | null>(null);

  useTick(() => {
    const elapsed = Date.now() - startTime.current;
    let alpha = 1;
    if (elapsed > FADE_DURATION_MS) {
      alpha = Math.max(0, 1 - (elapsed - FADE_DURATION_MS) / FADE_OUT_MS);
    }
    if (alpha !== alphaRef.current) {
      alphaRef.current = alpha;
      if (containerRef.current) {
        containerRef.current.alpha = alpha;
      }
    }
  });

  const drawBubble = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      // Bubble body
      g.beginFill(0xffffff, 0.92);
      g.lineStyle(1, 0x333333, 0.8);
      g.drawRoundedRect(-bubbleWidth / 2, -bubbleHeight - tailSize, bubbleWidth, bubbleHeight, 4);
      g.endFill();
      // Tail pointing down
      g.beginFill(0xffffff, 0.92);
      g.lineStyle(0);
      g.moveTo(-tailSize, -tailSize);
      g.lineTo(0, 0);
      g.lineTo(tailSize, -tailSize);
      g.endFill();
    },
    [bubbleWidth, bubbleHeight],
  );

  return (
    <Container x={x} y={y} ref={containerRef}>
      <Graphics draw={drawBubble} />
      <Text
        text={displayText}
        x={-textWidth / 2}
        y={-bubbleHeight - tailSize + BUBBLE_PADDING}
        style={textStyle}
      />
    </Container>
  );
}
