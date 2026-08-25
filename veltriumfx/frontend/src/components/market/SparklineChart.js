import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function SparklineChart({
  change = 0,
  price = 100,
  width = 64,
  height = 24,
  positiveColor = '#10B981',
  negativeColor = '#EF4444',
}) {
  const isPositive = Number(change) >= 0;
  const strokeColor = isPositive ? positiveColor : negativeColor;
  const gradientId = `spark-${isPositive ? 'up' : 'down'}-${Math.floor(Math.abs(Number(change) * 100) % 997)}`;

  // Generate a deterministic aesthetic curve based on change percentage and seed
  const points = useMemo(() => {
    const numPoints = 8;
    const pts = [];
    const changeFactor = Math.min(Math.max(Number(change) || 0, -5), 5) / 5; // -1 to 1
    const pVal = Number(price) || 100;
    const seed = Math.abs(Math.sin(pVal * 12.9898 + (isPositive ? 1 : -1))) * 100;

    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * (width - 4) + 2;
      const progress = i / (numPoints - 1);
      
      // Trend baseline + wave variation
      const wave = Math.sin((progress * 3.14 * 2) + seed) * (height * 0.18);
      const midY = height / 2;
      
      let y = isPositive 
        ? midY - (progress * (height * 0.28)) + wave - (changeFactor * 2)
        : midY + (progress * (height * 0.28)) + wave + (Math.abs(changeFactor) * 2);

      // Clamp within height bounds
      y = Math.max(3, Math.min(height - 4, y));
      pts.push({ x, y });
    }
    return pts;
  }, [change, price, width, height, isPositive]);

  // Construct SVG path command with smooth bezier curves
  const { linePath, areaPath } = useMemo(() => {
    if (!points.length) return { linePath: '', areaPath: '' };

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const area = `${d} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

    return { linePath: d, areaPath: area };
  }, [points, height]);

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <Path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
