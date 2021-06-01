precision highp float;
precision highp int;
precision highp sampler2DArray;

struct Camera {
  vec3 position;
  vec3 color;
  mat4 matrix;
};

uniform Camera cameras[CAMERA_COUNT];
uniform sampler2DArray images;
uniform int mode;

in float cameraWeights[CAMERA_COUNT];
in vec2 projectedCoords[CAMERA_COUNT];
in vec3 nrm;

void main() {

  vec3 color = vec3(0.0, 0.0, 0.0);

  if (mode == 0) {
    // show blended lumigraph
    float totalWeight = 0.0;
    for(int i = 0; i < CAMERA_COUNT; i++) {
      Camera c = cameras[i];
      vec4 texColor = texture(images, vec3(fract(
        vec2(1.0 - projectedCoords[i].x,
        projectedCoords[i].y)
        ), float(i)));
      color += cameraWeights[i] * texColor.rgb;
      totalWeight += cameraWeights[i];
    }
    color /= totalWeight;

  } else if (mode == 1) {
    // show blending field
    float totalWeight = 0.0;
    for(int i = 0; i < CAMERA_COUNT; i++) {
      Camera c = cameras[i];
      color += cameraWeights[i] * c.color;
      totalWeight += cameraWeights[i];
    }
    color /= totalWeight;
  } else {
    color = nrm;
  }

  gl_FragColor = vec4(color, 1.0);
}