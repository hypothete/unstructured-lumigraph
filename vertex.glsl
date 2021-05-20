out vec3 nrm;

void main() {
  nrm = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}