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
  vec3 mainToPoint = worldPos.xyz - cameraPosition;
  vec3 cToPoint = worldPos.xyz - c.position;
  float lenMain = length(mainToPoint);
  float lenC = length(cToPoint);
  return degrees(acos(dot(mainToPoint, cToPoint) / (lenMain * lenC)));
}

float angBlend(float ang, float angThresh) {
  return max(0.0, 1.0 - (ang / angThresh));
}

float resDiff(Camera c) {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  return max(0.0, length(worldPos.xyz - cameraPosition) - length(worldPos.xyz - c.position));
}

float angResDiff(Camera c) {
  return (1.0 - RES_WEIGHT) * angDiff(c) + RES_WEIGHT * resDiff(c);
}

float angResBlend(Camera c, float angResThresh) {
  return max(0.0, 1.0 - (angResDiff(c) / angResThresh));
}

float fovBlend(Camera c) {
  // TODO: feathering
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 camView = c.matrix * worldPos;
  if (abs(camView.x/camView.w) > 1.0 || abs(camView.y/camView.w) > 1.0 || abs(camView.z/camView.w) > 1.0) {
    return 0.0;
  }
  return 1.0;
}

float angResFovBlend(Camera c, float angResThresh) {
  return angResBlend(c, angResThresh) * fovBlend(c);
}


void main() {
  // get angDiffs for all cameras and also start a sortedAngDiffs array
  float angDiffs[CAMERA_COUNT];
  float sortedAngDiffs[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    angDiffs[i] = angDiff(cameras[i]);
    sortedAngDiffs[i] = angDiffs[i];
  }

  // sort sortedAngDiffs from low to high
  float t;
  for (int i = 0; i < CAMERA_COUNT-1; ++i) {
    for (int j = i+1; j < CAMERA_COUNT; ++j) {
      if (sortedAngDiffs[j] < sortedAngDiffs[i]) {
        t = sortedAngDiffs[i];
        sortedAngDiffs[i] = sortedAngDiffs[j];
        sortedAngDiffs[j] = t;
      }
    }
  }

  // threshold by kth largest angDiff
  float angThresh = sortedAngDiffs[CAMERA_COUNT - CLOSEST_K];

  // calculate angBlends
  float angBlends[CAMERA_COUNT];
  float sortedAngBlends[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    angBlends[i] = angBlend(angDiffs[i], angThresh);
    sortedAngBlends[i] = angBlends[i];
  }

  t = 0.0;
  // sort sortedAngBlends from low to high
  for (int i = 0; i < CAMERA_COUNT-1; ++i) {
    for (int j = i+1; j < CAMERA_COUNT; ++j) {
      if (sortedAngBlends[j] < sortedAngBlends[i]) {
        t = sortedAngBlends[i];
        sortedAngBlends[i] = sortedAngBlends[j];
        sortedAngBlends[j] = t;
      }
    }
  }

  // add highest k weights
  float sumKAngBlends;
  for(int i = CAMERA_COUNT - CLOSEST_K; i < CAMERA_COUNT; i++) {
    sumKAngBlends += sortedAngBlends[i];
  }


  // get normalizedAngBlends for each camera
  float nrmAngBlends[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    nrmAngBlends[i] = angBlends[i] / sumKAngBlends;
    // cameraWeights[i] = nrmAngBlends[i];
  }


  // calculate resDiffs
  float resDiffs[CAMERA_COUNT];
  float sortedResDiffs[CAMERA_COUNT];
  for(int i = 0; i < CAMERA_COUNT; i++) {
    resDiffs[i] = resDiff(cameras[i]);
    sortedResDiffs[i] = resDiffs[i];
  }

  // sort sortedResDiffs
  t = 0.0;
  for (int i = 0; i < CAMERA_COUNT-1; ++i) {
    for (int j = i+1; j < CAMERA_COUNT; ++j) {
      if (sortedResDiffs[j] < sortedResDiffs[i]) {
        t = sortedResDiffs[i];
        sortedResDiffs[i] = sortedResDiffs[j];
        sortedResDiffs[j] = t;
      }
    }
  }

  // again threshold by the kth highest value
  // TODO: problematic when behind cameras?
  float angResThresh = sortedResDiffs[CAMERA_COUNT - CLOSEST_K];

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
    cameraWeights[i] = angResFovBlends[i] / sumKAngResFovBlends;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 camView = cameras[i].matrix * worldPos;
    projectedCoords[i] = 0.5 * camView.xy/camView.w + vec2(0.5);
  }

  nrm = 0.5 + 0.5 * normalize(modelMatrix * vec4(normal, 0.0)).xyz;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}