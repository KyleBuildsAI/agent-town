export type ZoneType = 'building' | 'outdoor' | 'shop';

export interface Zone {
  id: string;
  name: string;
  description: string;
  type: ZoneType;
  bounds: { x: number; y: number; width: number; height: number };
  spawnItems?: string[];
}

// 10 zone definitions placed across the 45x32 tile grid in walkable areas.
export const ZONES: Zone[] = [
  {
    id: 'library',
    name: 'Library',
    description: 'A quiet building filled with books and knowledge',
    type: 'building',
    bounds: { x: 3, y: 3, width: 5, height: 4 },
    spawnItems: ['book', 'scroll'],
  },
  {
    id: 'bakery',
    name: 'Bakery',
    description: 'A warm shop with the smell of fresh bread',
    type: 'shop',
    bounds: { x: 12, y: 3, width: 5, height: 4 },
    spawnItems: ['bread', 'pie'],
  },
  {
    id: 'town_hall',
    name: 'Town Hall',
    description: 'The administrative center of the town',
    type: 'building',
    bounds: { x: 19, y: 3, width: 6, height: 4 },
    spawnItems: ['scroll'],
  },
  {
    id: 'garden',
    name: 'Garden',
    description: 'A lush garden with flowers and vegetables',
    type: 'outdoor',
    bounds: { x: 35, y: 4, width: 6, height: 5 },
    spawnItems: ['seeds', 'flower'],
  },
  {
    id: 'town_square',
    name: 'Town Square',
    description: 'The central gathering place of the town',
    type: 'outdoor',
    bounds: { x: 19, y: 12, width: 7, height: 6 },
    spawnItems: ['flower'],
  },
  {
    id: 'smithy',
    name: 'Smithy',
    description: 'A hot forge where metal is shaped',
    type: 'building',
    bounds: { x: 3, y: 15, width: 5, height: 4 },
    spawnItems: ['hammer'],
  },
  {
    id: 'art_studio',
    name: 'Art Studio',
    description: 'A creative space filled with paintings and supplies',
    type: 'building',
    bounds: { x: 12, y: 14, width: 5, height: 4 },
    spawnItems: ['painting'],
  },
  {
    id: 'school',
    name: 'School',
    description: 'A place of learning and history',
    type: 'building',
    bounds: { x: 30, y: 14, width: 5, height: 4 },
    spawnItems: ['book', 'scroll'],
  },
  {
    id: 'trading_post',
    name: 'Trading Post',
    description: 'A bustling shop with goods from distant lands',
    type: 'shop',
    bounds: { x: 35, y: 14, width: 6, height: 4 },
    spawnItems: ['compass', 'gem'],
  },
  {
    id: 'park',
    name: 'Park',
    description: 'A peaceful green space for relaxation',
    type: 'outdoor',
    bounds: { x: 19, y: 22, width: 7, height: 5 },
    spawnItems: ['flower'],
  },
];

export interface CharacterZoneInfo {
  homeZone: string;
  professionActivities: string[];
  schedule: {
    morning: string;
    afternoon: string;
    evening: string;
  };
}

export const CHARACTER_ZONES: Record<string, CharacterZoneInfo> = {
  Alice: {
    homeZone: 'library',
    professionActivities: ['organizing books', 'reading ancient texts', 'cataloging new arrivals'],
    schedule: { morning: 'library', afternoon: 'library', evening: 'park' },
  },
  Bob: {
    homeZone: 'bakery',
    professionActivities: ['kneading dough', 'decorating pastries', 'checking the ovens'],
    schedule: { morning: 'bakery', afternoon: 'bakery', evening: 'town_square' },
  },
  Carol: {
    homeZone: 'art_studio',
    professionActivities: ['painting a canvas', 'mixing colors', 'sketching townspeople'],
    schedule: { morning: 'art_studio', afternoon: 'garden', evening: 'art_studio' },
  },
  Dave: {
    homeZone: 'town_hall',
    professionActivities: ['reviewing town proposals', 'writing official notices', 'planning the festival'],
    schedule: { morning: 'town_hall', afternoon: 'town_square', evening: 'town_hall' },
  },
  Eve: {
    homeZone: 'garden',
    professionActivities: ['tending seedlings', 'pruning roses', 'watering the vegetables'],
    schedule: { morning: 'garden', afternoon: 'garden', evening: 'park' },
  },
  Frank: {
    homeZone: 'smithy',
    professionActivities: ['hammering hot metal', 'sharpening tools', 'stoking the forge'],
    schedule: { morning: 'smithy', afternoon: 'smithy', evening: 'town_square' },
  },
  Grace: {
    homeZone: 'school',
    professionActivities: ['preparing lessons', 'grading papers', 'telling town stories'],
    schedule: { morning: 'school', afternoon: 'school', evening: 'park' },
  },
  Hank: {
    homeZone: 'trading_post',
    professionActivities: ['appraising goods', 'negotiating trades', 'unpacking new inventory'],
    schedule: { morning: 'trading_post', afternoon: 'town_square', evening: 'trading_post' },
  },
};
