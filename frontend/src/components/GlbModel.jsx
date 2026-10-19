import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { MODEL_CONFIG } from './modelConfig';

Object.values(MODEL_CONFIG).forEach((model) => {
    if (model?.path) {
        useGLTF.preload(model.path);
    }
});

export default function GlbModel({ model, interactive = true, ...props }) {
    const { scene } = useGLTF(model.path);
    const cloned = useMemo(() => scene.clone(true), [scene]);

    useEffect(() => {
        cloned.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (!interactive) {
                    child.raycast = () => null;
                }
            }
        });
    }, [cloned, interactive]);

    return (
        <group {...props}>
            <primitive
                object={cloned}
                scale={model.scale ?? 1}
                position={[0, model.offsetY ?? 0, 0]}
            />
        </group>
    );
}
