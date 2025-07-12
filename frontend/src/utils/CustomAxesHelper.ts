import * as THREE from 'three'

export class CustomAxesHelper extends THREE.Group {
  constructor(size: number = 300) {
    super()

    const axisLength = size
    const axisThickness = 2

    // X axis (red)
    const xGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const xAxis = new THREE.Mesh(xGeometry, xMaterial)
    xAxis.rotation.z = -Math.PI / 2
    xAxis.position.x = axisLength / 2
    this.add(xAxis)

    // X arrow cone
    const xCone = new THREE.Mesh(
      new THREE.ConeGeometry(6, 20, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    )
    xCone.position.x = axisLength
    xCone.rotation.z = -Math.PI / 2
    this.add(xCone)

    // Y axis (green)
    const yGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const yAxis = new THREE.Mesh(yGeometry, yMaterial)
    yAxis.position.y = axisLength / 2
    this.add(yAxis)

    // Y arrow cone
    const yCone = new THREE.Mesh(
      new THREE.ConeGeometry(6, 20, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    )
    yCone.position.y = axisLength
    this.add(yCone)

    // Z axis (blue)
    const zGeometry = new THREE.CylinderGeometry(axisThickness, axisThickness, axisLength, 8)
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
    const zAxis = new THREE.Mesh(zGeometry, zMaterial)
    zAxis.rotation.x = Math.PI / 2
    zAxis.position.z = axisLength / 2
    this.add(zAxis)

    // Z arrow cone
    const zCone = new THREE.Mesh(
      new THREE.ConeGeometry(6, 20, 8),
      new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    )
    zCone.position.z = axisLength
    zCone.rotation.x = Math.PI / 2
    this.add(zCone)

    // Create text sprites for labels
    const createTextSprite = (text: string, color: string) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.width = 128
      canvas.height = 64

      context.font = 'Bold 48px Arial'
      context.fillStyle = color
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(text, 64, 32)

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.scale.set(40, 20, 1)

      return sprite
    }

    // Add labels
    const xLabel = createTextSprite('X', '#ff0000')
    xLabel.position.set(axisLength + 30, 0, 0)
    this.add(xLabel)

    const yLabel = createTextSprite('Y', '#00ff00')
    yLabel.position.set(0, axisLength + 30, 0)
    this.add(yLabel)

    const zLabel = createTextSprite('Z', '#0000ff')
    zLabel.position.set(0, 0, axisLength + 30)
    this.add(zLabel)

    // Add origin sphere
    const originSphere = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    )
    this.add(originSphere)
  }
}
