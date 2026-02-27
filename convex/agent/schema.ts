import { v } from 'convex/values';
import { playerId, conversationId, agentId } from '../aiTown/ids';
import { defineTable } from 'convex/server';
import { EMBEDDING_DIMENSION } from '../util/llm';

export const memoryFields = {
  playerId,
  description: v.string(),
  embeddingId: v.id('memoryEmbeddings'),
  importance: v.number(),
  lastAccess: v.number(),
  // Emotional valence: -1.0 (very negative) to 1.0 (very positive), 0 = neutral
  emotionalValence: v.optional(v.number()),
  data: v.union(
    // Setting up dynamics between players
    v.object({
      type: v.literal('relationship'),
      // The player this memory is about, from the perspective of the player
      // whose memory this is.
      playerId,
    }),
    v.object({
      type: v.literal('conversation'),
      conversationId,
      // The other player(s) in the conversation.
      playerIds: v.array(playerId),
    }),
    v.object({
      type: v.literal('reflection'),
      relatedMemoryIds: v.array(v.id('memories')),
    }),
  ),
};

export const goalFields = {
  agentId,
  playerId,
  worldId: v.id('worlds'),
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
  lastUpdated: v.number(),
};

export const memoryTables = {
  memories: defineTable(memoryFields)
    .index('embeddingId', ['embeddingId'])
    .index('playerId_type', ['playerId', 'data.type'])
    .index('playerId', ['playerId']),
  memoryEmbeddings: defineTable({
    playerId,
    embedding: v.array(v.float64()),
  }).vectorIndex('embedding', {
    vectorField: 'embedding',
    filterFields: ['playerId'],
    dimensions: EMBEDDING_DIMENSION,
  }),
};

export const agentTables = {
  ...memoryTables,
  embeddingsCache: defineTable({
    textHash: v.bytes(),
    embedding: v.array(v.float64()),
  }).index('text', ['textHash']),
  agentGoals: defineTable(goalFields)
    .index('agentId', ['worldId', 'agentId'])
    .index('playerId', ['worldId', 'playerId']),
};
