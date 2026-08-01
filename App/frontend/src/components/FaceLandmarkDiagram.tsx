/**
 * FaceLandmarkDiagram — Overlay landmark dots on the user's actual photo
 * using MediaPipe 478-pt landmark groups directly (no dlib 68-pt mapping).
 *
 * Tags are positioned OUTSIDE the image, connected via leader lines
 * to the relevant landmark points on the face.
 */

import { useMemo, useRef, useState, useEffect } from "react";

/* ─── Types ─── */
interface LandmarkPoint {
  x: number;
  y: number;
}

interface LandmarkGroups {
  jawline: LandmarkPoint[];
  forehead_contour: LandmarkPoint[];
  right_brow: LandmarkPoint[];
  left_brow: LandmarkPoint[];
  right_eye: LandmarkPoint[];
  left_eye: LandmarkPoint[];
  nose_bridge: LandmarkPoint[];
  nose_base: LandmarkPoint[];
  outer_lip: LandmarkPoint[];
  inner_lip: LandmarkPoint[];
}

interface Metrics {
  face_ratio: number;
  jaw_ratio: number;
  jaw_angle: number;
  eye_aspect_ratio: number;
  eye_tilt_angle: number;
  eye_spacing_ratio: number;
  lid_visibility: number;
  nose_bridge_height: number;
  alar_width_ratio: number;
  lip_width_ratio: number;
  lip_height_ratio: number;
  cupid_bow_ratio: number;
  forehead_ratio: number;
  chin_ratio: number;
}

interface Props {
  userImage?: string;
  landmarkGroups?: LandmarkGroups;
  foreheadContour?: LandmarkPoint[];
  metrics: Metrics;
  faceShape: string;
  eyeTags: string[];
  facialTags: string[];
  themeColor?: string;
}

/* ─── Color palette for feature groups ─── */
const COLORS = {
  face: "#9B7DD4",
  eyes: "#4CAF7D",
  nose: "#E8943A",
  lips: "#E06B8A",
};

/* ─── Demo landmark groups (schematic face, normalized 0-1) ─── */
function generateDemoLandmarkGroups(): LandmarkGroups {
  const cx = 0.5, cy = 0.48, rx = 0.22, ry = 0.36;

  // Jawline arc
  const jawline: LandmarkPoint[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const angle = Math.PI * 0.15 + t * Math.PI * 0.7;
    jawline.push({ x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) * 0.95 });
  }

  // Forehead contour arc
  const forehead_contour: LandmarkPoint[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const angle = Math.PI * 0.85 + t * Math.PI * 0.3;
    forehead_contour.push({
      x: 0.5 - 0.24 * Math.cos(angle),
      y: 0.48 - 0.38 * Math.sin(angle) * 0.7,
    });
  }

  // Brows
  const right_brow: LandmarkPoint[] = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    right_brow.push({ x: 0.30 + t * 0.12, y: 0.30 - Math.sin(t * Math.PI) * 0.02 });
  }
  const left_brow: LandmarkPoint[] = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    left_brow.push({ x: 0.58 + t * 0.12, y: 0.30 - Math.sin(t * Math.PI) * 0.02 });
  }

  // Eyes (16-point outlines)
  const right_eye: LandmarkPoint[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    right_eye.push({ x: 0.37 + 0.035 * Math.cos(angle), y: 0.38 + 0.015 * Math.sin(angle) });
  }
  const left_eye: LandmarkPoint[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    left_eye.push({ x: 0.63 + 0.035 * Math.cos(angle), y: 0.38 + 0.015 * Math.sin(angle) });
  }

  // Nose
  const nose_bridge: LandmarkPoint[] = [
    { x: 0.50, y: 0.35 }, { x: 0.50, y: 0.40 }, { x: 0.50, y: 0.44 },
    { x: 0.50, y: 0.48 }, { x: 0.50, y: 0.51 }, { x: 0.50, y: 0.53 }, { x: 0.50, y: 0.55 },
  ];
  const nose_base: LandmarkPoint[] = [
    { x: 0.44, y: 0.54 }, { x: 0.46, y: 0.55 }, { x: 0.48, y: 0.56 },
    { x: 0.50, y: 0.56 }, { x: 0.52, y: 0.56 }, { x: 0.54, y: 0.55 }, { x: 0.56, y: 0.54 },
  ];

  // Lips
  const lipCx = 0.50, lipCy = 0.66, lipRx = 0.07, lipRy = 0.025;
  const outer_lip: LandmarkPoint[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = Math.PI + (i / 20) * Math.PI * 2;
    outer_lip.push({ x: lipCx + lipRx * Math.cos(angle), y: lipCy + lipRy * Math.sin(angle) });
  }
  const inner_lip: LandmarkPoint[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = Math.PI + (i / 20) * Math.PI * 2;
    inner_lip.push({ x: lipCx + lipRx * 0.6 * Math.cos(angle), y: lipCy + lipRy * 0.6 * Math.sin(angle) });
  }

  return {
    jawline, forehead_contour, right_brow, left_brow,
    right_eye, left_eye, nose_bridge, nose_base, outer_lip, inner_lip,
  };
}

