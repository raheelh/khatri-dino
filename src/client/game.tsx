import './index.css';

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

type ObstacleKind = 'small-cactus' | 'cactus' | 'double-cactus' | 'rock';

type Obstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  kind: ObstacleKind;
};

type GameState = {
  started: boolean;
  gameOver: boolean;
  dinoY: number;
  velocity: number;
  obstacles: Obstacle[];
  score: number;
  spawnTimer: number;
  lives: number;
  hitCooldown: number;
  phase: 'intro' | 'running' | 'exploding' | 'respawning' | 'level-intro';
  dinoVisible: boolean;
  explosionTimer: number;
  level: number;
  levelTimer: number;
  levelIntroTimer: number;
};

const initialState: GameState = {
  started: false,
  gameOver: false,
  dinoY: 0,
  velocity: 0,
  obstacles: [],
  score: 0,
  spawnTimer: 0,
  lives: 5,
  hitCooldown: 0,
  phase: 'intro',
  dinoVisible: true,
  explosionTimer: 0,
  level: 1,
  levelTimer: 0,
  levelIntroTimer: 0,
};

const DINO_SIZE = 34;
const DINO_X = 32;
const GRAVITY = 0.82;
const JUMP_FORCE = 13.5;
const BASE_SPEED = 7;
const MAX_SPEED = 13;
const BASE_SPAWN_MS = 1400;
const MIN_SPAWN_MS = 760;
const LEVEL_DURATION_MS = 60_000;
const LEVEL_INTRO_MS = 1_600;

const clouds = [
  { left: -30, top: 30, scale: 1.1, opacity: 0.75 },
  { left: 180, top: 18, scale: 0.8, opacity: 0.65 },
  { left: 360, top: 44, scale: 1.3, opacity: 0.7 },
  { left: 560, top: 22, scale: 0.9, opacity: 0.6 },
  { left: 760, top: 40, scale: 1.05, opacity: 0.7 },
  { left: 960, top: 26, scale: 0.8, opacity: 0.6 },
];

const mountainPalette = [
  { height: 72, color: '#b7d2c9' },
  { height: 98, color: '#8db5b1' },
  { height: 88, color: '#7da6a6' },
  { height: 112, color: '#6d96a2' },
];

