import { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { GameId } from '../aiTown/ids';
import { chatCompletion, fetchEmbedding } from '../util/llm';

/**
 * Extract relationship observations from a conversation and store them as
 * relationship-type memories. Called from rememberConversation after the
 * conversation summary is already available.
 *
 * Cost: 1 LLM call + 1-2 embedding calls.
 */
export async function extractRelationshipMemories(
  ctx: ActionCtx,
  worldId: Id<'worlds'>,
  agentId: GameId<'agents'>,
  playerId: GameId<'players'>,
  otherPlayerId: GameId<'players'>,
  playerName: string,
  otherPlayerName: string,
  conversationSummary: string,
): Promise<number> {
  const { content } = await chatCompletion({
    messages: [
      {
        role: 'user',
        content: `You are ${playerName}. You just had a conversation with ${otherPlayerName}. Here is a summary:
${conversationSummary}

What 1-2 observations did you form about ${otherPlayerName} from this conversation?
Focus on their personality, interests, mood, or things they mentioned.
Also rate your emotional feeling about this interaction.

Return JSON only:
{"observations": [{"text": "observation about the other person", "valence": 0.5}], "overallValence": 0.3}
Where valence is -1.0 (very negative) to 1.0 (very positive).`,
      },
    ],
    max_tokens: 200,
    temperature: 0.3,
  });

  try {
    const result = JSON.parse(content) as {
      observations?: { text: string; valence?: number }[];
      overallValence?: number;
    };

    let count = 0;
    for (const obs of result.observations ?? []) {
      const description = `About ${otherPlayerName}: ${obs.text}`;
      const { embedding } = await fetchEmbedding(description);
      const valence = Math.min(1, Math.max(-1, obs.valence ?? 0));
      // Importance scales with emotional intensity: neutral = 3, strong emotion = 7
      const importance = Math.min(9, Math.max(0, Math.round(Math.abs(valence) * 4 + 3)));

      await ctx.runMutation(internal.agent.memory.insertMemory, {
        agentId,
        playerId,
        description,
        importance,
        lastAccess: Date.now(),
        emotionalValence: valence,
        data: {
          type: 'relationship' as const,
          playerId: otherPlayerId,
        },
        embedding,
      });
      count++;
    }

    return count;
  } catch (e) {
    console.error('Failed to parse relationship extraction:', e, content);
    return 0;
  }
}
