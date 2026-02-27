import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { WorldMap, serializedWorldMap } from './worldMap';
import { rememberConversation } from '../agent/memory';
import { GameId, agentId, conversationId, playerId } from './ids';
import {
  continueConversationMessage,
  leaveConversationMessage,
  startConversationMessage,
} from '../agent/conversation';
import { assertNever } from '../util/assertNever';
import { serializedAgent } from './agent';
import { ACTIVITIES, ACTIVITY_COOLDOWN, CONVERSATION_COOLDOWN } from '../constants';
import { api, internal } from '../_generated/api';
import { sleep } from '../util/sleep';
import { serializedPlayer } from './player';

export const agentRememberConversation = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    await rememberConversation(
      ctx,
      args.worldId,
      args.agentId as GameId<'agents'>,
      args.playerId as GameId<'players'>,
      args.conversationId as GameId<'conversations'>,
    );
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'finishRememberConversation',
      args: {
        agentId: args.agentId,
        operationId: args.operationId,
      },
    });
  },
});

export const agentGenerateMessage = internalAction({
  args: {
    worldId: v.id('worlds'),
    playerId,
    agentId,
    conversationId,
    otherPlayerId: playerId,
    operationId: v.string(),
    type: v.union(v.literal('start'), v.literal('continue'), v.literal('leave')),
    messageUuid: v.string(),
  },
  handler: async (ctx, args) => {
    let completionFn;
    switch (args.type) {
      case 'start':
        completionFn = startConversationMessage;
        break;
      case 'continue':
        completionFn = continueConversationMessage;
        break;
      case 'leave':
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }
    const text = await completionFn(
      ctx,
      args.worldId,
      args.conversationId as GameId<'conversations'>,
      args.playerId as GameId<'players'>,
      args.otherPlayerId as GameId<'players'>,
    );

    await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
      worldId: args.worldId,
      conversationId: args.conversationId,
      agentId: args.agentId,
      playerId: args.playerId,
      text,
      messageUuid: args.messageUuid,
      leaveConversation: args.type === 'leave',
      operationId: args.operationId,
    });
  },
});

