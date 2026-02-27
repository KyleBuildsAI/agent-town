import { v } from 'convex/values';
import { query } from './_generated/server';
import { playerId } from './aiTown/ids';

export const playerGoals = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) return null;
    const agent = world.agents.find((a: any) => a.playerId === args.playerId);
    if (!agent) return null;

    const goals = await ctx.db
      .query('agentGoals')
      .withIndex('agentId', (q) => q.eq('worldId', args.worldId).eq('agentId', agent.id))
      .first();
    if (!goals) return null;

    return {
      longTerm: goals.goals.longTerm,
      shortTerm: goals.goals.shortTerm.filter((g) => g.status === 'active'),
      currentTask: goals.goals.currentTask,
    };
  },
});

export const playerInventory = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) return null;
    const player = world.players.find((p: any) => p.id === args.playerId);
    if (!player) return null;
    return {
      inventory: player.inventory ?? [],
      gold: player.gold ?? 0,
    };
  },
});

export const playerRelationships = query({
  args: {
    worldId: v.id('worlds'),
    playerId,
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query('memories')
      .withIndex('playerId_type', (q) =>
        q.eq('playerId', args.playerId).eq('data.type', 'relationship'),
      )
      .order('desc')
      .take(20);

    // Aggregate by target player
    const byPlayer = new Map<string, { descriptions: string[]; totalValence: number; count: number }>();
    for (const mem of memories) {
      if (mem.data.type !== 'relationship') continue;
      const targetId = mem.data.playerId;
      if (!byPlayer.has(targetId)) {
        byPlayer.set(targetId, { descriptions: [], totalValence: 0, count: 0 });
      }
      const entry = byPlayer.get(targetId)!;
      entry.descriptions.push(mem.description);
      entry.totalValence += mem.emotionalValence ?? 0;
      entry.count++;
    }

    const results = [];
    for (const [targetPlayerId, data] of byPlayer) {
      const desc = await ctx.db
        .query('playerDescriptions')
        .withIndex('worldId', (q) => q.eq('worldId', args.worldId).eq('playerId', targetPlayerId))
        .first();
      results.push({
        playerId: targetPlayerId,
        name: desc?.name ?? 'Unknown',
        sentiment: data.count > 0 ? data.totalValence / data.count : 0,
        recentObservation: data.descriptions[0],
      });
    }

    return results;
  },
});