/* ─── Tag display labels ─── */
const eyeTagLabels: Record<string, string> = {
  MONOLID: "Monolid", HOODED: "Hooded", DOUBLE_LID: "Double Lid",
  UPTURNED: "Upturned", DOWNTURNED: "Downturned", ROUND_EYE: "Round Eye",
  ALMOND_EYE: "Almond Eye", WIDE_SET: "Wide-Set", CLOSE_SET: "Close-Set",
};
const facialTagLabels: Record<string, string> = {
  LOW_NOSE_BRIDGE: "Low Bridge", HIGH_NOSE_BRIDGE: "High Bridge",
  WIDE_ALAR: "Wide Alar", NARROW_ALAR: "Narrow Alar",
  THIN_LIP: "Thin Lip", FULL_LIP: "Full Lip",
  DEFINED_BOW: "Defined Bow", FLAT_BOW: "Flat Bow",
  WIDE_LIP: "Wide Lip", SMALL_MOUTH: "Small Mouth",
};
const faceShapeLabels: Record<string, string> = {
  OVAL: "Oval", ROUND: "Round", SQUARE: "Square",
  HEART: "Heart", OBLONG: "Oblong", DIAMOND: "Diamond",
};

/* ─── Annotation definitions ─── */
interface TagAnnotation {
  label: string;
  color: string;
  /** Normalised anchor point on the face for the leader line */
  anchor: LandmarkPoint;
  side: "left" | "right";
}

/**
 * Get a representative anchor point from a landmark group.
 */
function groupCenter(pts: LandmarkPoint[]): LandmarkPoint {
  if (pts.length === 0) return { x: 0.5, y: 0.5 };
  const sx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const sy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: sx, y: sy };
}

function buildTagAnnotations(
  faceShape: string,
  eyeTags: string[],
  facialTags: string[],
  groups: LandmarkGroups,
): TagAnnotation[] {
  const annotations: TagAnnotation[] = [];

  const rightEyeCenter = groupCenter(groups.right_eye);
  const leftEyeCenter = groupCenter(groups.left_eye);
  const eyeAnchor1 = rightEyeCenter;
  const eyeAnchor2 = leftEyeCenter;

  // LEFT side: Eye tags + Face shape
  eyeTags.forEach((tag, i) => {
    annotations.push({
      label: eyeTagLabels[tag] || tag,
      color: COLORS.eyes,
      anchor: i % 2 === 0 ? eyeAnchor1 : eyeAnchor2,
      side: "left",
    });
  });

  // Face shape anchored to chin area
  const chinAnchor = groups.jawline.length > 0
    ? groups.jawline[Math.floor(groups.jawline.length / 2)]
    : { x: 0.5, y: 0.8 };
  annotations.push({
    label: `${faceShapeLabels[faceShape] || faceShape} Face`,
    color: COLORS.face,
    anchor: chinAnchor,
    side: "left",
  });

  // RIGHT side: Nose tags + Lip tags
  const noseTags = facialTags.filter(t => t.includes("NOSE") || t.includes("ALAR") || t.includes("BRIDGE"));
  const lipTags = facialTags.filter(t => t.includes("LIP") || t.includes("BOW") || t.includes("MOUTH"));

  const noseCenter = groupCenter([...groups.nose_bridge, ...groups.nose_base]);
  const lipCenter = groupCenter(groups.outer_lip);

  noseTags.forEach((tag) => {
    annotations.push({
      label: facialTagLabels[tag] || tag,
      color: COLORS.nose,
      anchor: noseCenter,
      side: "right",
    });
  });

  lipTags.forEach((tag) => {
    annotations.push({
      label: facialTagLabels[tag] || tag,
      color: COLORS.lips,
      anchor: lipCenter,
      side: "right",
    });
  });

  return annotations;
}

