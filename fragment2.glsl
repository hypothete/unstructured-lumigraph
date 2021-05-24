precision highp float;
precision highp int;
precision highp sampler2DArray;

#define CAMERA_COUNT 13

struct Camera {
  vec3 position;
  vec3 color;
  mat4 matrix;
};

uniform Camera cameras[CAMERA_COUNT];
uniform sampler2DArray images;

in float cameraWeights[CAMERA_COUNT];

void main() {

  vec3 color = vec3(0.0, 0.0, 0.0);

  for(int i = 0; i < CAMERA_COUNT; i++) {
    Camera c = cameras[i];
    color += cameraWeights[i] * c.color;
  }

  gl_FragColor = vec4(color, 1.0);
}