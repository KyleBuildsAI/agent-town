import { ObjectType, v } from 'convex/values';
import { GameId, agentId, parseGameId } from './ids';

export class AgentDescription {
  agentId: GameId<'agents'>;
  identity: string;
  plan: string;
  homeZone?: string;
  professionActivities?: string[];
  schedule?: { morning: string; afternoon: string; evening: string };

  constructor(serialized: SerializedAgentDescription) {
    const { agentId, identity, plan } = serialized;
    this.agentId = parseGameId('agents', agentId);
    this.identity = identity;
    this.plan = plan;
    this.homeZone = serialized.homeZone;
    this.professionActivities = serialized.professionActivities;
    this.schedule = serialized.schedule;
  }

  serialize(): SerializedAgentDescription {
    const { agentId, identity, plan, homeZone, professionActivities, schedule } = this;
    return { agentId, identity, plan, homeZone, professionActivities, schedule };
  }
}

export const serializedAgentDescription = {
  agentId,
  identity: v.string(),
  plan: v.string(),
  homeZone: v.optional(v.string()),
  professionActivities: v.optional(v.array(v.string())),
  schedule: v.optional(
    v.object({
      morning: v.string(),
      afternoon: v.string(),
      evening: v.string(),
    }),
  ),
};
export type SerializedAgentDescription = ObjectType<typeof serializedAgentDescription>;