export const App = () => {
  const [game, setGame] = useState<GameState>(initialState);
  const nextObstacleId = useRef(1);
  const lastFrame = useRef<number | null>(null);

  const jump = () => {
    setGame((prev) => {
      if (prev.gameOver) {
        lastFrame.current = null;
        return {
          ...initialState,
          started: true,
          phase: 'intro',
          dinoY: 150,
          velocity: 0,
          dinoVisible: true,
        };
      }

      if (!prev.started) {
        lastFrame.current = null;
        return {
          ...prev,
          started: true,
          phase: 'intro',
          dinoY: 150,
          velocity: 0,
          dinoVisible: true,
          level: 1,
          levelTimer: 0,
          levelIntroTimer: 0,
        };
      }

      if (prev.phase === 'exploding' || prev.phase === 'respawning' || prev.phase === 'level-intro') {
        return prev;
      }

      if (prev.dinoY <= 0) {
        return { ...prev, velocity: JUMP_FORCE };
      }

      return prev;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const tick = (timestamp: number) => {
      if (lastFrame.current === null) {
        lastFrame.current = timestamp;
      }

      const delta = timestamp - lastFrame.current;
      lastFrame.current = timestamp;

      setGame((prev) => {
        if (!prev.started || prev.gameOver) {
          return prev;
        }

        const deltaScale = delta / 16.67;
        const cooldown = Math.max(0, prev.hitCooldown - delta);

        if (prev.phase === 'level-intro') {
          const nextLevelIntroTimer = Math.max(0, prev.levelIntroTimer - delta);
          if (nextLevelIntroTimer <= 0) {
            return {
              ...prev,
              phase: 'running',
              levelIntroTimer: 0,
              dinoY: 0,
              velocity: 0,
            };
          }

          return {
            ...prev,
            levelIntroTimer: nextLevelIntroTimer,
          };
        }

        if (prev.phase === 'intro') {
          const nextVelocity = prev.velocity - GRAVITY * deltaScale;
          const nextDinoY = Math.max(0, prev.dinoY + nextVelocity * deltaScale);

          if (nextDinoY <= 0) {
            return {
              ...prev,
              dinoY: 0,
              velocity: 0,
              phase: 'level-intro',
              levelIntroTimer: LEVEL_INTRO_MS,
              dinoVisible: true,
            };
          }

          return {
            ...prev,
            dinoY: nextDinoY,
            velocity: nextVelocity,
          };
        }

        if (prev.phase === 'exploding') {
          const nextExplosionTimer = Math.max(0, prev.explosionTimer - delta);

          if (nextExplosionTimer <= 0) {
            if (prev.lives > 0) {
              return {
                ...prev,
                phase: 'respawning',
                dinoVisible: true,
                dinoY: 150,
                velocity: 0,
                explosionTimer: 0,
                hitCooldown: 1000,
              };
            }

            return {
              ...prev,
              phase: 'running',
              gameOver: true,
              dinoVisible: false,
              explosionTimer: 0,
            };
          }

          return { ...prev, explosionTimer: nextExplosionTimer, dinoVisible: false };
        }

        if (prev.phase === 'respawning') {
          const nextVelocity = prev.velocity - GRAVITY * deltaScale;
          const nextDinoY = Math.max(0, prev.dinoY + nextVelocity * deltaScale);

          if (nextDinoY <= 0) {
            return {
              ...prev,
              dinoY: 0,
              velocity: 0,
              phase: 'running',
              dinoVisible: true,
              hitCooldown: 0,
            };
          }

          return {
            ...prev,
            dinoY: nextDinoY,
            velocity: nextVelocity,
          };
        }

        const nextVelocity = prev.velocity - GRAVITY * deltaScale;
        const nextDinoY = Math.max(0, prev.dinoY + nextVelocity * deltaScale);
        const nextLevelTimer = prev.levelTimer + delta;
        const obstacleSpeed = BASE_SPEED + (prev.level - 1) * 1.2 + Math.min(prev.score / 35, MAX_SPEED - BASE_SPEED);
        let nextObstacles = prev.obstacles
          .map((obstacle) => ({
            ...obstacle,
            x: obstacle.x - obstacleSpeed * deltaScale,
          }))
          .filter((obstacle) => obstacle.x + obstacle.width > -20);

        let spawnTimer = prev.spawnTimer + delta;
        const nextSpawnDelay = Math.max(
          MIN_SPAWN_MS,
          BASE_SPAWN_MS - prev.level * 90 - prev.score * 0.12
        );

        if (spawnTimer >= nextSpawnDelay) {
          spawnTimer = 0;
          const levelBias = prev.level / 10;
          const kindRoll = Math.random();
          const kind: ObstacleKind =
            kindRoll < 0.18 + levelBias * 0.18
              ? 'small-cactus'
              : kindRoll < 0.46 + levelBias * 0.22
                ? 'double-cactus'
                : kindRoll < 0.78 + levelBias * 0.18
                  ? 'cactus'
                  : 'rock';

          const obstacleHeights = {
            'small-cactus': [18, 28],
            cactus: [28, 40],
            'double-cactus': [32, 54],
            rock: [18, 32],
          } as const;

          const [minHeight, maxHeight] = obstacleHeights[kind];

          nextObstacles = [
            ...nextObstacles,
            {
              id: nextObstacleId.current++,
              x: 430,
              width: kind === 'rock' ? 18 + Math.random() * 12 : 18 + Math.random() * 24,
              height: minHeight + Math.random() * (maxHeight - minHeight),
              kind,
            },
          ];
        }

        const collided = nextObstacles.filter((obstacle) => {
          const dinoRight = DINO_X + DINO_SIZE;
          const dinoLeft = DINO_X;
          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + obstacle.width;
          const xOverlap = dinoRight > obstacleLeft && dinoLeft < obstacleRight;
          const dinoBottom = nextDinoY;
          const dinoTop = nextDinoY + DINO_SIZE;
          const yOverlap = dinoTop > 0 && dinoBottom < obstacle.height;
          return xOverlap && yOverlap;
        });

        if (collided.length > 0 && cooldown <= 0) {
          const nextLives = Math.max(0, prev.lives - 1);
          const nextGameOver = nextLives <= 0;

          nextObstacles = nextObstacles.filter((obstacle) => !collided.some((hit) => hit.id === obstacle.id));

          return {
            ...prev,
            dinoY: nextDinoY,
            velocity: 0,
            obstacles: nextObstacles,
            score: prev.score + delta * 0.02,
            spawnTimer,
            lives: nextLives,
            hitCooldown: 1000,
            phase: nextGameOver ? 'running' : 'exploding',
            dinoVisible: false,
            explosionTimer: nextGameOver ? 0 : 380,
            gameOver: nextGameOver,
          };
        }

        if (nextLevelTimer >= LEVEL_DURATION_MS) {
          if (prev.level >= 10) {
            return {
              ...prev,
              dinoY: nextDinoY,
              velocity: nextDinoY === 0 ? 0 : nextVelocity,
              obstacles: nextObstacles,
              score: prev.score + delta * 0.02,
              spawnTimer,
              hitCooldown: cooldown,
              explosionTimer: prev.explosionTimer,
              levelTimer: 0,
            };
          }

          return {
            ...prev,
            dinoY: 0,
            velocity: 0,
            obstacles: [],
            score: prev.score + delta * 0.02,
            spawnTimer: 0,
            hitCooldown: cooldown,
            explosionTimer: prev.explosionTimer,
            level: prev.level + 1,
            levelTimer: 0,
            phase: 'level-intro',
            levelIntroTimer: LEVEL_INTRO_MS,
            dinoVisible: true,
          };
        }

        return {
          ...prev,
          dinoY: nextDinoY,
          velocity: nextDinoY === 0 ? 0 : nextVelocity,
          obstacles: nextObstacles,
          score: prev.score + delta * 0.02,
          spawnTimer,
          hitCooldown: cooldown,
          explosionTimer: prev.explosionTimer,
          levelTimer: nextLevelTimer,
        };
      });

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const isReadyToJump = !game.gameOver && !(game.started && game.dinoY > 0);
  const cloudScroll = (game.score * 0.16) % 900;
  const mountainTrack = 220;
  const mountainScroll = (game.score * 0.7) % mountainTrack;
  const groundScroll = (game.score * 1.4) % 180;
  const lifeBlocks = Array.from({ length: 5 }, (_, index) => index < game.lives);
  const showDino = game.dinoVisible && !game.gameOver;
  const showLevelBanner = game.phase === 'intro' || game.phase === 'level-intro';
  const currentLevel = Math.min(10, Math.max(1, game.level));
  const elapsedSeconds = Math.floor(game.levelTimer / 1000);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedRemainder = elapsedSeconds % 60;
  const formattedTime = `${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedRemainder).padStart(2, '0')}`;
  const dinoRunCycle = Math.floor(game.score / 8) % 2;
  const dinoLegAngle = game.phase === 'running' ? (dinoRunCycle === 0 ? -14 : 14) : 0;
  const dinoHeadBob = game.started && !game.gameOver && game.phase === 'running' ? Math.sin(game.score / 9) * 1.5 : 0;
  const dinoSvgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 120">
      <defs>
        <linearGradient id="dinoBody" x1="0" x2="1">
          <stop offset="0%" stop-color="#6dbb7a"/>
          <stop offset="45%" stop-color="#4fa363"/>
          <stop offset="100%" stop-color="#2d6d46"/>
        </linearGradient>
      </defs>
      <g fill="none" stroke="#1c3f2b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 72 L30 60 L54 54 L74 58 L86 66 L102 68 L110 77 L98 86 L72 92 L28 92 L14 82 Z" fill="url(#dinoBody)"/>
        <path d="M26 58 L16 40 L4 36 L14 48 L26 54 Z" fill="#3d8c5a"/>
        <path d="M84 64 L108 42 L136 36 L154 42 L164 52 L150 58 L132 62 L110 68 Z" fill="url(#dinoBody)"/>
        <path d="M118 39 L150 28 L170 34 L170 48 L152 54 L128 54 Z" fill="#5fb77a"/>
        <path d="M150 34 L170 30 L176 36 L170 46 L152 48 Z" fill="#dfeec6"/>
        <path d="M138 44 L159 46" stroke="#1c3f2b"/>
        <path d="M124 50 L148 52" stroke="#1c3f2b"/>
        <circle cx="156" cy="36" r="3.2" fill="#1c3f2b"/>
        <path d="M30 90 L40 90 L34 110 L22 110 Z" fill="#2d6d46" transform="rotate(${dinoLegAngle} 30 90)"/>
        <path d="M58 90 L68 90 L64 112 L52 112 Z" fill="#2d6d46" transform="rotate(${dinoLegAngle * -1} 58 90)"/>
        <path d="M68 90 L78 90 L76 110 L64 110 Z" fill="#2d6d46" transform="rotate(${dinoLegAngle * -1} 68 90)"/>
        <path d="M90 90 L98 90 L96 110 L82 110 Z" fill="#2d6d46" transform="rotate(${dinoLegAngle} 90 90)"/>
        <path d="M28 70 L40 74" stroke="#1c3f2b"/>
        <path d="M46 56 L64 62" stroke="#1c3f2b"/>
        <path d="M90 76 L104 74" stroke="#1c3f2b"/>
        <path d="M150 56 L166 56" stroke="#1c3f2b"/>
      </g>
    </svg>
  `;
  const dinoSpriteUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dinoSvgMarkup)}`;
  const explosionPuffs = Array.from({ length: 10 }, (_, index) => ({
    left: 8 + index * 9,
    top: 10 + (index % 4) * 6,
    size: 12 + (index % 5) * 8,
  }));

  return (
    <div
      className="relative flex min-h-screen touch-manipulation flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fef3c7_0%,#e0f2fe_24%,#dbeafe_42%,#e2e8f0_100%)] px-4 text-slate-900"
      onPointerDown={jump}
    >
      <div className="w-full max-w-[540px] overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-sky-200 bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600 md:text-xs">
          <span>Khatri Dino</span>
          <div className="flex items-center gap-1.5">
            {lifeBlocks.map((alive, index) => (
              <span
                key={`life-${index}`}
                className={alive ? 'text-[#e11d48]' : 'text-slate-300'}
                aria-label={alive ? 'Life remaining' : 'Life lost'}
              >
                ❤
              </span>
            ))}
          </div>
          <span>Score: {Math.floor(game.score)}</span>
        </div>

        <div className="relative h-[250px] overflow-hidden bg-[linear-gradient(#dff6ff_0%,#dfeeff_35%,#fff3d6_70%,#f7d7a3_100%)]">
          <div className="absolute right-4 top-4 z-20 rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            {formattedTime}
          </div>

          <div className="absolute inset-x-0 top-0 h-full">
            {clouds.map((cloud, index) => {
              const left = ((cloud.left - cloudScroll * (index * 0.18 + 0.45)) % 1040) - 120;

              return (
                <div
                  key={`${cloud.left}-${index}`}
                  className="absolute rounded-full bg-white/70 shadow-[0_10px_25px_rgba(255,255,255,0.6)]"
                  style={{
                    left: `${left}px`,
                    top: `${cloud.top}px`,
                    width: `${76 * cloud.scale}px`,
                    height: `${26 * cloud.scale}px`,
                    opacity: cloud.opacity,
                  }}
                >
                  <div className="absolute -left-4 top-3 h-7 w-7 rounded-full bg-white/80" />
                  <div className="absolute left-7 top-2 h-7 w-7 rounded-full bg-white/80" />
                  <div className="absolute right-5 top-4 h-6 w-6 rounded-full bg-white/80" />
                </div>
              );
            })}
          </div>

          <div className="absolute inset-x-0 bottom-[18px] h-[90px] overflow-hidden">
            {Array.from({ length: 7 }).map((_, index) => {
              const mountainIndex =
                (index % mountainPalette.length + mountainPalette.length) % mountainPalette.length;
              const mountain = mountainPalette[mountainIndex]!;
              const left = index * 180 - mountainScroll;

              return (
                <div
                  key={`mountain-${index}`}
                  className="absolute bottom-0"
                  style={{
                    left: `${left}px`,
                    width: '180px',
                    height: `${mountain.height}px`,
                    background: `linear-gradient(180deg, ${mountain.color}, rgba(92, 122, 126, 0.9))`,
                    clipPath: 'polygon(0% 100%, 22% 48%, 42% 100%, 60% 35%, 78% 100%, 100% 100%)',
                    opacity: index % 2 === 0 ? 0.82 : 0.7,
                  }}
                />
              );
            })}
          </div>

          <div className="absolute inset-x-0 bottom-[10px] h-[24px] overflow-hidden">
            <div
              className="absolute inset-x-0 h-[24px] bg-[linear-gradient(180deg,rgba(130,177,108,0.2),rgba(84,125,67,0.15))]"
              style={{ transform: `translateX(-${groundScroll}px)` }}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 h-[26px] overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-700/70 to-transparent opacity-80" />
            <div className="absolute inset-x-0 bottom-0 h-[10px] bg-gradient-to-b from-[#d9f7d7] via-[#d9f7d7] to-[#c2ebbb]" />
            <div
              className="absolute inset-x-0 bottom-0 h-[10px] bg-[repeating-linear-gradient(90deg,#9fda9a_0,#9fda9a_18px,#d9f7d7_18px,#d9f7d7_38px)] opacity-60"
              style={{ transform: `translateX(-${groundScroll}px)` }}
            />
            <div className="absolute inset-x-0 bottom-0 h-[14px] bg-[radial-gradient(circle_at_50%_100%,rgba(56,153,87,0.16),transparent_60%)]" />
          </div>

          {game.phase === 'exploding' && (
            <div
              className="absolute"
              style={{
                left: `${DINO_X + DINO_SIZE / 2}px`,
                bottom: `${Math.max(0, game.dinoY + DINO_SIZE / 2)}px`,
                width: '90px',
                height: '90px',
                pointerEvents: 'none',
                transform: 'translate(-50%, 50%)',
              }}
            >
              {explosionPuffs.map((puff, index) => (
                <div
                  key={`smoke-${index}`}
                  style={{
                    position: 'absolute',
                    left: `${puff.left}px`,
                    top: `${puff.top}px`,
                    width: `${puff.size}px`,
                    height: `${puff.size}px`,
                    borderRadius: '9999px',
                    background: 'radial-gradient(circle, rgba(148, 163, 184, 0.9) 0%, rgba(71, 85, 105, 0.7) 52%, rgba(15, 23, 42, 0.15) 100%)',
                    boxShadow: '0 0 18px rgba(148, 163, 184, 0.4)',
                    opacity: 0.95 - (game.explosionTimer / 380) * 0.9,
                    transform: `scale(${1 + (380 - game.explosionTimer) / 120})`,
                    filter: 'blur(1px)',
                  }}
                />
              ))}
            </div>
          )}

          {showDino && (
            <img
              src={dinoSpriteUrl}
              alt="Dinosaur"
              className="absolute left-[32px] z-10 block h-[52px] w-[62px] object-contain"
              style={{
                bottom: `${game.dinoY}px`,
                transform: `translateY(${dinoHeadBob}px) rotate(${game.phase === 'running' ? dinoLegAngle * 0.25 : 0}deg) scale(1.12)`,
                filter: 'drop-shadow(0 2px 0 rgba(15,64,31,0.25))',
                backgroundColor: 'transparent',
                display: 'block',
              }}
              aria-label="Dino"
            />
          )}

          {game.obstacles.map((obstacle) => {
            const obstacleStyles = {
              'small-cactus': {
                body: 'bg-gradient-to-b from-[#6ee78a] to-[#319466]',
                arm: 'bg-gradient-to-b from-[#56bf73] to-[#2b8b5e]',
              },
              cactus: {
                body: 'bg-gradient-to-b from-[#7ae08d] to-[#2c9d59]',
                arm: 'bg-gradient-to-b from-[#62d57a] to-[#2c9d59]',
              },
              'double-cactus': {
                body: 'bg-gradient-to-b from-[#7fe38f] to-[#2c9d59]',
                arm: 'bg-gradient-to-b from-[#63d684] to-[#2a8e55]',
              },
              rock: {
                body: 'bg-gradient-to-b from-[#c7d3de] to-[#8b9aad]',
                arm: 'bg-gradient-to-b from-[#dfeaf5] to-[#a7b8c9]',
              },
            }[obstacle.kind];

            return (
              <div
                key={obstacle.id}
                className="absolute bottom-0"
                style={{
                  left: `${obstacle.x}px`,
                  width: `${obstacle.width}px`,
                  height: `${obstacle.height}px`,
                }}
              >
                {obstacle.kind === 'rock' ? (
                  <div className="relative h-full w-full rounded-[6px] bg-gradient-to-b from-[#d4e0ed] via-[#a8bacf] to-[#7c8fa3] shadow-[inset_0_-6px_0_rgba(74,88,102,0.3)]">
                    <div className="absolute left-[10%] top-[18%] h-[18%] w-[25%] rounded-full bg-white/20" />
                  </div>
                ) : (
                  <div className="relative h-full w-full">
                    <div className={`absolute bottom-0 left-[20%] h-full w-[28%] rounded-t-md ${obstacleStyles.body}`} />
                    {(obstacle.kind === 'double-cactus' || obstacle.kind === 'cactus') && (
                      <div className={`absolute bottom-[28%] left-[0%] h-[18%] w-[42%] rounded-md ${obstacleStyles.arm}`} />
                    )}
                    {obstacle.kind === 'double-cactus' && (
                      <>
                        <div className={`absolute bottom-0 left-[52%] h-full w-[28%] rounded-t-md ${obstacleStyles.body}`} />
                        <div className={`absolute bottom-[32%] right-[0%] h-[18%] w-[42%] rounded-md ${obstacleStyles.arm}`} />
                      </>
                    )}
                    {obstacle.kind === 'small-cactus' && (
                      <div className={`absolute bottom-[22%] right-[8%] h-[18%] w-[32%] rounded-md ${obstacleStyles.arm}`} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!game.started && !game.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
              <div className="rounded-full bg-white/90 px-5 py-2 text-base font-semibold text-slate-900 shadow-md">
                Tap to start
              </div>
            </div>
          )}

          {showLevelBanner && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/5 backdrop-blur-[0.5px]">
              <div className="level-banner rounded-full border border-white/60 bg-gradient-to-r from-[#ecfeff] via-[#f0fdf4] to-[#fff7ed] px-7 py-3 text-3xl font-black tracking-[0.18em] text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.18)]">
                Level {currentLevel}
              </div>
            </div>
          )}

          {game.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/20 backdrop-blur-[1px] text-center text-white">
              <div className="text-2xl font-black">Game Over</div>
              <div className="text-base text-slate-100">Score: {Math.floor(game.score)}</div>
              <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                Tap to retry
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-600">
        {isReadyToJump ? 'Jump' : 'Running'}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
