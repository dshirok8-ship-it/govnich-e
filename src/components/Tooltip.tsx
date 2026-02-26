import React from 'react';

type Props = {
  visible: boolean;
  x: number;
  y: number;
  children: React.ReactNode;
};

export default function Tooltip({ visible, x, y, children }: Props) {
  if (!visible) return null;
  return (
    <div className="tooltip" style={{ left: x + 12, top: y + 12 }}>
      {children}
    </div>
  );
}
