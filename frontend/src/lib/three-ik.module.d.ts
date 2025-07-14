import * as THREE from 'three'

export class IK {
  chains: IKChain[]
  constructor()
  add(chain: IKChain): void
  solve(): void
  getRootBone(): THREE.Bone
}

export class IKChain {
  joints: IKJoint[]
  constructor()
  add(joint: IKJoint, options?: { target?: THREE.Object3D }): void
}

export class IKJoint {
  bone: THREE.Bone
  constraints: IKConstraint[]
  constructor(bone: THREE.Bone, options?: { constraints?: IKConstraint[] })
}

export class IKConstraint {
  angle: number
}

export class IKBallConstraint extends IKConstraint {
  constructor(angle: number)
}

export class IKHelper extends THREE.Object3D {
  showAxes: boolean
  showBones: boolean
  wireframe: boolean
  color: string | number

  constructor(
    ik: IK,
    options?: {
      showBones?: boolean
      showAxes?: boolean
      wireframe?: boolean
      boneSize?: number
      axesSize?: number
      color?: string | number
    },
  )

  updateMatrixWorld(force?: boolean): void
}
