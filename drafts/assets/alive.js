(function () {
  var root = document.documentElement;
  window.AliveReady = true;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-alive]'));
  var fail = function (el) { el.classList.add('alive-fail'); el.classList.remove('is-alive'); };
  if (reduce || !targets.length) { root.classList.remove('alive-on'); return; }

  var clamp = window.Motion.clamp;
  var MAX_SEGMENTS = 8;
  var VERTEX_SHADER = 'attribute vec2 aPos; varying vec2 vUv; void main () { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';
  var FRAGMENT_SHADER = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform sampler2D uPart;',
    'uniform sampler2D uBg;',
    'uniform float uHasBg;',
    'uniform vec4 uBox;',
    'uniform vec2 uPixel;',
    'uniform float uAspect;',
    'uniform vec4 uBody;',
    'uniform vec4 uBodyScale;',
    'uniform vec4 uSegEnds[' + MAX_SEGMENTS + '];',
    'uniform vec4 uSegShape[' + MAX_SEGMENTS + '];',
    'uniform vec4 uSegPivot[' + MAX_SEGMENTS + '];',
    'uniform vec4 uEyeBox[2];',
    'uniform vec4 uEyeState[2];',
    'uniform vec4 uEyeLid[2];',
    'uniform vec4 uEyeShape[2];',
    'uniform vec4 uPartBox;',
    'uniform vec4 uPartArm;',
    'uniform vec4 uPartHinge;',
    'uniform vec2 uPartOffset;',
    'vec2 rotateCosSin (vec2 point, vec2 pivot, float cosA, float sinA) {',
    '  vec2 d = (point - pivot) * vec2(uAspect, 1.0);',
    '  d = vec2(d.x * cosA - d.y * sinA, d.x * sinA + d.y * cosA);',
    '  return pivot + d / vec2(uAspect, 1.0);',
    '}',
    'vec2 rotateBy (vec2 point, vec2 pivot, float angle) { return rotateCosSin(point, pivot, cos(angle), sin(angle)); }',
    'float segmentDistance (vec2 point, vec2 a, vec2 b) {',
    '  vec2 pa = (point - a) * vec2(uAspect, 1.0), ba = (b - a) * vec2(uAspect, 1.0);',
    '  float along = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);',
    '  return length(pa - ba * along);',
    '}',
    'float inside (vec2 uv) { vec2 e = step(vec2(0.0), uv) * step(uv, vec2(1.0)); return e.x * e.y; }',
    'void main () {',
    '  vec2 anchor = uBody.xy;',
    '  vec2 point = uBox.xy + vUv * uBox.zw;',
    '  vec2 boxUv = point;',
    '  point = rotateBy(point, anchor, -uBodyScale.w);',
    '  point = anchor + (point - anchor) / max(uBodyScale.z, 0.0001);',
    '  float height = clamp((point.y - anchor.y) / (1.0 - anchor.y), 0.0, 1.0);',
    '  vec2 rest = point;',
    '  rest.x -= uBody.z * pow(height, 1.35);',
    '  if (point.y > anchor.y) rest.y = anchor.y + (point.y - anchor.y) / uBodyScale.y;',
    '  rest.x = anchor.x + (rest.x - anchor.x) / mix(1.0, uBodyScale.x, height);',
    '  vec2 shift = vec2(0.0);',
    '  float covered = 0.0;',
    '  for (int i = 0; i < ' + MAX_SEGMENTS + '; i++) {',
    '    vec4 ends = uSegEnds[i]; vec4 shape = uSegShape[i]; vec4 pivot = uSegPivot[i];',
    '    if (shape.y < 0.0) covered = 0.0;',
    '    float weight = 1.0 - smoothstep(shape.x, shape.x + abs(shape.y), segmentDistance(rest, ends.xy, ends.zw));',
    '    float added = weight * (1.0 - covered);',
    '    covered += added;',
    '    if (added > 0.0) shift += (rotateCosSin(rest - pivot.zw, pivot.xy, shape.z, -shape.w) - rest) * added;',
    '  }',
    '  vec2 sampleUv = rest + shift;',
    '  for (int i = 0; i < 2; i++) {',
    '    vec4 eye = uEyeBox[i]; vec4 state = uEyeState[i]; vec4 eyeShape = uEyeShape[i];',
    '    if (state.w > 0.5) {',
    '      float spread = length((sampleUv - eye.xy) / eye.zw);',
    '      sampleUv -= state.yz * eye.zw * (1.0 - smoothstep(eyeShape.x, eyeShape.y, spread));',
    '    }',
    '  }',
    '  vec4 color = texture2D(uTex, sampleUv) * inside(sampleUv);',
    '  for (int i = 0; i < 2; i++) {',
    '    vec4 eye = uEyeBox[i]; vec4 state = uEyeState[i]; vec4 lid = uEyeLid[i]; vec4 eyeShape = uEyeShape[i];',
    '    if (state.w > 0.5 && state.x > 0.001) {',
    '      vec2 local = (sampleUv - eye.xy) / (eye.zw * lid.w);',
    '      float edge = uPixel.y / (eye.w * lid.w);',
    '      float blink = state.x;',
    '      float topLid = mix(1.3, -0.12, blink) + eyeShape.w * local.x * local.x * blink;',
    '      float bottomLid = mix(-1.3, -0.12, blink);',
    '      float inEye = 1.0 - smoothstep(1.0, 1.0 + edge * 2.0, length(local));',
    '      float covers = max(smoothstep(topLid - edge, topLid + edge, local.y), 1.0 - smoothstep(bottomLid - edge, bottomLid + edge, local.y)) * inEye;',
    '      color = mix(color, vec4(lid.rgb, 1.0), covers);',
    '      float halfWidth = sqrt(max(0.0, 1.0 - topLid * topLid));',
    '      float lash = (1.0 - smoothstep(eyeShape.z, eyeShape.z + edge * 1.5, abs(local.y - topLid))) * (1.0 - smoothstep(halfWidth, halfWidth + edge * 2.0, abs(local.x))) * smoothstep(0.05, 0.35, blink);',
    '      color = mix(color, vec4(0.09, 0.08, 0.08, 1.0), lash);',
    '    }',
    '  }',
    '  if (uPartArm.w > 0.5) {',
    '    vec2 partPoint = rotateBy(rest - uPartOffset, uPartArm.xy, -uPartArm.z);',
    '    partPoint = rotateBy(partPoint, uPartHinge.xy, -uPartHinge.z);',
    '    vec2 partUv = (partPoint - uPartBox.xy) / (uPartBox.zw - uPartBox.xy);',
    '    vec4 partColor = texture2D(uPart, partUv) * inside(partUv);',
    '    color = partColor + color * (1.0 - partColor.a);',
    '  }',
    '  if (uHasBg > 0.5) {',
    '    vec4 bg = texture2D(uBg, boxUv) * inside(boxUv);',
    '    float feather = smoothstep(0.0, 0.08, boxUv.x) * smoothstep(0.0, 0.08, 1.0 - boxUv.x) * smoothstep(0.0, 0.06, boxUv.y) * smoothstep(0.0, 0.06, 1.0 - boxUv.y);',
    '    color = color + bg * feather * (1.0 - color.a);',
    '  }',
    '  gl_FragColor = color;',
    '}'
  ].join('\n');

  var easeOut = function (progress) { return 1 - Math.pow(1 - clamp(progress, 0, 1), 3); };
  var easeIn = function (progress) { progress = clamp(progress, 0, 1); return progress * progress; };
  var backOut = function (progress) { var p = clamp(progress, 0, 1) - 1; return 1 + 2.4 * p * p * p + 1.4 * p * p; };

  var RIGS = {
    otter: {
      pad: [0.24, 0.1, 0.14, 0.02],
      anchor: [0.56, 0.035],
      sway: 0.012, breathe: 0.011, phase: 0.6,
      head: [0.46, 0.7],
      probe: [0.62, 0.35],
      eyes: [
        { center: [0.4219, 0.7146], radius: [0.0117, 0.0097], lidColor: [0.627, 0.561, 0.518], lidScale: 1.24, lookRange: [1.3, 2.0], lookAmount: 0.3, lineWidth: 0.2, curve: 0.3 },
        { center: [0.55, 0.7355], radius: [0.0117, 0.0092], lidColor: [0.627, 0.561, 0.518], lidScale: 1.24, lookRange: [1.3, 2.0], lookAmount: 0.3, lineWidth: 0.2, curve: 0.3 }
      ],
      bones: [
        { id: 'arm', pivot: [0.655, 0.565], segments: [[0.66, 0.585, 0.712, 0.785, 0.026, 0.022], [0.7, 0.842, 0.925, 0.872, 0.078, 0.032]] },
        { id: 'head', pivot: [0.47, 0.6], segments: [[0.45, 0.66, 0.46, 0.745, 0.1, 0.03]] },
        { id: 'tail', pivot: [0.33, 0.11], segments: [[0.3, 0.105, 0.04, 0.072, 0.028, 0.02]] },
        { id: 'film', pivot: [0.275, 0.325], segments: [[0.27, 0.31, 0.2, 0.21, 0.024, 0.015]] },
        { id: 'whisker', pivot: [0.61, 0.72], segments: [[0.615, 0.72, 0.68, 0.725, 0.012, 0.012]] },
        { id: 'scarf', pivot: [0.55, 0.55], segments: [[0.55, 0.545, 0.56, 0.48, 0.03, 0.015]] }
      ],
      part: {
        box: [0.62, 0.875, 0.91, 1.0],
        size: [512, 256],
        keep: [[0.712, 0.889], [0.75, 0.9015], [0.8, 0.918], [0.895, 0.95], [0.903, 0.975], [0.885, 1.002], [0.865, 1.002], [0.645, 0.912], [0.628, 0.899], [0.63, 0.8895], [0.704, 0.881]],
        cut: [[0.712, 0.889], [0.75, 0.9015], [0.8, 0.918], [0.895, 0.95], [0.903, 0.975], [0.885, 1.002], [0.865, 1.002], [0.645, 0.912], [0.628, 0.899], [0.63, 0.8945], [0.704, 0.8862]],
        hinge: [0.646, 0.893],
        bone: 'arm'
      },
      update: function (state, time) {
        state.angle.arm = 0.04 * Math.sin(time * 1.9) + state.jolt * 0.045;
        state.angle.head = 0.03 * Math.sin(time * 1.05) - state.lookX * 0.05;
        state.offset.head = [state.lookX * 0.004, 0.003 * Math.sin(time * 2.1) - state.lookY * 0.003];
        state.angle.tail = 0.08 * Math.sin(time * 2.6);
        state.angle.film = 0.09 * Math.sin(time * 1.7 + 1);
        state.angle.whisker = 0.06 * Math.sin(time * 4.3);
        state.angle.scarf = 0.05 * Math.sin(time * 2.3 + 0.5);
        if (time > state.nextClap) {
          state.clapStart = time;
          state.nextClap = time + 3.8 + Math.random() * 2.8;
          state.snapped = false;
        }
        var sinceClap = time - state.clapStart, clapAngle = 0;
        if (sinceClap < 0.22) clapAngle = 0.16 * easeOut(sinceClap / 0.22);
        else if (sinceClap < 0.29) clapAngle = 0.16 - 0.43 * easeIn((sinceClap - 0.22) / 0.07);
        else if (sinceClap < 0.4) clapAngle = -0.27;
        else if (sinceClap < 0.8) clapAngle = -0.27 * (1 - backOut((sinceClap - 0.4) / 0.4));
        if (sinceClap >= 0.29 && !state.snapped) {
          state.snapped = true;
          state.joltV -= 7;
          state.wobbleV += 0.9;
        }
        state.clap = clapAngle;
      }
    },
    bison: {
      pad: [0.16, 0.08, 0.16, 0.02],
      anchor: [0.5, 0.27],
      sway: 0.01, breathe: 0.012, phase: 0,
      head: [0.5, 0.78],
      probe: [0.5, 0.45],
      eyes: [],
      bones: [
        { id: 'armL', pivot: [0.255, 0.7], segments: [[0.24, 0.715, 0.065, 0.855, 0.058, 0.03]] },
        { id: 'armR', pivot: [0.745, 0.7], segments: [[0.76, 0.715, 0.935, 0.855, 0.058, 0.03]] },
        { id: 'head', pivot: [0.5, 0.62], segments: [[0.5, 0.7, 0.5, 0.9, 0.19, 0.03]] },
        { id: 'tail', pivot: [0.265, 0.345], segments: [[0.25, 0.35, 0.13, 0.405, 0.04, 0.02]] }
      ],
      update: function (state, time) {
        state.angle.armL = 0.075 * Math.sin(time * 2.2) + state.cheer * 0.12;
        state.angle.armR = -0.075 * Math.sin(time * 2.2 + 1.2) - state.cheer * 0.12;
        state.angle.head = 0.035 * Math.sin(time * 1.15) - state.lookX * 0.05;
        state.offset.head = [state.lookX * 0.006, 0.004 * Math.sin(time * 2.3) - state.lookY * 0.004];
        state.angle.tail = 0.13 * Math.sin(time * 3.4);
      }
    },
    scenebison: {
      pad: [0, 0, 0, 0],
      anchor: [0.5, 0.135],
      sway: 0.014, breathe: 0.014, phase: 2.4,
      head: [0.45, 0.68],
      probe: [0.5, 0.35],
      noPop: true,
      bg: '.intro-live-bg',
      eyes: [
        { center: [0.4814, 0.6811], radius: [0.0165, 0.012], lidColor: [0.965, 0.616, 0.188], lidScale: 1.3, lookRange: [1.3, 2.0], lookAmount: 0.3, lineWidth: 0.24, curve: 0.3 },
        { center: [0.2708, 0.7094], radius: [0.012, 0.0096], lidColor: [0.965, 0.616, 0.188], lidScale: 1.3, lookRange: [1.3, 2.0], lookAmount: 0.3, lineWidth: 0.24, curve: 0.3 }
      ],
      bones: [
        { id: 'head', pivot: [0.5, 0.47], segments: [[0.48, 0.6, 0.48, 0.8, 0.24, 0.05]] },
        { id: 'book', pivot: [0.42, 0.33], segments: [[0.27, 0.4, 0.52, 0.38, 0.07, 0.03]] },
        { id: 'tail', pivot: [0.7, 0.255], segments: [[0.72, 0.235, 0.86, 0.275, 0.045, 0.02]] }
      ],
      update: function (state, time) {
        state.angle.head = 0.05 * Math.sin(time * 1.3) - state.lookX * 0.06;
        state.offset.head = [state.lookX * 0.008, 0.01 * Math.sin(time * 2.6) - state.lookY * 0.006];
        state.angle.book = 0.06 * Math.sin(time * 1.3 + 0.8) + state.cheer * 0.12;
        state.offset.book = [0, 0.008 * Math.sin(time * 2.6 + 0.5)];
        state.angle.tail = 0.18 * Math.sin(time * 3.2);
      }
    },
    robot: {
      pad: [0.12, 0.1, 0.2, 0.02],
      anchor: [0.5, 0.03],
      sway: 0.008, breathe: 0.009, phase: 1.7,
      head: [0.52, 0.78],
      probe: [0.55, 0.45],
      eyes: [
        { center: [0.5204, 0.7831], radius: [0.0575, 0.0341], lidColor: [0.63, 0.65, 0.72], lidScale: 0.97, lookRange: [0.42, 0.8], lookAmount: 0.26, lineWidth: 0.07, curve: 0 }
      ],
      bones: [
        { id: 'antenna', pivot: [0.594, 0.905], segments: [[0.6, 0.915, 0.636, 0.982, 0.02, 0.012]] },
        { id: 'hand', pivot: [0.8, 0.61], segments: [[0.81, 0.625, 0.855, 0.7, 0.016, 0.014], [0.86, 0.72, 0.87, 0.79, 0.058, 0.025]] }
      ],
      update: function (state, time) {
        state.angle.antenna = 0.11 * Math.sin(time * 3.0) - state.wobble * 0.25 - state.squash * 0.08;
        state.angle.hand = 0.13 * Math.sin(time * 3.6) + state.cheer * 0.2;
        state.bob = 0.007 * Math.sin(time * 3.0);
      }
    }
  };

  var UNIFORMS = ['uTex', 'uPart', 'uBg', 'uHasBg', 'uBox', 'uPixel', 'uAspect', 'uBody', 'uBodyScale', 'uSegEnds', 'uSegShape', 'uSegPivot', 'uEyeBox', 'uEyeState', 'uEyeLid', 'uEyeShape', 'uPartBox', 'uPartArm', 'uPartHinge', 'uPartOffset'];

  var uploadTexture = function (gl, source) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  var tracePolygon = function (ctx, points, width, height, box) {
    ctx.beginPath();
    points.forEach(function (point, i) {
      var x = box ? (point[0] - box[0]) / (box[2] - box[0]) * width : point[0] * width;
      var y = box ? (1 - (point[1] - box[1]) / (box[3] - box[1])) * height : (1 - point[1]) * height;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath();
  };

  var makeCanvas = function (width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };

  var pointer = { x: -1, y: -1, vx: 0, time: 0, inside: false };
  window.addEventListener('pointermove', function (e) {
    var now = performance.now();
    pointer.vx = pointer.x < 0 ? 0 : (e.clientX - pointer.x) / Math.max(1, now - pointer.time);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.time = now;
    pointer.inside = true;
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.inside = false; });

  var actors = [];

  var resize = function (actor) {
    if (actor.sizeAge > 0) { actor.sizeAge--; return; }
    actor.sizeAge = 20;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = Math.max(2, Math.round(actor.canvas.clientWidth * dpr));
    var height = Math.max(2, Math.round(actor.canvas.clientHeight * dpr));
    if (actor.canvas.width !== width || actor.canvas.height !== height) {
      actor.canvas.width = width;
      actor.canvas.height = height;
      actor.gl.viewport(0, 0, width, height);
    }
  };

  var stepSpring = function (state, key, velocityKey, stiffness, damping, dt) {
    state[velocityKey] += (-stiffness * state[key] - damping * state[velocityKey]) * dt;
    state[key] += state[velocityKey] * dt;
  };

  var isOverActor = function (actor, x, y) {
    var rect = actor.rect;
    var u = (x - rect.left) / rect.width, v = (y - rect.top) / rect.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) return false;
    var col = Math.min(actor.alphaW - 1, Math.floor(u * actor.alphaW));
    var row = Math.min(actor.alphaH - 1, Math.floor(v * actor.alphaH));
    return actor.alpha[(row * actor.alphaW + col) * 4 + 3] > 100;
  };

  var blinkCurve = function (since) {
    if (since < 0) return 0;
    if (since < 0.06) return since / 0.06;
    if (since < 0.1) return 1;
    if (since < 0.19) return 1 - (since - 0.1) / 0.09;
    return 0;
  };

  var update = function (actor, time, dt) {
    var state = actor.state, rig = actor.rig;
    if (actor.rectAge++ > 5) { actor.rect = actor.el.getBoundingClientRect(); actor.rectAge = 0; }
    var rect = actor.rect;
    if (fine && pointer.inside && pointer.x >= 0) {
      var headX = rect.left + rig.head[0] * rect.width, headY = rect.top + (1 - rig.head[1]) * rect.height;
      state.targetLookX = clamp((pointer.x - headX) / (rect.width * 1.6), -1, 1);
      state.targetLookY = clamp(-(pointer.y - headY) / (rect.height * 0.9), -1, 1);
    } else {
      state.targetLookX = Math.sin(time * 0.37 + rig.phase) * 0.6;
      state.targetLookY = Math.sin(time * 0.23 + rig.phase * 2) * 0.35;
    }
    var follow = 1 - Math.exp(-dt * 6);
    state.lookX += (state.targetLookX - state.lookX) * follow;
    state.lookY += (state.targetLookY - state.lookY) * follow;
    var movedRecently = performance.now() - pointer.time < 80;
    if (fine && pointer.inside && movedRecently && Math.abs(pointer.vx) > 0.35 && time - state.lastPoke > 0.3 && isOverActor(actor, pointer.x, pointer.y)) {
      state.lastPoke = time;
      state.wobbleV += clamp(pointer.vx * 1.4, -2.4, 2.4);
    }
    stepSpring(state, 'wobble', 'wobbleV', 48, 2.6, dt);
    stepSpring(state, 'squash', 'squashV', 130, 5.5, dt);
    stepSpring(state, 'jolt', 'joltV', 260, 9, dt);
    stepSpring(state, 'cheer', 'cheerV', 40, 5, dt);
    state.bob = 0;
    rig.update(state, time);
    if (rig.eyes.length) {
      if (time > state.nextBlink) {
        state.blinkStart = time;
        state.blinkTwice = Math.random() < 0.22;
        state.nextBlink = time + 2.2 + Math.random() * 3.6;
      }
      var sinceBlink = time - state.blinkStart;
      state.blink = Math.max(blinkCurve(sinceBlink), state.blinkTwice ? blinkCurve(sinceBlink - 0.24) : 0);
    }
  };

  var render = function (actor, time, still) {
    var gl = actor.gl, uniform = actor.uniform, rig = actor.rig, state = actor.state, pad = rig.pad;
    resize(actor);
    var boxW = 1 + pad[0] + pad[2], boxH = 1 + pad[1] + pad[3];
    gl.uniform4f(uniform.uBox, -pad[0], -pad[3], boxW, boxH);
    gl.uniform2f(uniform.uPixel, boxW / actor.canvas.width, boxH / actor.canvas.height);
    gl.uniform1f(uniform.uAspect, actor.aspect);
    var pop = 1, popTilt = 0;
    if (!still && !rig.noPop) {
      if (actor.popStart < 0) pop = 0;
      else {
        var sincePop = time - actor.popStart;
        pop = sincePop <= 0 ? 0 : Math.max(0, 1 - Math.exp(-7 * sincePop) * Math.cos(12 * sincePop));
        popTilt = sincePop <= 0 ? 0.13 : 0.13 * Math.exp(-6 * sincePop) * Math.cos(10 * sincePop);
      }
    }
    var breath = still ? 0 : Math.sin(time * 1.7 + rig.phase);
    var sway = still ? 0 : rig.sway * Math.sin(time * 0.9 + rig.phase) + state.wobble * 0.05;
    var scaleY = 1 + (still ? 0 : rig.breathe * breath + state.squash * 0.25 + state.bob);
    var scaleX = 1 - (still ? 0 : rig.breathe * 0.6 * breath + state.squash * 0.16);
    gl.uniform4f(uniform.uBody, rig.anchor[0], rig.anchor[1], sway, 0);
    gl.uniform4f(uniform.uBodyScale, scaleX, scaleY, Math.max(pop, 0.0001), popTilt);
    actor.slots.forEach(function (slot) {
      var angle = still ? 0 : (state.angle[slot.id] || 0);
      var offset = still ? null : state.offset[slot.id];
      actor.segShape[slot.index * 4 + 2] = Math.cos(angle);
      actor.segShape[slot.index * 4 + 3] = Math.sin(angle);
      actor.segPivot[slot.index * 4 + 2] = offset ? offset[0] : 0;
      actor.segPivot[slot.index * 4 + 3] = offset ? offset[1] : 0;
    });
    gl.uniform4fv(uniform.uSegEnds, actor.segEnds);
    gl.uniform4fv(uniform.uSegShape, actor.segShape);
    gl.uniform4fv(uniform.uSegPivot, actor.segPivot);
    rig.eyes.forEach(function (eye, i) {
      actor.eyeState[i * 4] = still ? 0 : state.blink;
      actor.eyeState[i * 4 + 1] = still ? 0 : state.lookX * eye.lookAmount;
      actor.eyeState[i * 4 + 2] = still ? 0 : state.lookY * eye.lookAmount;
      actor.eyeState[i * 4 + 3] = 1;
    });
    gl.uniform4fv(uniform.uEyeBox, actor.eyeBox);
    gl.uniform4fv(uniform.uEyeState, actor.eyeState);
    gl.uniform4fv(uniform.uEyeLid, actor.eyeLid);
    gl.uniform4fv(uniform.uEyeShape, actor.eyeShape);
    if (rig.part) {
      var armAngle = still ? 0 : (state.angle[actor.partBone.id] || 0);
      var armOffset = (!still && state.offset[actor.partBone.id]) || [0, 0];
      gl.uniform4f(uniform.uPartBox, rig.part.box[0], rig.part.box[1], rig.part.box[2], rig.part.box[3]);
      gl.uniform4f(uniform.uPartArm, actor.partBone.pivot[0], actor.partBone.pivot[1], armAngle, 1);
      gl.uniform4f(uniform.uPartHinge, rig.part.hinge[0], rig.part.hinge[1], still ? 0 : state.clap, 0);
      gl.uniform2f(uniform.uPartOffset, armOffset[0], armOffset[1]);
    } else {
      gl.uniform4f(uniform.uPartArm, 0, 0, 0, 0);
    }
    gl.uniform1f(uniform.uHasBg, actor.hasBg);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, actor.bgTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, actor.partTexture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, actor.texture);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  var create = function (el) {
    var rig = RIGS[el.dataset.alive];
    var img = el.querySelector('img');
    var canvas = document.createElement('canvas');
    canvas.className = 'alive-cv';
    canvas.setAttribute('aria-hidden', 'true');
    var pad = rig.pad;
    canvas.style.left = (-pad[0] * 100) + '%';
    canvas.style.top = (-pad[1] * 100) + '%';
    canvas.style.width = ((1 + pad[0] + pad[2]) * 100) + '%';
    canvas.style.height = ((1 + pad[1] + pad[3]) * 100) + '%';
    var options = { premultipliedAlpha: true, alpha: true, antialias: false };
    var gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    if (!gl) { fail(el); return; }
    var program = window.Motion.quadProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) { fail(el); return; }
    var uniform = {};
    UNIFORMS.forEach(function (name) { uniform[name] = gl.getUniformLocation(program, name); });

    var actor = {
      el: el, rig: rig, canvas: canvas, gl: gl, uniform: uniform,
      ready: false, visible: false, seen: false, popStart: -1,
      delay: parseFloat(el.dataset.aliveDelay || '0') / 1000,
      aspect: 1, alpha: null, alphaW: 0, alphaH: 0, rect: null, rectAge: 99, sizeAge: 0, last: 0, hasBg: 0,
      partBone: null,
      state: {
        angle: {}, offset: {}, lookX: 0, lookY: 0, targetLookX: 0, targetLookY: 0,
        wobble: 0, wobbleV: 0, squash: 0, squashV: 0, jolt: 0, joltV: 0, cheer: 0, cheerV: 0, bob: 0, blink: 0,
        clap: 0, nextClap: 1.6 + Math.random() * 1.5, clapStart: -9, snapped: true,
        nextBlink: 1 + Math.random() * 2, blinkStart: -9, blinkTwice: false, lastPoke: 0
      }
    };

    actor.segEnds = new Float32Array(MAX_SEGMENTS * 4);
    actor.segShape = new Float32Array(MAX_SEGMENTS * 4);
    actor.segPivot = new Float32Array(MAX_SEGMENTS * 4);
    for (var i = 0; i < MAX_SEGMENTS; i++) actor.segShape.set([-1, 0.0001, 1, 0], i * 4);
    actor.slots = [];
    rig.bones.forEach(function (bone) {
      if (rig.part && bone.id === rig.part.bone) actor.partBone = bone;
      bone.segments.forEach(function (segment, k) {
        var index = actor.slots.length;
        actor.segEnds.set([segment[0], segment[1], segment[2], segment[3]], index * 4);
        actor.segShape.set([segment[4], k === 0 ? -segment[5] : segment[5], 1, 0], index * 4);
        actor.segPivot.set([bone.pivot[0], bone.pivot[1], 0, 0], index * 4);
        actor.slots.push({ index: index, id: bone.id });
      });
    });

    actor.eyeBox = new Float32Array(8);
    actor.eyeState = new Float32Array(8);
    actor.eyeLid = new Float32Array(8);
    actor.eyeShape = new Float32Array(8);
    rig.eyes.forEach(function (eye, k) {
      actor.eyeBox.set([eye.center[0], eye.center[1], eye.radius[0], eye.radius[1]], k * 4);
      actor.eyeLid.set([eye.lidColor[0], eye.lidColor[1], eye.lidColor[2], eye.lidScale], k * 4);
      actor.eyeShape.set([eye.lookRange[0], eye.lookRange[1], eye.lineWidth, eye.curve], k * 4);
    });

    var bgImg = rig.bg ? el.querySelector(rig.bg) : null;

    var build = function () {
      var naturalW = img.naturalWidth, naturalH = img.naturalHeight;
      actor.aspect = naturalW / naturalH;
      var baseCanvas = makeCanvas(1024, 1024);
      var baseCtx = baseCanvas.getContext('2d');
      baseCtx.drawImage(img, 0, 0, 1024, 1024);
      gl.activeTexture(gl.TEXTURE1);
      if (rig.part) {
        baseCtx.globalCompositeOperation = 'destination-out';
        tracePolygon(baseCtx, rig.part.cut, 1024, 1024);
        baseCtx.fill();
        baseCtx.globalCompositeOperation = 'source-over';
        var partBox = rig.part.box, partSize = rig.part.size;
        var partCanvas = makeCanvas(partSize[0], partSize[1]);
        var partCtx = partCanvas.getContext('2d');
        tracePolygon(partCtx, rig.part.keep, partSize[0], partSize[1], partBox);
        partCtx.clip();
        partCtx.drawImage(img, partBox[0] * naturalW, (1 - partBox[3]) * naturalH, (partBox[2] - partBox[0]) * naturalW, (partBox[3] - partBox[1]) * naturalH, 0, 0, partSize[0], partSize[1]);
        actor.partTexture = uploadTexture(gl, partCanvas);
      } else {
        actor.partTexture = uploadTexture(gl, makeCanvas(2, 2));
      }
      gl.activeTexture(gl.TEXTURE2);
      if (bgImg) {
        var bgCanvas = makeCanvas(512, 512);
        bgCanvas.getContext('2d').drawImage(bgImg, 0, 0, 512, 512);
        actor.bgTexture = uploadTexture(gl, bgCanvas);
        actor.hasBg = 1;
      } else {
        actor.bgTexture = uploadTexture(gl, makeCanvas(2, 2));
      }
      gl.activeTexture(gl.TEXTURE0);
      actor.texture = uploadTexture(gl, baseCanvas);
      gl.uniform1i(uniform.uTex, 0);
      gl.uniform1i(uniform.uPart, 1);
      gl.uniform1i(uniform.uBg, 2);
      actor.alphaW = 48;
      actor.alphaH = Math.max(1, Math.round(48 / actor.aspect));
      var hitCanvas = makeCanvas(actor.alphaW, actor.alphaH);
      var hitCtx = hitCanvas.getContext('2d');
      hitCtx.drawImage(img, 0, 0, actor.alphaW, actor.alphaH);
      actor.alpha = hitCtx.getImageData(0, 0, actor.alphaW, actor.alphaH).data;
      el.appendChild(canvas);
      actor.rect = el.getBoundingClientRect();
      resize(actor);
      render(actor, 0, true);
      var probe = new Uint8Array(4);
      var probeX = Math.round((rig.probe[0] + pad[0]) / (1 + pad[0] + pad[2]) * canvas.width);
      var probeY = Math.round((rig.probe[1] + pad[3]) / (1 + pad[1] + pad[3]) * canvas.height);
      gl.readPixels(clamp(probeX, 0, canvas.width - 1), clamp(probeY, 0, canvas.height - 1), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
      if (probe[3] < 8) { canvas.remove(); fail(el); return; }
      actor.ready = true;
      el.classList.add('is-alive');
      render(actor, 0, false);
    };

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      actor.ready = false;
      canvas.remove();
      fail(el);
    });

    var tries = 0;
    var start = function () {
      if (el.clientWidth < 4 && tries++ < 40) { setTimeout(start, 250); return; }
      try { build(); } catch (err) { console.error(err); canvas.remove(); fail(el); }
    };
    var images = bgImg ? [img, bgImg] : [img];
    var pending = 0;
    var loaded = function () { pending--; if (pending === 0) start(); };
    images.forEach(function (image) {
      if (image.complete && image.naturalWidth) return;
      pending++;
      image.addEventListener('load', loaded, { once: true });
      image.addEventListener('error', function () { fail(el); }, { once: true });
    });
    if (pending === 0) start();

    new IntersectionObserver(function (entries) {
      actor.visible = entries[0].isIntersecting;
      if (actor.visible && img.loading === 'lazy' && !img.complete) img.loading = 'eager';
    }, { rootMargin: '120px 0px' }).observe(el);
    new IntersectionObserver(function (entries, observer) {
      if (!entries[0].isIntersecting) return;
      actor.seen = true;
      observer.disconnect();
    }, { threshold: 0.3 }).observe(el);

    actors.push(actor);
  };

  var clockStart = performance.now();
  var loop = function (now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    var time = (now - clockStart) / 1000;
    actors.forEach(function (actor) {
      if (!actor.ready || !actor.visible) { actor.last = time; return; }
      if (actor.popStart < 0 && actor.seen) actor.popStart = time + actor.delay;
      var dt = clamp(time - (actor.last || time), 0, 0.05);
      actor.last = time;
      update(actor, time, dt);
      render(actor, time, false);
    });
  };

  window.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button, input, select, textarea, label, [role="dialog"]')) return;
    actors.forEach(function (actor) {
      if (!actor.ready || !actor.visible) return;
      actor.rect = actor.el.getBoundingClientRect();
      if (!isOverActor(actor, e.clientX, e.clientY)) return;
      var state = actor.state;
      state.squashV -= 2.6;
      state.wobbleV += (Math.random() < 0.5 ? -1 : 1) * 1.4;
      state.cheerV += 6;
      if (actor.rig.part) state.nextClap = 0;
      if (actor.rig.eyes.length) state.nextBlink = 0;
    });
  }, { passive: true });

  targets.forEach(function (el) {
    try { create(el); } catch (err) { console.error(err); fail(el); }
  });
  requestAnimationFrame(loop);
})();
