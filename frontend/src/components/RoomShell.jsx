import { ENTRANCE_POINT, ROOM_LAYOUT, TERRACE, WINDOW_BAND } from './roomLayout';

const COLORS = {
    wall: '#f2e3c6',
    pillar: '#e8d3ad',
    cornice: '#e0c9a4',
    floor: '#e9d3ab',
    deck: '#c99e6b',
    terraceDeck: '#c49562',
    terraceSeam: '#a97849',
    base: '#c8bcab',
    stairs: '#c99e6b',
    trim: '#4a3524',
    glass: '#a9d5de',
    ceiling: '#e7d5b5',
    rail: '#8a5a3a',
    planter: '#9b6441',
    leaf: '#4e7a3d',
    leafDark: '#3f6832',
};

const noRaycast = () => null;

function ShellBox({
    args,
    position,
    color,
    opacity = 1,
    roughness = 0.85,
    castShadow = true,
    receiveShadow = true,
}) {
    return (
        <mesh
            raycast={noRaycast}
            position={position}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
        >
            <boxGeometry args={args} />
            <meshStandardMaterial
                color={color}
                transparent={opacity < 1}
                opacity={opacity}
                roughness={roughness}
            />
        </mesh>
    );
}

function StraightWall({ axis, at, side, from, to, height, band, withTrim = false }) {
    const { wallThickness } = ROOM_LAYOUT;
    const length = to - from;
    const center = (from + to) / 2;
    const perp = at - (side * wallThickness) / 2;
    const glassHeight = band.top - band.bottom;
    const bandCenter = (band.bottom + band.top) / 2;
    const segments = Math.max(2, Math.round(length / WINDOW_BAND.spacing));
    const mullionPositions = Array.from(
        { length: segments + 1 },
        (_, index) => from + (index * length) / segments,
    );

    const wallPos = (value, y) => (axis === 'x' ? [value, y, perp] : [perp, y, value]);
    const trimPos = (value, y) =>
        axis === 'x' ? [value, y, at + side * 0.025] : [at + side * 0.025, y, value];
    const stretch = (depth, h) => (axis === 'x' ? [length, h, depth] : [depth, h, length]);
    const post = (width, h, depth) => (axis === 'x' ? [width, h, depth] : [depth, h, width]);

    return (
        <group>
            <ShellBox
                args={stretch(wallThickness, band.bottom + 0.2)}
                position={wallPos(center, (band.bottom - 0.2) / 2)}
                color={COLORS.wall}
            />

            {height - band.top > 0.12 && (
                <ShellBox
                    args={stretch(wallThickness, height - band.top)}
                    position={wallPos(center, (band.top + height) / 2)}
                    color={COLORS.wall}
                />
            )}

            <ShellBox
                args={stretch(0.06, glassHeight + 0.1)}
                position={wallPos(center, bandCenter)}
                color={COLORS.glass}
                opacity={0.25}
                roughness={0.15}
                castShadow={false}
                receiveShadow={false}
            />

            <ShellBox
                args={stretch(wallThickness + 0.06, 0.1)}
                position={wallPos(center, band.bottom + 0.04)}
                color={COLORS.trim}
            />
            <ShellBox
                args={stretch(wallThickness + 0.06, 0.1)}
                position={wallPos(center, band.top - 0.04)}
                color={COLORS.trim}
            />

            {mullionPositions.map((value) => (
                <ShellBox
                    key={value}
                    args={post(0.08, glassHeight + 0.08, wallThickness * 0.8)}
                    position={wallPos(value, bandCenter)}
                    color={COLORS.trim}
                />
            ))}

            {withTrim && (
                <>
                    <ShellBox
                        args={stretch(0.06, 0.22)}
                        position={trimPos(center, 0.11)}
                        color={COLORS.trim}
                    />
                    <ShellBox
                        args={stretch(wallThickness + 0.12, 0.12)}
                        position={wallPos(center, height - 0.08)}
                        color={COLORS.cornice}
                    />
                </>
            )}
        </group>
    );
}

function Pillar({ x, z, height }) {
    return (
        <group position={[x, 0, z]}>
            <ShellBox
                args={[0.5, height + 0.2, 0.5]}
                position={[0, (height - 0.2) / 2, 0]}
                color={COLORS.pillar}
            />
            <ShellBox args={[0.62, 0.14, 0.62]} position={[0, 0.06, 0]} color={COLORS.cornice} />
            <ShellBox
                args={[0.62, 0.1, 0.62]}
                position={[0, height - 0.04, 0]}
                color={COLORS.cornice}
            />
        </group>
    );
}

