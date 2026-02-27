import { v } from 'convex/values';
import { parseGameId, playerId } from './ids';
import { inputHandler } from './inputHandler';
import { point } from '../util/types';
import { distance } from '../util/geometry';

export const itemInputs = {
  pickUpItem: inputHandler({
    args: {
      playerId,
      itemId: v.string(),
    },
    handler: (game, now, args) => {
      const pId = parseGameId('players', args.playerId);
      const player = game.world.players.get(pId);
      if (!player) {
        throw new Error(`Invalid player ID ${pId}`);
      }
      const itemIdx = game.world.items.findIndex((i) => i.id === args.itemId);
      if (itemIdx === -1) {
        throw new Error(`Item ${args.itemId} not found in world`);
      }
      const item = game.world.items[itemIdx];
      if (distance(player.position, item.position) > 1.5) {
        throw new Error(`Player too far from item`);
      }
      // Move item from world to player inventory
      game.world.items.splice(itemIdx, 1);
      player.inventory.push(item.type);
      return null;
    },
  }),

  dropItem: inputHandler({
    args: {
      playerId,
      itemType: v.string(),
    },
    handler: (game, now, args) => {
      const pId = parseGameId('players', args.playerId);
      const player = game.world.players.get(pId);
      if (!player) {
        throw new Error(`Invalid player ID ${pId}`);
      }
      const itemIdx = player.inventory.indexOf(args.itemType);
      if (itemIdx === -1) {
        throw new Error(`Player doesn't have item: ${args.itemType}`);
      }
      player.inventory.splice(itemIdx, 1);
      const itemId = game.allocId('items');
      game.world.items.push({
        id: itemId,
        type: args.itemType,
        position: { x: Math.floor(player.position.x), y: Math.floor(player.position.y) },
      });
      return null;
    },
  }),

  spawnItem: inputHandler({
    args: {
      itemType: v.string(),
      position: point,
    },
    handler: (game, now, args) => {
      const itemId = game.allocId('items');
      game.world.items.push({
        id: itemId,
        type: args.itemType,
        position: args.position,
      });
      return null;
    },
  }),

  buyItem: inputHandler({
    args: {
      buyerId: playerId,
      sellerId: playerId,
      itemType: v.string(),
      price: v.number(),
    },
    handler: (game, now, args) => {
      const buyer = game.world.players.get(parseGameId('players', args.buyerId));
      const seller = game.world.players.get(parseGameId('players', args.sellerId));
      if (!buyer || !seller) {
        throw new Error(`Invalid buyer or seller`);
      }
      if (buyer.gold < args.price) {
        throw new Error(`Buyer doesn't have enough gold`);
      }
      const itemIdx = seller.inventory.indexOf(args.itemType);
      if (itemIdx === -1) {
        throw new Error(`Seller doesn't have item: ${args.itemType}`);
      }
      seller.inventory.splice(itemIdx, 1);
      buyer.inventory.push(args.itemType);
      buyer.gold -= args.price;
      seller.gold += args.price;
      return null;
    },
  }),

  earnGold: inputHandler({
    args: {
      playerId,
      amount: v.number(),
    },
    handler: (game, now, args) => {
      const pId = parseGameId('players', args.playerId);
      const player = game.world.players.get(pId);
      if (!player) {
        throw new Error(`Invalid player ID ${pId}`);
      }
      player.gold += args.amount;
      return null;
    },
  }),
};
