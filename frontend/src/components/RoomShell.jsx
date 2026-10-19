import { ROOM_LAYOUT, WINDOW_BAND } from './roomLayout';

const COLORS = {
    wall: '#f2e3c6',
    pillar: '#e8d3ad',
    cornice: '#e0c9a4',
    floor: '#e9d3ab',
    deck: '#c99e6b',
    base: '#c8bcab',
    stairs: '#c99e6b',
    trim: '#4a3524',
    glass: '#a9d5de',
    ceiling: '#e7d5b5',
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
                args={[2.4, 0.32, 0.26]}
                position={[midX, baseY + 0.16, maxZ + deckWidth + 0.13]}
                color={COLORS.stairs}
            />
            <ShellBox
                args={[2.4, 0.16, 0.26]}
                position={[midX, baseY + 0.08, maxZ + deckWidth + 0.39]}
                color={COLORS.stairs}
            />
        </group>
    );
}