function RailingRun({ axis, at, from, to }) {
    const length = to - from;
    const center = (from + to) / 2;
    const posts = Math.max(2, Math.round(length / 2.1));
    const postPositions = Array.from(
        { length: posts + 1 },
        (_, index) => from + (index * length) / posts,
    );
    const place = (value, y, depth) =>
        axis === 'x' ? [value, y, at] : [at, y, value];
    const span = (size, height, depth) =>
        axis === 'x' ? [size, height, depth] : [depth, height, size];

    return (
        <group>
            {postPositions.map((value) => (
                <ShellBox
                    key={`${axis}-${value}`}
                    args={[0.15, TERRACE.railHeight, 0.15]}
                    position={place(value, TERRACE.railHeight / 2, 0)}
                    color={COLORS.rail}
                />
            ))}
            <ShellBox
                args={span(length, 0.13, 0.2)}
                position={place(center, TERRACE.railHeight - 0.08, 0)}
                color={COLORS.rail}
            />
            <ShellBox
                args={span(length, 0.08, 0.12)}
                position={place(center, TERRACE.railHeight * 0.55, 0)}
                color={COLORS.rail}
            />
            <ShellBox
                args={span(length, 0.07, 0.1)}
                position={place(center, 0.18, 0)}
                color={COLORS.rail}
            />
        </group>
    );
}

function Planter({ x, z, scale = 1 }) {
    return (
        <group position={[x, TERRACE.deckY, z]} scale={scale}>
            <ShellBox args={[0.9, 0.62, 0.9]} position={[0, 0.31, 0]} color={COLORS.planter} />
            <ShellBox
                args={[0.98, 0.1, 0.98]}
                position={[0, 0.61, 0]}
                color={COLORS.cornice}
            />
            <mesh raycast={noRaycast} castShadow receiveShadow position={[0, 0.98, 0]}>
                <sphereGeometry args={[0.44, 16, 12]} />
                <meshStandardMaterial color={COLORS.leaf} roughness={0.9} />
            </mesh>
            <mesh raycast={noRaycast} castShadow position={[0.18, 1.28, 0.08]}>
                <sphereGeometry args={[0.31, 14, 10]} />
                <meshStandardMaterial color={COLORS.leafDark} roughness={0.9} />
            </mesh>
            <mesh raycast={noRaycast} castShadow position={[-0.2, 1.18, -0.06]}>
                <sphereGeometry args={[0.27, 14, 10]} />
                <meshStandardMaterial color={COLORS.leaf} roughness={0.9} />
            </mesh>
        </group>
    );
}

