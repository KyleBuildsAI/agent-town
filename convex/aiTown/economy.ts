import { internalMutation } from '../_generated/server';
import { insertInput } from './insertInput';

export const spawnZoneItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find the default world
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();
    if (!worldStatus || worldStatus.status !== 'running') {
      return;
    }

    // Load world state and map
    const world = await ctx.db.get(worldStatus.worldId);
    if (!world) return;

    const mapDoc = await ctx.db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .first();
    if (!mapDoc) return;

    const zones = mapDoc.zones ?? [];
    const worldItems = world.items ?? [];

    for (const zone of zones) {
      if (!zone.spawnItems || zone.spawnItems.length === 0) continue;

      // Count items currently in this zone
      const itemsInZone = worldItems.filter(
        (item) =>
          item.position.x >= zone.bounds.x &&
          item.position.x < zone.bounds.x + zone.bounds.width &&
          item.position.y >= zone.bounds.y &&
          item.position.y < zone.bounds.y + zone.bounds.height,
      );

      // Spawn items if fewer than 2 exist in the zone
      if (itemsInZone.length < 2) {
        const needed = 2 - itemsInZone.length;
        for (let i = 0; i < needed; i++) {
          const itemType =
            zone.spawnItems[Math.floor(Math.random() * zone.spawnItems.length)];
          const position = {
            x: zone.bounds.x + Math.floor(Math.random() * zone.bounds.width),
            y: zone.bounds.y + Math.floor(Math.random() * zone.bounds.height),
          };
          await insertInput(ctx, worldStatus.worldId, 'spawnItem', {
            itemType,
            position,
          });
        }
      }
    }
  },
});
