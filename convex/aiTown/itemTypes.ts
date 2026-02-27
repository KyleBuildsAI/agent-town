export interface ItemType {
  id: string;
  name: string;
  type: 'consumable' | 'tool' | 'material' | 'treasure';
  emoji: string;
  description: string;
  value: number;
}

export const ITEM_TYPES: ItemType[] = [
  { id: 'book', name: 'Book', type: 'material', emoji: '\uD83D\uDCD6', description: 'A well-worn tome of knowledge', value: 5 },
  { id: 'bread', name: 'Bread', type: 'consumable', emoji: '\uD83C\uDF5E', description: 'A fresh loaf of sourdough bread', value: 3 },
  { id: 'painting', name: 'Painting', type: 'treasure', emoji: '\uD83C\uDFA8', description: 'A colorful painting of the town', value: 15 },
  { id: 'seeds', name: 'Seeds', type: 'material', emoji: '\uD83C\uDF31', description: 'A packet of flower seeds', value: 2 },
  { id: 'hammer', name: 'Hammer', type: 'tool', emoji: '\uD83D\uDD28', description: 'A sturdy blacksmith hammer', value: 8 },
  { id: 'scroll', name: 'Scroll', type: 'material', emoji: '\uD83D\uDCDC', description: 'An official town scroll', value: 4 },
  { id: 'pie', name: 'Pie', type: 'consumable', emoji: '\uD83E\uDD67', description: 'A delicious homemade pie', value: 6 },
  { id: 'compass', name: 'Compass', type: 'tool', emoji: '\uD83E\uDDED', description: 'A brass compass from distant lands', value: 10 },
  { id: 'gem', name: 'Gem', type: 'treasure', emoji: '\uD83D\uDC8E', description: 'A sparkling gemstone', value: 20 },
  { id: 'flower', name: 'Flower', type: 'material', emoji: '\uD83C\uDF3B', description: 'A beautiful sunflower', value: 1 },
];

export function getItemType(id: string): ItemType | undefined {
  return ITEM_TYPES.find((item) => item.id === id);
}
