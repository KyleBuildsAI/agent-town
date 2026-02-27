import { v } from 'convex/values';
import { ActionCtx, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { GameId, agentId, playerId } from '../aiTown/ids';
import { chatCompletion } from '../util/llm';

const selfInternal = internal.agent.goals;

// --- Queries ---

export const loadGoals = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentGoals')
      .withIndex('agentId', (q) => q.eq('worldId', args.worldId).eq('agentId', args.agentId))
      .first();
  },
});

export const loadAgentDescription = internalQuery({
  args: {
    worldId: v.id('worlds'),
    agentId,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('agentId', args.agentId))
      .first();
  },
});

// --- Mutations ---

export const initializeGoals = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId,
    playerId,
    longTermGoals: v.array(
      v.object({
        description: v.string(),
        source: v.union(v.literal('character'), v.literal('reflection')),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentGoals')
      .withIndex('agentId', (q) => q.eq('worldId', args.worldId).eq('agentId', args.agentId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert('agentGoals', {
      agentId: args.agentId,
      playerId: args.playerId,
      worldId: args.worldId,
      goals: {
        longTerm: args.longTermGoals,
        shortTerm: [],
        currentTask: undefined,
      },
      lastUpdated: Date.now(),
    });
  },
});

export const updateGoals = internalMutation({
  args: {
    worldId: v.id('worlds'),
    agentId,
    goals: v.object({
      longTerm: v.array(
        v.object({
          description: v.string(),
          source: v.union(v.literal('character'), v.literal('reflection')),
        }),
      ),
      shortTerm: v.array(
        v.object({
          description: v.string(),
          status: v.union(v.literal('active'), v.literal('completed'), v.literal('abandoned')),
          createdAt: v.number(),
          origin: v.optional(v.string()),
        }),
      ),
      currentTask: v.optional(
        v.object({
          description: v.string(),
          relatedGoalIndex: v.optional(v.number()),
          startedAt: v.number(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentGoals')
      .withIndex('agentId', (q) => q.eq('worldId', args.worldId).eq('agentId', args.agentId))
      .first();
    if (!existing) {
      throw new Error(`No goals found for agent ${args.agentId}`);
    }
    await ctx.db.patch(existing._id, {
      goals: args.goals,
      lastUpdated: Date.now(),
    });
  },
});

// --- Action helper (LLM call) ---

export async function reflectOnGoals(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentIdVal: GameId<'agents'>,
  playerName: string,
  conversationSummary: string,
  currentGoals: {
    longTerm: { description: string; source: string }[];
    shortTerm: { description: string; status: string; createdAt: number; origin?: string }[];
    currentTask?: { description: string; relatedGoalIndex?: number; startedAt: number };
  },
): Promise<{
  shortTerm: { description: string; status: 'active' | 'completed' | 'abandoned'; createdAt: number; origin?: string }[];
  currentTask?: { description: string; relatedGoalIndex?: number; startedAt: number };
}> {
  const longTermStr = currentGoals.longTerm
    .map((g, i) => `  ${i}. ${g.description}`)
    .join('\n');
  const activeGoals = currentGoals.shortTerm.filter((g) => g.status === 'active');
  const shortTermStr =
    activeGoals.map((g, i) => `  ${i}. ${g.description}`).join('\n') || '  (none)';

  const { content } = await chatCompletion({
    messages: [
      {
        role: 'user',
        content: `You are ${playerName}. Here is a summary of a conversation you just had:
${conversationSummary}

Your long-term goals:
${longTermStr}

Your current short-term goals:
${shortTermStr}

Based on this conversation:
1. Should any active short-term goals be marked "completed" or "abandoned"?
2. Are there new short-term goals suggested by this conversation?
3. What should your immediate next task be?

Return JSON only. Format:
{"completedGoalIndexes": [], "abandonedGoalIndexes": [], "newGoals": ["goal description"], "currentTask": "task description or null"}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  try {
    const updates = JSON.parse(content) as {
      completedGoalIndexes?: number[];
      abandonedGoalIndexes?: number[];
      newGoals?: string[];
      currentTask?: string | null;
    };
    const now = Date.now();

    // Apply status updates to existing short-term goals
    const updatedShortTerm = currentGoals.shortTerm.map((g, i) => {
      const activeIndex = activeGoals.indexOf(g);
      if (activeIndex >= 0 && updates.completedGoalIndexes?.includes(activeIndex)) {
        return { ...g, status: 'completed' as const };
      }
      if (activeIndex >= 0 && updates.abandonedGoalIndexes?.includes(activeIndex)) {
        return { ...g, status: 'abandoned' as const };
      }
      return g;
    });

    // Add new goals
    for (const desc of updates.newGoals ?? []) {
      updatedShortTerm.push({
        description: desc,
        status: 'active' as const,
        createdAt: now,
        origin: conversationSummary.slice(0, 100),
      });
    }

    // Cap: keep 5 active + 10 most recent inactive
    const active = updatedShortTerm.filter((g) => g.status === 'active').slice(-5);
    const inactive = updatedShortTerm.filter((g) => g.status !== 'active').slice(-10);

    return {
      shortTerm: [...active, ...inactive],
      currentTask:
        updates.currentTask
          ? { description: updates.currentTask, startedAt: now }
          : undefined,
    };
  } catch (e) {
    console.error('Failed to parse goal update:', e, content);
    return {
      shortTerm: currentGoals.shortTerm,
      currentTask: currentGoals.currentTask,
    };
  }
}
