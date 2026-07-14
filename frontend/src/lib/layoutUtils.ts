import { Node, Edge } from "@xyflow/react";

export const getGridLayoutedElements = <T extends Record<string, any>>(
  nodes: Node<T>[],
  edges: Edge[]
): Node<T>[] => {
  const GRID_COL_SPACING = 320;
  const GRID_ROW_SPACING = 220;
  const PADDING = 80;

  if (nodes.length === 0) return nodes;

  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);

  // Assign grid positions with layout priority for connected nodes
  const visited = new Set<string>();
  const positions = new Map<string, { col: number; row: number }>();
  let currentRow = 0;
  let currentCol = 0;

  // Start with start node if present
  const startNode = nodes.find((n) => (n.data as any).type === "start");
  if (startNode) {
    positions.set(startNode.id, { col: 0, row: 0 });
    visited.add(startNode.id);
    currentCol = 1;
  }

  // Position remaining nodes
  nodes.forEach((node) => {
    if (visited.has(node.id)) return;

    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }

    positions.set(node.id, { col: currentCol, row: currentRow });
    visited.add(node.id);
    currentCol++;
  });

  // Convert grid positions to pixel coordinates
  const layoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) {
      return node;
    }

    return {
      ...node,
      position: {
        x: PADDING + pos.col * GRID_COL_SPACING,
        y: PADDING + pos.row * GRID_ROW_SPACING,
      },
    };
  });

  return layoutedNodes as Node<T>[];
};