/**
 * Resolve tag Y positions so they align with their anchor landmark Y,
 * but don't overlap.
 */
function resolveTagPositions(
  anns: TagAnnotation[],
  transform: (nx: number, ny: number) => { sx: number; sy: number },
  tagH: number,
  minGap: number,
  minY: number,
  maxY: number,
): number[] {
  if (anns.length === 0) return [];

  const desired = anns.map((ann) => {
    const { sy } = transform(ann.anchor.x, ann.anchor.y);
    return sy - tagH / 2;
  });

  const indices = desired.map((_, i) => i).sort((a, b) => desired[a] - desired[b]);
  const resolved = new Array<number>(anns.length);
  const step = tagH + minGap;

  let prevBottom = -Infinity;
  for (const idx of indices) {
    let y = desired[idx];
    y = Math.max(minY, Math.min(maxY - tagH, y));
    if (y < prevBottom + minGap) {
      y = prevBottom + minGap;
    }
    resolved[idx] = y;
    prevBottom = y + tagH;
  }

  const lastIdx = indices[indices.length - 1];
  const overflow = resolved[lastIdx] + tagH - maxY;
  if (overflow > 0) {
    for (let i = indices.length - 1; i >= 0; i--) {
      const idx = indices[i];
      resolved[idx] = Math.max(minY, resolved[idx] - overflow);
      if (i > 0) {
        const prevIdx = indices[i - 1];
        if (resolved[prevIdx] + step > resolved[idx]) {
          resolved[prevIdx] = resolved[idx] - step;
        }
      }
    }
  }

  return resolved;
}

/**
 * Compute the "xMidYMid slice" transform for SVG <image>.
 */
function computeSliceTransform(
  imgNatW: number,
  imgNatH: number,
  boxW: number,
  boxH: number,
  boxX: number,
  boxY: number,
) {
  const imgAR = imgNatW / imgNatH;
  const boxAR = boxW / boxH;

  let scale: number;
  let offsetX: number;
  let offsetY: number;

  if (imgAR > boxAR) {
    scale = boxH / imgNatH;
    offsetX = (boxW - imgNatW * scale) / 2;
    offsetY = 0;
  } else {
    scale = boxW / imgNatW;
    offsetX = 0;
    offsetY = (boxH - imgNatH * scale) / 2;
  }

  return (normX: number, normY: number): { sx: number; sy: number } => {
    const pixX = normX * imgNatW * scale + offsetX;
    const pixY = normY * imgNatH * scale + offsetY;
    return {
      sx: boxX + pixX,
      sy: boxY + pixY,
    };
  };
}

/* ─── Path helpers for landmark groups ─── */
function groupPath(
  pts: LandmarkPoint[],
  transform: (nx: number, ny: number) => { sx: number; sy: number },
  close = false,
): string {
  if (pts.length === 0) return "";
  const d = pts.map((p, i) => {
    const { sx, sy } = transform(p.x, p.y);
    return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
  }).join(" ");
  return close ? d + " Z" : d;
}

