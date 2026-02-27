# AgentTown

A living AI-powered village where autonomous agents work, trade, and socialize. Forked from [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town) and extended with named zones, an item/inventory system, agent routines, and a basic economy.

Built with [Convex](https://convex.dev/) (real-time backend + vector search), [PixiJS](https://pixijs.com/) (2D rendering), and your choice of LLM provider.

## Features

- **8 Unique Characters** — each with backstory, personality, goals, and a home zone where they work
- **10 Named Zones** — library, bakery, town hall, garden, town square, smithy, art studio, school, trading post, park
- **Items & Inventory** — 10 item types (books, bread, paintings, seeds, etc.) spawn in zones and can be picked up
- **Basic Economy** — agents earn gold from profession activities and carry inventories; gold/items shown in the sidebar
- **Time-of-Day Routines** — agents follow schedules (morning at work, afternoon exploring, evening socializing)
- **Enhanced Memory** — vector-search memories with importance/recency/relevance scoring, emotional valence, and relationship tracking
- **Goals & Tasks** — agents reflect on memories to form goals and pursue them autonomously
- **Visual Polish** — speech bubbles, floating emotes, name labels, status indicators, zone overlays
- **Multi-LLM Support** — Ollama (default), Anthropic, OpenAI, Together.ai, LiteLLM, or any OpenAI-compatible API
- **Kenney Asset Pack** — clean 32px tileset from [Kenney's Tiny Town](https://kenney.nl/assets/tiny-town)

## Characters

| Character | Sprite | Home Zone | Profession |
|-----------|--------|-----------|------------|
| Alice | f1 | Library | Librarian — organizes books, recommends reading |
| Bob | f2 | Bakery | Baker — kneads dough, bakes bread and pies |
| Carol | f3 | Art Studio | Artist — paints canvases, sketches, critiques art |
| Dave | f4 | Town Hall | Mayor — reviews proposals, manages town affairs |
| Eve | f5 | Garden | Gardener — tends seedlings, harvests herbs |
| Frank | f6 | Smithy | Blacksmith — hammers metal, repairs tools |
| Grace | f7 | School | Teacher — prepares lessons, tutors students |
| Hank | f8 | Trading Post | Merchant — appraises goods, manages inventory |

## Stack

- **Backend & Database:** [Convex](https://convex.dev/) (real-time queries, mutations, cron jobs, vector search)
- **Frontend:** React + [PixiJS](https://pixijs.com/) via `@pixi/react`
- **LLM (default):** [Ollama](https://ollama.com/) with `llama3` + `mxbai-embed-large`
- **Tileset:** [Kenney Tiny Town](https://kenney.nl/assets/tiny-town) (32px tiles)
- **Build:** Vite + TypeScript

## Quick Start

```bash
git clone <your-repo-url>
cd agent-town
npm install
```

### Connect an LLM

**Ollama (default — fully local):**

```bash
ollama pull llama3
ollama pull mxbai-embed-large
ollama serve
```

**Anthropic:**

```bash
npx convex env set LLM_PROVIDER anthropic
npx convex env set ANTHROPIC_API_KEY 'sk-ant-...'
```

**OpenAI:**

```bash
npx convex env set LLM_PROVIDER openai
npx convex env set OPENAI_API_KEY 'sk-...'
```

**Together.ai:**

```bash
npx convex env set TOGETHER_API_KEY 'your-key'
```

See `convex/util/llm.ts` for all provider options and model configuration.

### Run

```bash
npm run dev
```

Visit `http://localhost:5173`. The world initializes automatically with all 8 agents, zone items, and starting gold.

## Architecture

```
data/
  characters.ts      — 8 character definitions (name, identity, goals, zone assignments)
  zones.ts           — 10 zone definitions with bounds, spawn items, character schedules
  gentle.js          — tilemap data (45x32 grid, 32px tiles)

convex/
  aiTown/
    world.ts         — World state (players, agents, conversations, items)
    player.ts        — Player entity (position, inventory, gold, activity)
    agent.ts         — Agent tick loop (decide → act → remember)
    agentOperations.ts — Zone-aware destinations, profession activities, earning
    agentInputs.ts   — Input handlers for agent actions (finishDoSomething, createAgent)
    agentDescription.ts — Agent metadata (identity, homeZone, schedule)
    worldMap.ts      — Map + zone lookup (getZoneAt, getZoneById)
    itemTypes.ts     — 10 item type definitions (emoji, value, description)
    itemInputs.ts    — Item input handlers (pickUp, drop, spawn, buy, earnGold)
    economy.ts       — Cron-driven item spawning in depleted zones
    inputs.ts        — Unified input registry
  agent/
    conversation.ts  — LLM prompts with inventory/gold context
    memory.ts        — Vector-search memory with reflection and goal extraction
  constants.ts       — Activities (24 profession-specific + general)
  crons.ts           — Idle world stopping, music generation, item spawning
  init.ts            — World creation, agent spawning, zone item seeding

src/components/
  PixiGame.tsx       — Main game renderer (map + items + players)
  PixiStaticMap.tsx  — Tilemap rendering + zone overlays
  WorldItem.tsx      — Item emoji rendering on the map
  PlayerDetails.tsx  — Sidebar with inventory, gold, goals, relationships
```

## Commands

```bash
# Start development
npm run dev

# Stop the simulation engine
npx convex run testing:stop

# Resume the simulation
npx convex run testing:resume

# Kick-start if agents are stuck
npx convex run testing:kick

# Archive current world and start fresh
npx convex run testing:archive
npx convex run init

# Wipe all data
npx convex run testing:wipeAllTables
npx convex run init
```

## Zone System

Each zone is a named rectangular region on the 45x32 tile map. Zones define:
- **Type:** `building`, `outdoor`, or `shop`
- **Spawn Items:** item types that periodically appear in the zone
- **Character Assignments:** which agent calls it home and what activities they do there

Zone overlays render as semi-transparent colored rectangles with name labels on the map (blue = building, green = outdoor, yellow = shop).

A cron job runs every 120 seconds to respawn items in depleted zones (max 2 items per zone).

## Economy

- Agents earn **3-7 gold** when performing profession activities at their home zone
- All agents start with **10-20 gold**
- 10 item types with gold values: book (5), bread (3), painting (8), seeds (2), hammer (6), scroll (4), pie (3), compass (7), gem (10), flower (2)
- Inventory and gold are displayed in the sidebar when selecting a character
- Conversation prompts include inventory/gold context so agents can discuss trades

## Memory System

Agents use vector-search memory with multi-factor scoring:
- **Importance:** LLM-rated 1-10 significance
- **Recency:** exponential decay over time
- **Relevance:** cosine similarity to current context
- **Emotional valence:** positive/negative sentiment tracking
- **Relationships:** extracted from conversations, influence future interactions
- **Goals:** periodic reflection generates goals from accumulated memories

## Docker Setup

```bash
docker compose up --build -d
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3210`
- Dashboard: `http://localhost:6791`

Generate an admin key: `docker compose exec backend ./generate_admin_key.sh`

For Ollama inside Docker: `npx convex env set OLLAMA_HOST http://host.docker.internal:11434`

## Deployment

```bash
npx convex deploy
npx convex run init --prod
```

Deploy frontend to Vercel: `vercel --prod`

## Known Limitations

- **No authentication** — all browser users share the same "Me" player identity
- **Item pickup by agents** — agents can't yet autonomously pick up world items (world items aren't passed to agent action args)
- **Economy cron stale reads** — the item spawn cron reads world state that may not reflect queued-but-unprocessed inputs
- **hnswlib-node** — native dependency may require build tools (`python3`, `make`, `g++`) during `npm install`

## Credits

- Original project: [a16z-infra/ai-town](https://github.com/a16z-infra/ai-town)
- Research paper: [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/pdf/2304.03442.pdf)
- Tileset: [Kenney Tiny Town](https://kenney.nl/assets/tiny-town)
- Game rendering: [PixiJS](https://pixijs.com/)
- Backend: [Convex](https://convex.dev/)

## License

MIT
