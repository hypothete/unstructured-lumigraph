precision highp float;
precision highp int;

#define CAMERA_COUNT 13
#define CLOSEST_K 4

struct Camera {
  vec3 position;
  vec3 zDirection;
  vec3 color;
};

uniform Camera cameras[CAMERA_COUNT];

out float cameraWeights[CAMERA_COUNT];

float angDiff((Camera c)) {
  vec4 zMainCamera = modelMatrix * vec4(0.0, 0.0, 1.0, 0.0);
  zMainCamera = normalize(zMainCamera);
  return acos(dot(zMainCamera, c.zDirection));
}

float angBlend(Camera c) {
  return max(0, 1.0 - (angDiff(c) / ANG_THRESH));
}

// how are we getting p for the vertex?
float resDiff(Camera c, Vector3 p) {
  return max(0.0, length(p, c.position) - length(p, cameraPosition));
}

void main() {

  // calculate angle weights to each camera
  float cameraAngBlends[CAMERA_COUNT];
  float sortedAngBlends[CAMERA_COUNT];
  float sumKAngBlends = 0.0;
  float normalizedAngBlends[CLOSEST_K];

  for(int i = 0; i <  CAMERA_COUNT; i++) {
    Camera c = cameras[i];
    cameraAngBlends[i] = angBlend(c);
    sumAngBlends += cameraAngBlends[i];
  }

  for(int i = 0; i <  CAMERA_COUNT; i++) {
    normalizedAngBlends[i] = cameraAngBlends[i] / sumAngBlends;
  }

  // calculate distance weights to each camera


  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}