/* ─── Component ─── */
export default function FaceLandmarkDiagram({
  userImage,
  landmarkGroups,
  foreheadContour,
  metrics: _metrics,
  faceShape,
  eyeTags,
  facialTags,
  themeColor,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [imgNatSize, setImgNatSize] = useState<{ w: number; h: number } | null>(null);

  const groups = useMemo(
    () => landmarkGroups ?? generateDemoLandmarkGroups(),
    [landmarkGroups],
  );
  const fhContour = useMemo(
    () => foreheadContour ?? groups.forehead_contour,
    [foreheadContour, groups],
  );
  const annotations = useMemo(
    () => buildTagAnnotations(faceShape, eyeTags, facialTags, groups),
    [faceShape, eyeTags, facialTags, groups],
  );

  useEffect(() => {
    if (!userImage) {
      setImgNatSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImgNatSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = userImage;
  }, [userImage]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) setContainerWidth(width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Layout constants
  const TAG_AREA_W = 140;
  const IMG_W = 320;
  const IMG_H = IMG_W * 1.25;
  const SVG_W = TAG_AREA_W + IMG_W + TAG_AREA_W;
  const SVG_H = IMG_H + 20;
  const IMG_X = TAG_AREA_W;
  const IMG_Y = 10;
  const TAG_H = 30;
  const TAG_GAP = 6;
  const accent = themeColor || "#5A8A6B";

  const transform = useMemo(() => {
    if (imgNatSize) {
      return computeSliceTransform(imgNatSize.w, imgNatSize.h, IMG_W, IMG_H, IMG_X, IMG_Y);
    }
    return (nx: number, ny: number) => ({
      sx: IMG_X + nx * IMG_W,
      sy: IMG_Y + ny * IMG_H,
    });
  }, [imgNatSize, IMG_W, IMG_H, IMG_X, IMG_Y]);

  // Split annotations by side
  const leftAnns = useMemo(() => annotations.filter(a => a.side === "left"), [annotations]);
  const rightAnns = useMemo(() => annotations.filter(a => a.side === "right"), [annotations]);

  const leftTagYs = useMemo(
    () => resolveTagPositions(leftAnns, transform, TAG_H, TAG_GAP, IMG_Y, IMG_Y + IMG_H),
    [leftAnns, transform, TAG_H, TAG_GAP, IMG_Y, IMG_H],
  );
  const rightTagYs = useMemo(
    () => resolveTagPositions(rightAnns, transform, TAG_H, TAG_GAP, IMG_Y, IMG_Y + IMG_H),
    [rightAnns, transform, TAG_H, TAG_GAP, IMG_Y, IMG_H],
  );

  // Full face outline: jawline + forehead contour (connected)
  const fullFaceOutlinePath = useMemo(() => {
    if (fhContour.length === 0) {
      return groupPath(groups.jawline, transform);
    }
    const jawPath = groupPath(groups.jawline, transform);
    const fhReversed = [...fhContour].reverse();
    const fhPath = fhReversed.map((p) => {
      const { sx, sy } = transform(p.x, p.y);
      return `L ${sx} ${sy}`;
    }).join(" ");
    const start = groups.jawline[0];
    if (!start) return jawPath;
    const { sx: startX, sy: startY } = transform(start.x, start.y);
    return `${jawPath} ${fhPath} L ${startX} ${startY}`;
  }, [groups.jawline, fhContour, transform]);

  // Measurement line helpers
  const faceTopPt = useMemo(() => {
    if (fhContour.length > 0) {
      let minY = Infinity;
      let best = fhContour[0];
      for (const p of fhContour) {
        if (p.y < minY) { minY = p.y; best = p; }
      }
      return transform(best.x, best.y);
    }
    return transform(0.5, 0.2);
  }, [fhContour, transform]);

  const chinPt = useMemo(() => {
    const jawMid = groups.jawline[Math.floor(groups.jawline.length / 2)];
    return jawMid ? transform(jawMid.x, jawMid.y) : transform(0.5, 0.8);
  }, [groups.jawline, transform]);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-auto"
        style={{ maxWidth: containerWidth }}
      >
        {/* ─── Image area with clip ─── */}
        <defs>
          <clipPath id="img-clip">
            <rect x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H} rx={16} />
          </clipPath>
        </defs>

        <rect x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H} rx={16} fill="#1D1F2B" />

        {userImage ? (
          <image
            href={userImage}
            x={IMG_X}
            y={IMG_Y}
            width={IMG_W}
            height={IMG_H}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#img-clip)"
          />
        ) : (
          <g clipPath="url(#img-clip)">
            <rect x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H} fill="url(#demo-bg)" />
            <defs>
              <linearGradient id="demo-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2D2226" />
                <stop offset="100%" stopColor="#1D1F2B" />
              </linearGradient>
            </defs>
            <ellipse cx={IMG_X + IMG_W / 2} cy={IMG_Y + IMG_H * 0.45} rx={IMG_W * 0.25} ry={IMG_H * 0.3} fill="white" opacity={0.06} />
          </g>
        )}

        <rect
          x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H} rx={16}
          fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1}
        />

        {/* ─── Clip all landmark overlays to the image box ─── */}
        <g clipPath="url(#img-clip)">
          {/* Full face outline */}
          <path
            d={fullFaceOutlinePath}
            fill="none" stroke={COLORS.face} strokeWidth={1.4} strokeLinejoin="round" opacity={0.5}
          />

          {/* Forehead contour dots */}
          {fhContour.map((p, i) => {
            const { sx, sy } = transform(p.x, p.y);
            return <circle key={`fh${i}`} cx={sx} cy={sy} r={2} fill={COLORS.face} opacity={0.5} />;
          })}

          {/* Eyes */}
          <path
            d={groupPath(groups.right_eye, transform, true)}
            fill="none" stroke={COLORS.eyes} strokeWidth={1.2} strokeLinejoin="round" opacity={0.55}
          />
          <path
            d={groupPath(groups.left_eye, transform, true)}
            fill="none" stroke={COLORS.eyes} strokeWidth={1.2} strokeLinejoin="round" opacity={0.55}
          />
          {/* Brows */}
          <path
            d={groupPath(groups.right_brow, transform)}
            fill="none" stroke={COLORS.eyes} strokeWidth={1} opacity={0.35}
          />
          <path
            d={groupPath(groups.left_brow, transform)}
            fill="none" stroke={COLORS.eyes} strokeWidth={1} opacity={0.35}
          />
          {/* Nose */}
          <path
            d={groupPath(groups.nose_bridge, transform)}
            fill="none" stroke={COLORS.nose} strokeWidth={1} opacity={0.45}
          />
          <path
            d={groupPath(groups.nose_base, transform)}
            fill="none" stroke={COLORS.nose} strokeWidth={1.2} opacity={0.45}
          />
          {/* Lips */}
          <path
            d={groupPath(groups.outer_lip, transform, true)}
            fill="none" stroke={COLORS.lips} strokeWidth={1.2} strokeLinejoin="round" opacity={0.55}
          />

          {/* ─── Landmark dots ─── */}
          {groups.jawline.map((p, i) => {
            const { sx, sy } = transform(p.x, p.y);
            return <circle key={`j${i}`} cx={sx} cy={sy} r={2} fill={COLORS.face} opacity={0.6} />;
          })}
          {[...groups.right_eye, ...groups.left_eye].map((p, i) => {
            const { sx, sy } = transform(p.x, p.y);
            return <circle key={`e${i}`} cx={sx} cy={sy} r={2} fill={COLORS.eyes} opacity={0.7} />;
          })}
          {[...groups.right_brow, ...groups.left_brow].map((p, i) => {
            const { sx, sy } = transform(p.x, p.y);
            return <circle key={`b${i}`} cx={sx} cy={sy} r={1.5} fill={COLORS.eyes} opacity={0.4} />;
          })}
          {[...groups.nose_bridge, ...groups.nose_base].map((p, i) => {
            const { sx, sy } = transform(p.x, p.y);
            return <circle key={`n${i}`} cx={sx} cy={sy} r={2} fill={COLORS.nose} opacity={0.6} />;
          })}
          {groups.outer_lip.map((p, i) => {
            const { sx, sy } = transform(p.x, p.y);
            return <circle key={`l${i}`} cx={sx} cy={sy} r={2} fill={COLORS.lips} opacity={0.6} />;
          })}

          {/* ─── Measurement lines ─── */}
          {/* Face height */}
          <line
            x1={faceTopPt.sx - 15} y1={faceTopPt.sy}
            x2={chinPt.sx - 15} y2={chinPt.sy}
            stroke={COLORS.face} strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4}
          />
          <line
            x1={faceTopPt.sx - 19} y1={faceTopPt.sy}
            x2={faceTopPt.sx - 11} y2={faceTopPt.sy}
            stroke={COLORS.face} strokeWidth={0.8} opacity={0.4}
          />
          <line
            x1={chinPt.sx - 19} y1={chinPt.sy}
            x2={chinPt.sx - 11} y2={chinPt.sy}
            stroke={COLORS.face} strokeWidth={0.8} opacity={0.4}
          />

          {/* Eye width lines */}
          {groups.right_eye.length > 0 && (() => {
            const re = groups.right_eye;
            const le = groups.left_eye;
            const rFirst = transform(re[0].x, re[0].y);
            const rMid = transform(re[Math.floor(re.length / 2)].x, re[Math.floor(re.length / 2)].y);
            const lFirst = transform(le[0].x, le[0].y);
            const lMid = transform(le[Math.floor(le.length / 2)].x, le[Math.floor(le.length / 2)].y);
            return (
              <>
                <line x1={rFirst.sx} y1={rFirst.sy} x2={rMid.sx} y2={rMid.sy}
                  stroke={COLORS.eyes} strokeWidth={0.7} strokeDasharray="2 2" opacity={0.4} />
                <line x1={lFirst.sx} y1={lFirst.sy} x2={lMid.sx} y2={lMid.sy}
                  stroke={COLORS.eyes} strokeWidth={0.7} strokeDasharray="2 2" opacity={0.4} />
              </>
            );
          })()}
        </g>

        {/* ─── LEFT SIDE TAG ANNOTATIONS ─── */}
        {leftAnns.map((ann, i) => {
          const { sx: ax, sy: ay } = transform(ann.anchor.x, ann.anchor.y);
          const tagW = TAG_AREA_W - 12;
          const tagX = 4;
          const tagY = leftTagYs[i] ?? IMG_Y;
          const lineStartX = tagX + tagW;
          const lineStartY = tagY + TAG_H / 2;

          return (
            <g key={`left-${i}`}>
              <circle cx={ax} cy={ay} r={5} fill={ann.color} opacity={0.2} />
              <circle cx={ax} cy={ay} r={3} fill={ann.color} stroke="white" strokeWidth={1} />
              <path
                d={`M ${lineStartX} ${lineStartY} L ${IMG_X - 4} ${lineStartY} L ${ax} ${ay}`}
                fill="none" stroke={ann.color} strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5}
              />
              <rect
                x={tagX} y={tagY} width={tagW} height={TAG_H} rx={TAG_H / 2}
                fill="white" stroke={ann.color} strokeWidth={1.2} opacity={0.95}
              />
              <circle cx={tagX + 14} cy={tagY + TAG_H / 2} r={4} fill={ann.color} opacity={0.8} />
              <text
                x={tagX + 24} y={tagY + TAG_H / 2 + 4}
                fontSize={10} fontWeight={600} fill="#2D2226"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {ann.label.length > 14 ? ann.label.slice(0, 14) + "…" : ann.label}
              </text>
            </g>
          );
        })}

        {/* ─── RIGHT SIDE TAG ANNOTATIONS ─── */}
        {rightAnns.map((ann, i) => {
          const { sx: ax, sy: ay } = transform(ann.anchor.x, ann.anchor.y);
          const tagW = TAG_AREA_W - 12;
          const tagX = IMG_X + IMG_W + 8;
          const tagY = rightTagYs[i] ?? IMG_Y;
          const lineStartX = tagX;
          const lineStartY = tagY + TAG_H / 2;

          return (
            <g key={`right-${i}`}>
              <circle cx={ax} cy={ay} r={5} fill={ann.color} opacity={0.2} />
              <circle cx={ax} cy={ay} r={3} fill={ann.color} stroke="white" strokeWidth={1} />
              <path
                d={`M ${ax} ${ay} L ${IMG_X + IMG_W + 4} ${lineStartY} L ${lineStartX} ${lineStartY}`}
                fill="none" stroke={ann.color} strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5}
              />
              <rect
                x={tagX} y={tagY} width={tagW} height={TAG_H} rx={TAG_H / 2}
                fill="white" stroke={ann.color} strokeWidth={1.2} opacity={0.95}
              />
              <circle cx={tagX + 14} cy={tagY + TAG_H / 2} r={4} fill={ann.color} opacity={0.8} />
              <text
                x={tagX + 24} y={tagY + TAG_H / 2 + 4}
                fontSize={10} fontWeight={600} fill="#2D2226"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {ann.label.length > 14 ? ann.label.slice(0, 14) + "…" : ann.label}
              </text>
            </g>
          );
        })}

        {/* Image border glow */}
        <rect
          x={IMG_X} y={IMG_Y} width={IMG_W} height={IMG_H} rx={16}
          fill="none" stroke={accent} strokeWidth={1.5} opacity={0.25}
        />
      </svg>
    </div>
  );
}