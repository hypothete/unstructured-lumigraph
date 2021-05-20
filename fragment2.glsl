precision highp float;
precision highp int;

#define CAMERA_COUNT 13

struct Camera {
  vec3 position;
  vec3 color;
};

uniform Camera cameras[CAMERA_COUNT];

void main() {

  vec3 color = vec3(0.0, 0.0, 0.0);

  float shortestLength = 1000.0;
  Camera nearestCamera;

  for(int i = 0; i < CAMERA_COUNT; i++) {
    Camera c = cameras[i];
    float distToCamera = length(c.position - vPos);
    if (distToCamera < shortestLength) {
      shortestLength = distToCamera;
      nearestCamera = c;
    }
  }

  color = nearestCamera.color;

  gl_FragColor = vec4(color, 0.5);
}