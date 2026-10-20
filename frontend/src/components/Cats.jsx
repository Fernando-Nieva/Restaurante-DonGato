import { useRef } from 'react';
import Cat from './Cat';

const CATS = [
    {
        name: 'gato-naranja',
        color: '#e08a3c',
        bellyColor: '#f6d7ab',
        eyeColor: '#3d2814',
        speed: 0.8,
        restMin: 2,
        restMax: 5,
        startPosition: [0.8, 0, 3.8],
    },
    {
        name: 'gato-gris',
        color: '#8a8580',
        bellyColor: '#f4f1ea',
        eyeColor: '#3d2814',
        speed: 0.6,
        restMin: 4,
        restMax: 9,
        startPosition: [-2.2, 0, 4.2],
    },
    {
        name: 'gato-negro',
        color: '#2e2a28',
        bellyColor: '#e9e1d2',
        eyeColor: '#e8b13c',
        speed: 1.1,
        restMin: 1,
        restMax: 3,
        startPosition: [4.5, 0, 3.8],
    },
];

export default function Cats({ tables = [], animationsEnabled = true, registry = null, waiters = null }) {
    const internalRegistry = useRef([]);
    const sharedRegistry = registry ?? internalRegistry;

    return (
        <>
            {CATS.map((cat) => (
                <Cat
                    key={cat.name}
                    {...cat}
                    tables={tables}
                    registry={sharedRegistry}
                    waiters={waiters}
                    animationsEnabled={animationsEnabled}
                />
            ))}
        </>
    );
}