export const agentDoSomething = internalAction({
  args: {
    worldId: v.id('worlds'),
    player: v.object(serializedPlayer),
    agent: v.object(serializedAgent),
    map: v.object(serializedWorldMap),
    otherFreePlayers: v.array(v.object(serializedPlayer)),
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { player, agent } = args;
    const map = new WorldMap(args.map);
    const now = Date.now();

    // Lazy goal initialization: create goals from agent description if they don't exist yet
    let agentGoals = await ctx.runQuery(internal.agent.goals.loadGoals, {
      worldId: args.worldId,
      agentId: agent.id,
    });
    if (!agentGoals) {
      const agentDesc = await ctx.runQuery(internal.agent.goals.loadAgentDescription, {
        worldId: args.worldId,
        agentId: agent.id,
      });
      if (agentDesc) {
        await ctx.runMutation(internal.agent.goals.initializeGoals, {
          worldId: args.worldId,
          agentId: agent.id,
          playerId: player.id,
          longTermGoals: [{ description: agentDesc.plan, source: 'character' as const }],
        });
        agentGoals = await ctx.runQuery(internal.agent.goals.loadGoals, {
          worldId: args.worldId,
          agentId: agent.id,
        });
      }
    }

    // Load agent description for zone/schedule data
    const agentDesc = await ctx.runQuery(internal.agent.goals.loadAgentDescription, {
      worldId: args.worldId,
      agentId: agent.id,
    });

    // Don't try to start a new conversation if we were just in one.
    const justLeftConversation =
      agent.lastConversation && now < agent.lastConversation + CONVERSATION_COOLDOWN;
    // Don't try again if we recently tried to find someone to invite.
    const recentlyAttemptedInvite =
      agent.lastInviteAttempt && now < agent.lastInviteAttempt + CONVERSATION_COOLDOWN;
    const recentActivity = player.activity && now < player.activity.until + ACTIVITY_COOLDOWN;

    // Get current time of day and zone info
    const timeOfDay = getTimeOfDay(now);
    const currentZone = map.getZoneAt(Math.floor(player.position.x), Math.floor(player.position.y));
    const isAtHomeZone = agentDesc?.homeZone && currentZone?.id === agentDesc.homeZone;

    // Decide whether to do an activity or move somewhere.
    if (!player.pathfinding) {
      if (recentActivity || justLeftConversation) {
        // Choose a zone-aware destination instead of random wandering
        const destination = chooseDestination(map, agentDesc, timeOfDay);
        await sleep(Math.random() * 1000);
        await ctx.runMutation(api.aiTown.main.sendInput, {
          worldId: args.worldId,
          name: 'finishDoSomething',
          args: {
            operationId: args.operationId,
            agentId: agent.id,
            destination,
          },
        });
        return;
      } else {
        // Select activity based on zone and profession
        const activity = selectActivityForAgent(agentGoals, agentDesc, currentZone);

        // Check if there's a nearby item matching profession to pick up
        let pickUpItemId: string | undefined;
        if (isAtHomeZone && map.zones.length > 0) {
          const nearbyItem = findNearbyProfessionItem(player, agentDesc, args);
          if (nearbyItem) {
            pickUpItemId = nearbyItem;
          }
        }

        // Earn gold when doing profession activity at home zone
        const earnAmount = isAtHomeZone ? 3 + Math.floor(Math.random() * 5) : undefined;

        await sleep(Math.random() * 1000);
        await ctx.runMutation(api.aiTown.main.sendInput, {
          worldId: args.worldId,
          name: 'finishDoSomething',
          args: {
            operationId: args.operationId,
            agentId: agent.id,
            activity: {
              description: activity.description,
              emoji: activity.emoji,
              until: Date.now() + activity.duration,
            },
            earnAmount,
            pickUpItemId,
          },
        });
        return;
      }
    }
    const invitee =
      justLeftConversation || recentlyAttemptedInvite
        ? undefined
        : await ctx.runQuery(internal.aiTown.agent.findConversationCandidate, {
            now,
            worldId: args.worldId,
            player: args.player,
            otherFreePlayers: args.otherFreePlayers,
            agentId: agent.id,
          });

    // TODO: We hit a lot of OCC errors on sending inputs in this file. It's
    // easy for them to get scheduled at the same time and line up in time.
    await sleep(Math.random() * 1000);
    await ctx.runMutation(api.aiTown.main.sendInput, {
      worldId: args.worldId,
      name: 'finishDoSomething',
      args: {
        operationId: args.operationId,
        agentId: args.agent.id,
        invitee,
      },
    });
  },
});

