# Unstructured Lumigraph Renderer

[Try the demo on Github Pages](https://hypothete.github.io/unstructured-lumigraph/)

## Background

This web app is an implementation of the techniques described in the paper "Unstructured Lumigraph Rendering," by Buehler et al (2001). I completed this work as my final project for CS410/510 Computational Photography with Dr. Feng Liu in Spring 2021.

## Starting the app

Start a local server in the project's main directory. I prefer to do this with yarn, and have a script set up in package.json to make this easy:

```shell
yarn && yarn start
```

This will start a server at localhost:8080.

## Instructions for use

### Controls

You can use a mouse to pan and rotate around the scene. Right clicking and dragging pans the camera, while left clicking and dragging rotates around the camera's target point. The scroll wheel adjusts the camera's distance from the target point.

Tapping the C key toggles visibility of camera frustums in the scene. You can see how the cameras are positioned, and where they are pointed.

Tapping M rotates the proxy's shader through 3 modes: lumigraph rendering, rendering the blending field, and rendering the proxy's surface normals.

### Datasets

Four datasets are provided as part of the lumigraph code: cube, kettle, statue, and TV. I captured the photos for cube and kettle, and for the cube I recovered the proxy geometry using [COLMAP](https://colmap.github.io/index.html). Both datasets get their camera poses from COLMAP.

The images for the statue come from [ETH3D](https://www.eth3d.net/datasets). I used COLMAP to estimate camera poses.

The TV dataset was made from the [Retro TV model](https://www.turbosquid.com/3d-models/free-c4d-model-retro-tv/815392) by Heat 3D on Turbosquid. I used Blender to create a scene with the TV and 25 cameras, and exported raytraced images of the scene along with a proxy model and camera pose data. The Blender file is available in the dataset's folder.
