import { Container, Text } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import { ITEM_TYPES } from '../../convex/aiTown/itemTypes';

const itemTextStyle = new TextStyle({
  fontSize: 20,
  align: 'center',
});

export function WorldItem({
  item,
  tileDim,
}: {
  item: { id: string; type: string; position: { x: number; y: number } };
  tileDim: number;
}) {
  const itemType = ITEM_TYPES.find((t) => t.id === item.type);
  const emoji = itemType?.emoji ?? '?';

  return (
    <Container
      x={item.position.x * tileDim + tileDim / 2}
      y={item.position.y * tileDim + tileDim / 2}
    >
      <Text text={emoji} anchor={0.5} style={itemTextStyle} />
    </Container>
  );
}
