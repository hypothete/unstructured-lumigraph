precision highp float;
precision highp int;

struct Camera {
  vec3 position;
  vec3 color;
  mat4 matrix;
};

uniform Camera cameras[CAMERA_COUNT];

out float cameraWeights[CAMERA_COUNT];
out vec2 projectedCoords[CAMERA_COUNT];
out vec3 nrm;

float angDiff(Camera c) {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec3 mainToPoint = normalize(worldPos.xyz - cameraPosition);
  vec3 cToPoint = normalize(worldPos.xyz - c.position);
  return degrees(acos(dot(mainToPoint, cToPoint)));
}

float angBlend(float ang, float angThresh) {
  return max(0.0, 1.0 - (ang / angThresh));
}

float resDiff(Camera c) {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  return max(0.0, length(worldPos.xyz - cameraPosition) - length(worldPos.xyz - c.position));
}

float angResDiff(Camera c) {
  return (1.0 - float(RES_WEIGHT)) * angDiff(c) + float(RES_WEIGHT) * resDiff(c);
}

float angResBlend(Camera c, float angResThresh) {
  return max(0.0, 1.0 - (angResDiff(c) / angResThresh));
}

float fovBlend(Camera c) {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 camView = c.matrix * worldPos;
  camView.xyz /= camView.w;
  if (abs(camView.x) > 1.0 || abs(camView.y) > 1.0 || abs(camView.z) > 1.0) {
    return 0.0;
  }

  // feather based on proximity to edge of fov
  vec2 u = camView.xy * 0.5 + 0.5;
  u = u * (1.0 - u);
  return pow(u.x * u.y * 15.0, 0.75);
}

float angResFovBlend(Camera c, float angResThresh) {
  return angResBlend(c, angResThresh) * fovBlend(c);
}


void main() {
  // calculate resDiffs
  float resDiffs[CAMERA_COUNT];
  float sortedResDiffs[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    resDiffs[i] = resDiff(cameras[i]);
    sortedResDiffs[i] = resDiffs[i];
  }

  // sort sortedResDiffs
  float t = 0.0;
  for (int i = 0; i < CAMERA_COUNT-1; ++i) {
    for (int j = i+1; j < CAMERA_COUNT; ++j) {
      if (sortedResDiffs[j] < sortedResDiffs[i]) {
        t = sortedResDiffs[i];
        sortedResDiffs[i] = sortedResDiffs[j];
        sortedResDiffs[j] = t;
      }
    }
  }

  // calculate angResDiffs
  float angResDiffs[CAMERA_COUNT];
  float sortedAngResDiffs[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    angResDiffs[i] = angResDiff(cameras[i]);
    sortedAngResDiffs[i] = resDiffs[i];
  }

  // sort sortedAngResDiffs
  t = 0.0;
  for (int i = 0; i < CAMERA_COUNT-1; ++i) {
    for (int j = i+1; j < CAMERA_COUNT; ++j) {
      if (sortedAngResDiffs[j] < sortedAngResDiffs[i]) {
        t = sortedAngResDiffs[i];
        sortedAngResDiffs[i] = sortedAngResDiffs[j];
        sortedAngResDiffs[j] = t;
      }
    }
  }

  // again threshold by the kth highest value
  float angResThresh = sortedAngResDiffs[CAMERA_COUNT - CLOSEST_K - 1];

  // get angResFovBlends
  float angResFovBlends[CAMERA_COUNT];
  float sortedAngResFovBlends[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    angResFovBlends[i] = angResFovBlend(cameras[i], angResThresh);
    sortedAngResFovBlends[i] = angResFovBlends[i];
  }

  // sort angResFovBlends
  t = 0.0;
  for (int i = 0; i < CAMERA_COUNT-1; ++i) {
    for (int j = i+1; j < CAMERA_COUNT; ++j) {
      if (sortedAngResFovBlends[j] < sortedAngResFovBlends[i]) {
        t = sortedAngResFovBlends[i];
        sortedAngResFovBlends[i] = sortedAngResFovBlends[j];
        sortedAngResFovBlends[j] = t;
      }
    }
  }

  // sum highest k angResFovBlend weights
  float sumKAngResFovBlends;
  for(int i = CAMERA_COUNT - CLOSEST_K; i < CAMERA_COUNT; i++) {
    sumKAngResFovBlends += sortedAngResFovBlends[i];
  }

  // set final camera weights
  for(int i = 0; i < CAMERA_COUNT; i++) {
    cameraWeights[i] = clamp(angResFovBlends[i] / sumKAngResFovBlends, 0.0, 1.0);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 camView = cameras[i].matrix * worldPos;
    projectedCoords[i] = 0.5 * camView.xy/camView.w + vec2(0.5);
  }

  nrm = 0.5 + 0.5 * normalize(modelMatrix * vec4(normal, 0.0)).xyz;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}