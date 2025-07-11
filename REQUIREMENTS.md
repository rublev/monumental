# Visualizing a Robotic Crane (Product/UX)

**Take home assignment: Software Engineer, Product/UX**

The goal of this project is to develop a simple web application for visualizing the state of a virtual robotic system and providing a mechanism to manipulate its pose. Our focus is on simulating a straightforward 4-degree-of-freedom (4-DOF) robotic crane, inspired by the Monumental-style crane. The current state of the crane will be transmitted as telemetry to a client application, where we will render a dynamic 3D representation of the crane in real-time. Additionally, we will implement a user interface to allow sending movement commands to our simulated robot in the backend, mimicking the control processes involved in actual robotic systems.

_More information about the topology of our crane system can be found below._

This take home assignment is twofold and encompasses a little bit of robotics control and the design of a user interface around this. Because you’ve applied for the _Software Engineer, Product/UX_ role we encourage you to strongly focus your efforts in the creation of an intuitive user interface. Start with the _Basic setup_ and think deeply about the user interaction. Think about the error cases, communicating intent, clarify progress, prevent unwanted states in the UI, etc.

## What we want to see

**Basic setup**

- Set up both a backend and frontend that communicate over a WebSocket. Feel free to utilize an out-of-the-box framework such as Next.js if that speeds up development. We recommend using TypeScript for the frontend, which is our language of choice.
- The backend should implement a mock robotic crane, storing its current state. The robotic crane is represented by the current actuator positions for each joint: swing rotation in degrees, lift elevation in mm, elbow rotation in degrees, wrist rotation in degrees, and gripper open/close state in mm. We leave the choice of language here up to you. If you want to make our lives slightly easier you can pick one of Rust/TypeScript/Python/C++.
- Stream the current state from the backend to the client at a fixed interval over a WebSocket connection. Experiment with the frequency to determine what works best for your project.
- On the client side, the user interface comprises two parts: some UI chrome containing control elements and a canvas displaying a 3D representation of the crane.
- Use WebGL (or a wrapper, such as Three.js) to establish a basic scene that renders a simplified representation of the robotic crane. The crane's state should reflect the current pose received from the WebSocket connection. Depending on the time available for the project, you can make this 3D representation as simple or visually appealing as you prefer.
- The control interface contains some user inputs, one for each actuator. Users should be able to modify one or more state values and submit the changes as a control command to the backend via the WebSocket. **The backend will implement these changes as a motion in the mock robotic state, considering predefined maximum speeds and acceleration per actuator. The end result will be a small animation in the frontend.**
- Additionally, the interface provides a means to input a coordinate in 3D space. Upon submitting this coordinate to the backend, the application should perform an inverse kinematics calculation to derive a desired robotic pose for the crane, applying this to the mock state accordingly. The IK for this crane is very simple to derive analytically and doesn’t require any complicated solver.

## **Things to consider**

- Completing the entire assignment, including all the controls and a user-friendly interface, within reasonable time constraints might be challenging. If you find it necessary to simplify the assignment, it's up to you how you approach it. We believe we can gain valuable insights into candidates' abilities by observing how they prioritize tasks and break down larger projects. Clearly express what you've accomplished and any challenges you've encountered. Completing the entire assignment would be great, of course!
- User interface aesthetics, code quality, correctness, performance, etc are all very important aspects of good software, but try to get all the basic building blocks end-to-end up and running first. De-risk the complicated parts of the project first, add the fun stuff later.
- **Keep things simple.** Don’t over-engineer your architecture, and especially not the backend. Use the absolute minimum amount of technology you need to get to a solution. We get impressed when we see simple and concise solutions that one can grasp quickly.
- Think about where to put your configuration, domain logic, rendering logic etc. Put it in the backend or in the frontend app? Are there obvious ways to prevent duplication of logic or configuration?
- If you want to change the dimensions of the robotic crane, what needs to change? Can we use a single definition/configuration? What if we want to constrain the ranges of motions? Add another degree of freedom? Have multiple robots work together? Is your architecture easy to extend?

The goal is to show off your skills and we really hope it’s a fun project to work on!

## Crane topology

Our 4-DOF crane contains 4 different axes together with a gripper. In topological order:

1. A rotary swing joint at the base of the crane rotating the entire column plus arm around a central axis.
2. A linear lift joint moving the arm up and down along the column using a belt drive connected to counter weight on the back. (Counter weight not depicted below)
3. A rotary elbow joint more or less midway the arm.
4. A rotary wrist joint at the lower arm connected to our wrist extension. This fixed extension allows for building lower to the ground.
5. The gripper end-effector is fixed to the wrist extension and has a fixed jaw plus movable jaw. The jaw can move in and out for gripping purposes.
