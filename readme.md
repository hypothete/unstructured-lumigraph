# Unstructured Lumigraph Renderer

## [Click here to view the web app on Github Pages](https://hypothete.github.io/unstructured-lumigraph/)

<img src="./lum-modes.jpg" width="640" alt="3 shader modes of the lumigraph side by side: the rendered output, the camera blending field, and the proxy's normals" />

## Background

A lumigraph is a function that allows a user to synthesize new views of a scene by sampling light rays from multiple camera viewpoints. An "unstructured" lumigraph can synthesize views from a set of cameras in arbitrary (but known) positions and rotations.

This web app is an implementation of the unstructured lumigraph rendering algorithm described in the paper ["Unstructured Lumigraph Rendering," by Buehler et al (2001)](https://groups.csail.mit.edu/graphics/pubs/siggraph2001_ulr.pdf). You can view the original video presentation by the authors [on Youtube](https://www.youtube.com/watch?v=za4HIll9N7c).

I completed this work as my final project for CS410/510 Computational Photography with Dr. Feng Liu at Portland State University, Spring 2021. You can view the slides from my [final presentation](https://docs.google.com/presentation/d/1byQT7v3yyZlvRdjut-qXuMcusRpOWliTGs806qFkE-A/edit?usp=sharing).

## Starting the app

Start a local server in the project's main directory. I prefer to do this with [yarn](https://yarnpkg.com/), and have a script set up in package.json to make this easy:

```shell
yarn && yarn start
```

This will start a server at localhost:8080.

## Usage

### Controls

Use your mouse to pan and rotate around the scene. Right clicking and dragging pans the camera, while left clicking and dragging rotates around the camera's target point. The scroll wheel adjusts the camera's distance from the target point.

Tapping the C key toggles visibility of camera frustums in the scene. You can see how the cameras are positioned, and where they are pointed.

Tapping M rotates the proxy's shader through 3 modes: lumigraph rendering, rendering the blending field, and rendering the proxy's surface normals.

### Datasets

Four datasets are provided as part of the lumigraph code: cube, kettle, statue, and TV. I captured the photos for cube and kettle, and for the cube I recovered the proxy geometry using [COLMAP](https://colmap.github.io/index.html). Both datasets get their camera poses from COLMAP.

The images for the statue come from [ETH3D](https://www.eth3d.net/datasets). I used COLMAP to estimate camera poses.

The TV dataset was made from the [Retro TV model](https://www.turbosquid.com/3d-models/free-c4d-model-retro-tv/815392) by Heat 3D on Turbosquid. I used Blender to create a scene with the TV and 25 cameras, and exported raytraced images of the scene along with a proxy model and camera pose data. The Blender file is available in the dataset's folder.

### Preparing your own dataset

First, set up a folder for your dataset in the `/data` folder of this project. Add an images folder with your source images inside of that.

The app expects two text files, images.txt and cameras.txt to be inside your dataset's folder. If you are using COLMAP, you'll need to export the images and camera data in text format. It's an export option in the main file menu, and you can read more about the format [in the docs](https://colmap.github.io/format.html#text-format).

For Blender, I've included some scripts that I used to create the TV dataset, but I also had to hand-edit the cameras.txt file slightly as well. PRs for more comprehensive Blender export scripts are welsome, this was my first time writing scripts for Blender.

You may need to make edits to app.js to adjust the scaling and coordinate systems of your imported files. Please refer to the existing datasets as a reference for where in the code to make these changes.

Once your dataset is ready, you can view it by changing the query param i nthe URL to the name of the folder you set up. For instance, if you were running the project locally and had a dataset `hallway`, your URL would be `http://localhost:8080?dataset=hallway`.

## Contributing

Issues and pull requests are welcome.

## License information

[MIT](./LICENSE)

## References

Buehler, C., Bosse, M., McMillan, L., Gortler, S., & Cohen, M. (2001). Unstructured lumigraph rendering. In Proceedings of the 28th annual conference on Computer graphics and interactive techniques (pp. 425???432).

Files in the vendor folder are from [Three.js](https://threejs.org)

fovBlend feathering based on [this Shadertoy](https://www.shadertoy.com/view/lsKSWR) by Ippokratis

GLSL bubble sort implementation from [OpenGL Insights](https://github.com/OpenGLInsights/OpenGLInsightsCode)

Citations for COLMAP:

Sch??nberger, J., & Frahm, J.M. (2016). Structure-from-Motion Revisited. In Conference on Computer Vision and Pattern Recognition (CVPR).

Sch??nberger, J., Zheng, E., Pollefeys, M., & Frahm, J.M. (2016). Pixelwise View Selection for Unstructured Multi-View Stereo. In European Conference on Computer Vision (ECCV).

Sch??nberger, J., Price, T., Sattler, T., Frahm, J.M., & Pollefeys, M. (2016). A Vote-and-Verify Strategy for Fast Spatial Verification in Image Retrieval. In Asian Conference on Computer Vision (ACCV).

Inspiration & some structuring of code from [COLIBRI VR](https://caor-mines-paristech.github.io/colibri-vr)

Dinechin, G., & Paljic, A. (2020). From Real to Virtual: An Image-Based Rendering Toolkit to Help Bring the World Around Us Into Virtual Reality. In 2020 IEEE Conference on Virtual Reality and 3D User Interfaces Abstracts and Workshops (VRW).

[ETH3D](https://www.eth3d.net/)

Thomas Sch??ps, Johannes L. Sch??nberger, Silvano Galliani, Torsten Sattler, Konrad Schindler, Marc Pollefeys, & Andreas Geiger (2017). A Multi-View Stereo Benchmark with High-Resolution Images and Multi-Camera Videos. In Conference on Computer Vision and Pattern Recognition (CVPR).
