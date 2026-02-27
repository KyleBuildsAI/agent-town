import { BaseTexture, ISpritesheetData, Spritesheet } from 'pixi.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedSprite, Container, Graphics, Text } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { SpeechBubble } from './SpeechBubble.tsx';
import { FloatingEmote } from './FloatingEmote.tsx';

export const Character = ({
  textureUrl,
  spritesheetData,
  x,
  y,
  orientation,
  isMoving = false,
  isThinking = false,
  isSpeaking = false,
  speechText,
  emoji = '',
  isViewer = false,
  speed = 0.1,
  playerName,
  status,
  onClick,
}: {
  // Path to the texture packed image.
  textureUrl: string;
  // The data for the spritesheet.
  spritesheetData: ISpritesheetData;
  // The pose of the NPC.
  x: number;
  y: number;
  orientation: number;
  isMoving?: boolean;
  // Shows a thought bubble if true.
  isThinking?: boolean;
  // Shows a speech bubble if true.
  isSpeaking?: boolean;
  // Actual message text to show in a speech bubble.
  speechText?: string;
  emoji?: string;
  // Highlights the player.
  isViewer?: boolean;
  // The speed of the animation. Can be tuned depending on the side and speed of the NPC.
  speed?: number;
  // Character name displayed below the sprite.
  playerName?: string;
  // Current status for the indicator dot.
  status?: 'idle' | 'walking' | 'conversation' | 'activity';
  onClick: () => void;
}) => {
  const [spriteSheet, setSpriteSheet] = useState<Spritesheet>();
  useEffect(() => {
    const parseSheet = async () => {
      const sheet = new Spritesheet(
        BaseTexture.from(textureUrl, {
          scaleMode: PIXI.SCALE_MODES.NEAREST,
        }),
        spritesheetData,
      );
      await sheet.parse();
      setSpriteSheet(sheet);
    };
    void parseSheet();
  }, []);

  // The first "left" is "right" but reflected.
  const roundedOrientation = Math.floor(orientation / 90);
  const direction = ['right', 'down', 'left', 'up'][roundedOrientation];

  // Prevents the animation from stopping when the texture changes
  // (see https://github.com/pixijs/pixi-react/issues/359)
  const ref = useRef<PIXI.AnimatedSprite | null>(null);
  useEffect(() => {
    if (isMoving) {
      ref.current?.play();
    }
  }, [direction, isMoving]);

  // Track emoji changes to trigger floating animation
  const [emoteState, setEmoteState] = useState<{ emoji: string; startTime: number } | null>(null);
  const prevEmojiRef = useRef(emoji);
  useEffect(() => {
    if (emoji && emoji !== prevEmojiRef.current) {
      setEmoteState({ emoji, startTime: Date.now() });
    }
    if (!emoji && prevEmojiRef.current) {
      // Keep the last emote animating out, don't clear immediately
    }
    prevEmojiRef.current = emoji;
  }, [emoji]);

  if (!spriteSheet) return null;

  let blockOffset = { x: 0, y: 0 };
  switch (roundedOrientation) {
    case 2:
      blockOffset = { x: -20, y: 0 };
      break;
    case 0:
      blockOffset = { x: 20, y: 0 };
      break;
    case 3:
      blockOffset = { x: 0, y: -20 };
      break;
    case 1:
      blockOffset = { x: 0, y: 20 };
      break;
  }

  return (
    <Container x={x} y={y} interactive={true} pointerdown={onClick} cursor="pointer">
      {isThinking && (
        // TODO: We'll eventually have separate assets for thinking and speech animations.
        <Text x={-20} y={-10} scale={{ x: -0.8, y: 0.8 }} text={'💭'} anchor={{ x: 0.5, y: 0.5 }} />
      )}
      {speechText ? (
        <SpeechBubble text={speechText} x={0} y={-20} />
      ) : (
        isSpeaking && (
          <Text x={18} y={-10} scale={0.8} text={'💬'} anchor={{ x: 0.5, y: 0.5 }} />
        )
      )}
      {isViewer && <ViewerIndicator />}
      <AnimatedSprite
        ref={ref}
        isPlaying={isMoving}
        textures={spriteSheet.animations[direction]}
        animationSpeed={speed}
        anchor={{ x: 0.5, y: 0.5 }}
      />
      {status && <StatusDot status={status} />}
      {emoteState && (
        <FloatingEmote
          key={emoteState.startTime}
          emoji={emoteState.emoji}
          startTime={emoteState.startTime}
        />
      )}
      {playerName && (
        <Text
          text={playerName}
          x={0}
          y={14}
          anchor={{ x: 0.5, y: 0 }}
          style={
            new PIXI.TextStyle({
              fontFamily: 'Arial',
              fontSize: 7,
              fill: 0xffffff,
              stroke: 0x000000,
              strokeThickness: 2,
              align: 'center',
            })
          }
        />
      )}
    </Container>
  );
};

function ViewerIndicator() {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.beginFill(0xffff0b, 0.5);
    g.drawRoundedRect(-10, 10, 20, 10, 100);
    g.endFill();
  }, []);

  return <Graphics draw={draw} />;
}

const STATUS_COLORS: Record<string, number> = {
  idle: 0x888888,
  walking: 0x44aaff,
  conversation: 0x44ff44,
  activity: 0xffaa44,
};

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 0x888888;
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.beginFill(color, 0.8);
      g.drawCircle(0, 0, 2.5);
      g.endFill();
    },
    [color],
  );

  return <Graphics draw={draw} x={12} y={-12} />;
}
