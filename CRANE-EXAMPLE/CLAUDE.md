# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D robotic crane simulation built with vanilla JavaScript and Three.js. The project demonstrates inverse kinematics for robotic arm movement and interactive 3D object manipulation.

## Technology Stack

- **Frontend**: Vanilla JavaScript with ES6 modules
- **3D Graphics**: Three.js v0.126.1 (loaded from CDN)
- **Animation**: Tween.js v18.5.0 (for smooth transitions)
- **Interaction**: three.interaction v0.2.3 (for mouse/touch events)
- **Kinematics**: Custom kinematics library v1.0.2 (in vendor/kinematics/)

## Project Structure

```
/
├── index.html        # Main entry point
├── scene.js         # Scene setup, interaction logic, and main application flow
├── robot.js         # Robot arm construction and control functions
└── vendor/          # Third-party libraries
    ├── kinematics/  # Inverse kinematics calculations
    └── three.interaction/  # Three.js interaction system
```

## Key Architecture Components

### Scene Setup (scene.js)
- Creates the 3D environment with camera, lighting, and renderer
- Generates interactive spheres in a polar coordinate pattern
- Implements the pickup/disposal animation sequence using inverse kinematics
- Handles user interactions and coordinates robot movements

### Robot Definition (robot.js)
- Defines an 8-DOF (degrees of freedom) robotic arm
- Exports `createRobot()` function that returns the complete arm assembly
- Each joint is properly hierarchical with correct pivot points
- Robot segments: base, 4 arm segments, wrist, and gripper fingers

### Interaction Flow
1. User clicks on a sphere
2. Inverse kinematics calculates required joint angles
3. Robot arm animates to reach and grab the sphere
4. Arm moves to trash bin location
5. Sphere is released and falls into bin

## Development Commands

This project has no build system or package manager. To run:
1. Open index.html directly in a modern web browser
2. Or serve the directory with any static file server (e.g., `python -m http.server`)

## Important Implementation Details

- The robot uses a hierarchical Three.js object structure where each joint is a child of the previous one
- Inverse kinematics calculations are performed by the vendor/kinematics library
- All animations use Tween.js for smooth interpolation
- Interactive objects must be added to the interaction manager for click detection
- The coordinate system uses Three.js conventions (Y-up)

## Common Modifications

- To adjust robot reach: Modify segment lengths in robot.js
- To change sphere layout: Update the polar coordinate generation in scene.js
- To modify animation speed: Adjust duration values in Tween animations
- To add new interactive objects: Create Three.js mesh and add to interaction.addEvents()