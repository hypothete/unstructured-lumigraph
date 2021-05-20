precision highp float;
precision highp int;

in vec3 nrm;

void main() {

  gl_FragColor = vec4(nrm, 1.0);
}