export default function RoomShell() {
    const {
        minX,
        maxX,
        minZ,
        maxZ,
        wallHeight,
        shortWallHeight,
        wallThickness,
        deckWidth,
        deckY,
        baseY,
        baseMargin,
    } = ROOM_LAYOUT;

    const width = maxX - minX;
    const depth = maxZ - minZ;
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    const deckWidthTotal = width + deckWidth * 2;
    const deckDepthTotal = depth + deckWidth * 2;
    const ceilingY = wallHeight + 0.11;
    const stripeLength = 1.3;
    const backStripeX = minX - wallThickness + stripeLength / 2;
    const sideStripeLength = width + wallThickness * 2 - stripeLength;
    const sideStripeX = minX - wallThickness + stripeLength + sideStripeLength / 2;
    const backStripeZ = minZ - wallThickness + stripeLength / 2;
    const entranceMinX = ENTRANCE_POINT.x - TERRACE.entranceHalfWidth;
    const entranceMaxX = ENTRANCE_POINT.x + TERRACE.entranceHalfWidth;
    const terraceWidth = TERRACE.deckMaxX - TERRACE.deckMinX;
    const terraceDepth = TERRACE.deckMaxZ - TERRACE.deckMinZ;
    const terraceMidX = (TERRACE.deckMinX + TERRACE.deckMaxX) / 2;
    const terraceMidZ = (TERRACE.deckMinZ + TERRACE.deckMaxZ) / 2;
    const terraceBaseY = TERRACE.deckY - 0.48;
    const terraceSeams = [8.2, 10.1, 12.0, 13.9];

    return (
        <group>
            <ShellBox
                args={[deckWidthTotal + baseMargin * 2, 0.5, deckDepthTotal + baseMargin * 2]}
                position={[midX, baseY - 0.25, midZ]}
                color={COLORS.base}
            />
            <ShellBox
                args={[deckWidthTotal, 0.48, deckDepthTotal]}
                position={[midX, deckY - 0.24, midZ]}
                color={COLORS.deck}
            />
            <ShellBox
                args={[width, 0.2, depth]}
                position={[midX, -0.1, midZ]}
                color={COLORS.floor}
                roughness={0.9}
            />

            <ShellBox
                args={[
                    terraceWidth + baseMargin * 2,
                    0.5,
                    terraceDepth + baseMargin * 2,
                ]}
                position={[terraceMidX, terraceBaseY - 0.25, terraceMidZ]}
                color={COLORS.base}
            />
            <ShellBox
                args={[terraceWidth, 0.48, terraceDepth]}
                position={[terraceMidX, TERRACE.deckY - 0.24, terraceMidZ]}
                color={COLORS.terraceDeck}
                roughness={0.9}
            />
            {terraceSeams.map((z) => (
                <ShellBox
                    key={`terrace-seam-${z}`}
                    args={[terraceWidth, 0.012, 0.035]}
                    position={[terraceMidX, TERRACE.deckY + 0.006, z]}
                    color={COLORS.terraceSeam}
                    castShadow={false}
                    receiveShadow={false}
                />
            ))}

            <StraightWall
                axis="x"
                at={minZ}
                side={1}
                from={minX}
                to={maxX}
                height={wallHeight}
                band={WINDOW_BAND.tall}
                withTrim
            />
            <StraightWall
                axis="z"
                at={minX}
                side={1}
                from={minZ}
                to={maxZ}
                height={wallHeight}
                band={WINDOW_BAND.tall}
                withTrim
            />
            <StraightWall
                axis="x"
                at={maxZ}
                side={-1}
                from={minX}
                to={entranceMinX}
                height={shortWallHeight}
                band={WINDOW_BAND.short}
            />
            <StraightWall
                axis="x"
                at={maxZ}
                side={-1}
                from={entranceMaxX}
                to={maxX}
                height={shortWallHeight}
                band={WINDOW_BAND.short}
            />
            <StraightWall
                axis="z"
                at={maxX}
                side={-1}
                from={minZ}
                to={maxZ}
                height={shortWallHeight}
                band={WINDOW_BAND.short}
            />

            <Pillar x={minX - 0.05} z={minZ - 0.05} height={wallHeight} />
            <Pillar x={maxX + 0.05} z={minZ - 0.05} height={wallHeight} />
            <Pillar x={minX - 0.05} z={maxZ + 0.05} height={wallHeight} />
            <Pillar x={maxX + 0.05} z={maxZ + 0.05} height={shortWallHeight + 0.3} />

            <ShellBox
                args={[stripeLength, 0.22, depth + wallThickness * 2]}
                position={[backStripeX, ceilingY, midZ]}
                color={COLORS.ceiling}
            />
            <ShellBox
                args={[sideStripeLength, 0.22, stripeLength]}
                position={[sideStripeX, ceilingY, backStripeZ]}
                color={COLORS.ceiling}
            />

            <ShellBox
                args={[0.16, 1.42, 0.34]}
                position={[entranceMinX, 0.71, maxZ]}
                color={COLORS.trim}
            />
            <ShellBox
                args={[0.16, 1.42, 0.34]}
                position={[entranceMaxX, 0.71, maxZ]}
                color={COLORS.trim}
            />
            <ShellBox
                args={[TERRACE.entranceHalfWidth * 2 + 0.16, 0.14, 0.34]}
                position={[ENTRANCE_POINT.x, 1.35, maxZ]}
                color={COLORS.trim}
            />
            <ShellBox
                args={[TERRACE.entranceHalfWidth * 2, 0.02, 0.36]}
                position={[ENTRANCE_POINT.x, 0.01, maxZ + 0.2]}
                color={COLORS.stairs}
                castShadow={false}
            />
            <ShellBox
                args={[TERRACE.entranceHalfWidth * 2 - 0.2, 0.012, 0.28]}
                position={[ENTRANCE_POINT.x, 0.006, maxZ + 0.5]}
                color={COLORS.stairs}
                castShadow={false}
            />

            <RailingRun
                axis="z"
                at={TERRACE.deckMinX + 0.15}
                from={TERRACE.minZ}
                to={TERRACE.deckMaxZ - 0.15}
            />
            <RailingRun
                axis="z"
                at={TERRACE.deckMaxX - 0.15}
                from={TERRACE.minZ}
                to={TERRACE.deckMaxZ - 0.15}
            />
            <RailingRun
                axis="x"
                at={TERRACE.deckMaxZ - 0.15}
                from={TERRACE.deckMinX + 0.15}
                to={TERRACE.deckMaxX - 0.15}
            />

            <Planter x={-8.35} z={13.25} />
            <Planter x={8.35} z={13.25} />
            <Planter x={-8.55} z={7.25} scale={0.82} />
            <Planter x={8.55} z={7.25} scale={0.82} />
        </group>
    );
}
