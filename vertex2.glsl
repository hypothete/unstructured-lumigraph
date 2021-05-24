precision highp float;
precision highp int;

#define CAMERA_COUNT 13
#define CLOSEST_K 4

struct Camera {
  vec3 position;
  vec3 zDirection;
  vec3 color;
  float aspect;
  float fov;
};

uniform Camera cameras[CAMERA_COUNT];

out float cameraWeights[CAMERA_COUNT];

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
  return max(0.0, length(worldPos.xyz - c.position) - length(worldPos.xyz - cameraPosition));
}

float angResDiff(Camera c, float resWeight) {
  return (1.0 - resWeight) * angDiff(c) + resWeight * resDiff(c);
}

float angResBlend(Camera c, float resWeight, float angResThresh) {
  return max(0.0, 1.0 - (angResDiff(c, resWeight) / angResThresh));
}

float fovBlend(Camera c) {
  // TODO - should drop off as we approach edge of image
  return 1.0;
}

float angResFovBlend(Camera c, float resWeight, float angResThresh) {
  return angResBlend(c, resWeight, angResThresh) * fovBlend(c);
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
    cameraWeights[i] = nrmAngBlends[i];
  }


  // // calculate resDiffs
  // float resDiffs[CAMERA_COUNT];
  // float sortedResDiffs[CAMERA_COUNT];
  // for(int i = 0; i < CAMERA_COUNT; i++) {
  //   resDiffs[i] = resDiff(cameras[i]);
  //   sortedResDiffs[i] = resDiffs[i];
  // }

  // // sort sortedResDiffs
  // t = 0.0;
  // for (int i = 0; i < CAMERA_COUNT-1; ++i) {
  //   for (int j = i+1; j < CAMERA_COUNT; ++j) {
  //     if (sortedResDiffs[j] < sortedResDiffs[i]) {
  //       t = sortedResDiffs[i];
  //       sortedResDiffs[i] = sortedResDiffs[j];
  //       sortedResDiffs[j] = t;
  //     }
  //   }
  // }

  // // again threshold by the kth highest value
  // float angResThresh = sortedResDiffs[CAMERA_COUNT - CLOSEST_K];
  // float resWeight = 0.5; // TODO tinker with

  // float angResFovBlends[CAMERA_COUNT];
  // float sortedAngResFovBlends[CAMERA_COUNT];
  // for(int i = 0; i < CAMERA_COUNT; i++) {
  //   angResFovBlends[i] = angResFovBlend(cameras[i], resWeight, angResThresh);
  // }

  // t = 0.0;
  // for (int i = 0; i < CAMERA_COUNT-1; ++i) {
  //   for (int j = i+1; j < CAMERA_COUNT; ++j) {
  //     if (sortedAngResFovBlends[j] < sortedAngResFovBlends[i]) {
  //       t = sortedAngResFovBlends[i];
  //       sortedAngResFovBlends[i] = sortedAngResFovBlends[j];
  //       sortedAngResFovBlends[j] = t;
  //     }
  //   }
  // }

  // float sumKAngResFovBlends;
  // for(int i = CAMERA_COUNT - CLOSEST_K; i < CAMERA_COUNT; i++) {
  //   sumKAngResFovBlends += sortedAngResFovBlends[i];
  // }

  // for(int i = 0; i < CAMERA_COUNT; i++) {
  //   cameraWeights[i] = angResFovBlends[i] / sumKAngResFovBlends;
  // }
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}