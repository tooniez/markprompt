import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

import waveFragmentShader from './shaders/wave.frag'
import waveVertexShader from './shaders/wave.vert'

const WaveMaterial = shaderMaterial(
  {
    time: 0,
    opacity: 0,
    resolution: new THREE.Vector4(),
    amplitude: { value: 0.2 },
    frequency: { value: 2 },
    transparent: true,
    depthWrite: false,
  },
  waveVertexShader,
  waveFragmentShader
)

extend({ WaveMaterial })