function getTimeOfDay(now: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date(now).getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function chooseDestination(
  map: WorldMap,
  agentDesc: { homeZone?: string; schedule?: { morning: string; afternoon: string; evening: string } } | null,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
): { x: number; y: number } {
  if (!agentDesc?.schedule || !agentDesc?.homeZone || map.zones.length === 0) {
    return wanderDestination(map);
  }

  let targetZoneId: string | undefined;

  if (timeOfDay === 'night') {
    // Night: wander randomly
    return wanderDestination(map);
  } else if (timeOfDay === 'morning') {
    targetZoneId = agentDesc.schedule.morning;
  } else if (timeOfDay === 'afternoon') {
    // 60% stay at scheduled zone, 40% visit random zone
    if (Math.random() < 0.6) {
      targetZoneId = agentDesc.schedule.afternoon;
    } else {
      const randomZone = map.zones[Math.floor(Math.random() * map.zones.length)];
      targetZoneId = randomZone.id;
    }
  } else {
    // Evening: go to social zones
    targetZoneId = agentDesc.schedule.evening;
  }

  const zone = map.zones.find((z) => z.id === targetZoneId);
  if (!zone) {
    return wanderDestination(map);
  }

  // Pick a random point within the zone bounds
  return {
    x: zone.bounds.x + Math.floor(Math.random() * zone.bounds.width),
    y: zone.bounds.y + Math.floor(Math.random() * zone.bounds.height),
  };
}

function selectActivityForAgent(
  agentGoals: { goals: { currentTask?: { description: string } } } | null,
  agentDesc: { homeZone?: string; professionActivities?: string[] } | null,
  currentZone: { id: string } | undefined,
) {
  // At home zone: use profession-specific activities
  if (
    currentZone &&
    agentDesc?.homeZone === currentZone.id &&
    agentDesc?.professionActivities?.length
  ) {
    const profActivity =
      agentDesc.professionActivities[
        Math.floor(Math.random() * agentDesc.professionActivities.length)
      ];
    const match = ACTIVITIES.find((a) => a.description === profActivity);
    if (match) return match;
  }

  // At other zones: zone-appropriate activities
  if (currentZone) {
    const zoneActivities = getZoneActivities(currentZone.id);
    if (zoneActivities.length > 0) {
      return zoneActivities[Math.floor(Math.random() * zoneActivities.length)];
    }
  }

  // Fallback: goal-based selection
  return selectActivityForGoals(agentGoals);
}

function getZoneActivities(zoneId: string) {
  const mapping: Record<string, string[]> = {
    library: ['reading a book', 'reading ancient texts'],
    bakery: ['cooking', 'kneading dough'],
    garden: ['gardening', 'tending seedlings'],
    park: ['meditating', 'daydreaming'],
    town_square: ['daydreaming', 'writing in a journal'],
    smithy: ['working on a project', 'hammering hot metal'],
    art_studio: ['sketching', 'painting a canvas'],
    school: ['reading a book', 'preparing lessons'],
    trading_post: ['appraising goods', 'working on a project'],
    town_hall: ['writing in a journal', 'reviewing town proposals'],
  };
  const descs = mapping[zoneId] ?? [];
  return ACTIVITIES.filter((a) => descs.includes(a.description));
}

function selectActivityForGoals(
  agentGoals: { goals: { currentTask?: { description: string } } } | null,
) {
  if (agentGoals?.goals.currentTask) {
    const lower = agentGoals.goals.currentTask.description.toLowerCase();
    if (lower.includes('read') || lower.includes('learn') || lower.includes('study') || lower.includes('book')) {
      return ACTIVITIES.find((a) => a.description === 'reading a book')!;
    }
    if (lower.includes('think') || lower.includes('plan') || lower.includes('reflect') || lower.includes('decide')) {
      return ACTIVITIES.find((a) => a.description === 'daydreaming')!;
    }
    if (lower.includes('garden') || lower.includes('grow') || lower.includes('plant') || lower.includes('nature')) {
      return ACTIVITIES.find((a) => a.description === 'gardening')!;
    }
    if (lower.includes('write') || lower.includes('journal') || lower.includes('note') || lower.includes('record')) {
      return ACTIVITIES.find((a) => a.description === 'writing in a journal')!;
    }
    if (lower.includes('build') || lower.includes('craft') || lower.includes('make') || lower.includes('fix') || lower.includes('work')) {
      return ACTIVITIES.find((a) => a.description === 'working on a project')!;
    }
    if (lower.includes('cook') || lower.includes('bake') || lower.includes('food') || lower.includes('recipe')) {
      return ACTIVITIES.find((a) => a.description === 'cooking')!;
    }
    if (lower.includes('meditat') || lower.includes('calm') || lower.includes('peace') || lower.includes('relax')) {
      return ACTIVITIES.find((a) => a.description === 'meditating')!;
    }
    if (lower.includes('draw') || lower.includes('sketch') || lower.includes('paint') || lower.includes('art') || lower.includes('creat')) {
      return ACTIVITIES.find((a) => a.description === 'sketching')!;
    }
  }
  return ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
}

function findNearbyProfessionItem(
  player: { position: { x: number; y: number }; inventory?: string[] },
  agentDesc: { homeZone?: string } | null,
  args: { map: any },
): string | undefined {
  // The world items are not directly available in the action args,
  // but they are part of the serialized world. We check items passed
  // via the map's zone spawnItems to see if there's a relevant item nearby.
  // Since world items aren't passed to the action, we skip this for now
  // and let the cron handle spawning. Items get picked up via the
  // pickUpItem input from the frontend or future agent logic.
  return undefined;
}

function wanderDestination(worldMap: WorldMap) {
  // Wander someonewhere at least one tile away from the edge.
  return {
    x: 1 + Math.floor(Math.random() * (worldMap.width - 2)),
    y: 1 + Math.floor(Math.random() * (worldMap.height - 2)),
  };
}
