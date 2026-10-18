import { iconDataUrl } from "./icons.js";
// Original procedural artwork. Rasterized once, shared by every frame.
export function createArt() {
  const cache = new Map();
  function get(key, draw, size = 192) {
    if (cache.has(key)) return cache.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const c = canvas.getContext("2d");
    c.translate(size / 2, size / 2);
    draw(c);
    cache.set(key, canvas);
    return canvas;
  }
  const ellipse = (c, x, y, rx, ry, color) => {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, 7);
    c.fill();
  };
  function boss(world, phase) {
    return get(`boss:${world}:${phase}`, (c) => {
      c.lineCap = "round";
      c.lineJoin = "round";
      if (world === 0) {
        // Roots, split trunk, branching antlers and moss canopy.
        c.strokeStyle = "#211b18";
        c.lineWidth = 14;
        for (const side of [-1, 1]) {
          c.beginPath();
          c.moveTo(side * 18, 30);
          c.lineTo(side * 45, 62);
          c.lineTo(side * 75, 70);
          c.moveTo(side * 26, -12);
          c.lineTo(side * 55, -47);
          c.lineTo(side * 62, -76);
          c.moveTo(side * 52, -43);
          c.lineTo(side * 81, -50);
          c.moveTo(side * 57, -58);
          c.lineTo(side * 41, -75);
          c.stroke();
          c.strokeStyle = "#756146";
          c.lineWidth = 7;
          c.stroke();
          c.strokeStyle = "#211b18";
          c.lineWidth = 14;
        }
        const g = c.createLinearGradient(-35, 0, 40, 0);
        g.addColorStop(0, "#413426");
        g.addColorStop(0.5, "#8b7452");
        g.addColorStop(1, "#3f3228");
        ellipse(c, 0, 7, 34, 54, g);
        c.strokeStyle = "#30291f";
        c.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.moveTo(-23 + i * 9, -27);
          c.bezierCurveTo(-35 + i * 10, -10, 5 + i * 5, 16, -20 + i * 8, 48);
          c.stroke();
        }
        for (let i = 0; i < 11; i++)
          ellipse(
            c,
            Math.sin(i * 3) * 42,
            -37 + Math.cos(i * 2) * 15,
            19,
            13,
            phase ? "#6d3759" : ["#394e35", "#52683c", "#718447"][i % 3],
          );
        ellipse(c, -12, -6, 7, 4, phase ? "#ff9cdd" : "#d4f68b");
        ellipse(c, 13, -6, 7, 4, phase ? "#ff9cdd" : "#d4f68b");
        c.strokeStyle = "#1e251e";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(-14, 19);
        c.lineTo(0, 14);
        c.lineTo(15, 16);
        c.stroke();
      } else if (world === 1) {
        c.fillStyle = phase ? "#66376f" : "#29464d";
        c.beginPath();
        c.moveTo(-30, -28);
        c.lineTo(-62, 65);
        c.lineTo(0, 51);
        c.lineTo(62, 65);
        c.lineTo(30, -28);
        c.fill();
        c.strokeStyle = "#d0c8a3";
        c.lineWidth = 8;
        for (const side of [-1, 1]) {
          c.beginPath();
          c.moveTo(side * 23, 0);
          c.lineTo(side * 43, 26);
          c.lineTo(side * 57, 0);
          c.moveTo(side * 14, 34);
          c.lineTo(side * 21, 64);
          c.stroke();
        }
        ellipse(c, 0, 6, 27, 37, "#252e32");
        c.strokeStyle = "#d8d0b0";
        c.lineWidth = 5;
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.ellipse(0, -9 + i * 9, 23, 6, 0, 0, Math.PI);
          c.stroke();
        }
        c.fillStyle = "#e4d9b5";
        c.fillRect(-3, -16, 6, 52);
        ellipse(c, 0, -36, 25, 27, "#e8dfbd");
        ellipse(c, -11, -39, 8, 9, "#15272f");
        ellipse(c, 11, -39, 8, 9, "#15272f");
        ellipse(c, -11, -39, 3, 4, phase ? "#f191eb" : "#74e7d3");
        ellipse(c, 11, -39, 3, 4, phase ? "#f191eb" : "#74e7d3");
        c.fillStyle = "#524d40";
        for (let i = 0; i < 5; i++) c.fillRect(-13 + i * 6, -20, 3, 8);
        c.fillStyle = "#c59a4d";
        c.strokeStyle = "#ffe6a3";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-25, -58);
        c.lineTo(-31, -80);
        c.lineTo(-13, -69);
        c.lineTo(0, -88);
        c.lineTo(13, -69);
        c.lineTo(31, -80);
        c.lineTo(25, -58);
        c.closePath();
        c.fill();
        c.stroke();
        ellipse(c, 0, -69, 4, 5, "#7ed9d0");
      } else {
        for (const side of [-1, 1]) {
          c.fillStyle = phase ? "#d85032" : "#7c2934";
          c.strokeStyle = "#301826";
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(side * 23, -20);
          c.lineTo(side * 76, -56);
          c.lineTo(side * 84, 39);
          c.lineTo(side * 47, 17);
          c.lineTo(side * 35, 51);
          c.closePath();
          c.fill();
          c.stroke();
          c.strokeStyle = "#ed8a4b";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(side * 30, -12);
          c.lineTo(side * 76, -48);
          c.lineTo(side * 49, 18);
          c.stroke();
        }
        const g = c.createLinearGradient(-30, 0, 30, 0);
        g.addColorStop(0, "#602330");
        g.addColorStop(0.5, phase ? "#fa9547" : "#bd4938");
        g.addColorStop(1, "#511b29");
        ellipse(c, 0, 12, 33, 49, g);
        ellipse(c, 0, -34, 25, 26, "#a93e31");
        for (const side of [-1, 1]) {
          c.fillStyle = "#d6bc88";
          c.beginPath();
          c.moveTo(side * 13, -50);
          c.quadraticCurveTo(side * 45, -83, side * 25, -86);
          c.quadraticCurveTo(side * 28, -61, side * 7, -54);
          c.fill();
          ellipse(c, side * 11, -37, 8, 4, "#ffe993");
          c.strokeStyle = "#ffb34d";
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(side * 8, -7);
          c.lineTo(side * 19, 13);
          c.lineTo(side * 8, 33);
          c.stroke();
        }
        ellipse(c, 0, 7, 7, 11, "#ffe18a");
      }
    });
  }
  // Ícono vectorial (icons.js) rasterizado una vez cargado; null mientras carga (el que llama usa su glifo).
  const vector = new Map();
  function icon(name) {
    if (typeof Image === "undefined") return null;
    let v = vector.get(name);
    if (!v) {
      v = { img: new Image(), ready: false };
      v.img.onload = () => (v.ready = true);
      v.img.src = iconDataUrl(name);
      vector.set(name, v);
    }
    return v.ready
      ? get("icon:" + name, (c) => c.drawImage(v.img, -30, -30, 60, 60), 64)
      : null;
  }
  function weapon(kind) {
    return get(
      "weapon:" + kind,
      (c) => {
        c.scale(1.5, 1.5);
        c.translate(-16, -16);
        c.lineCap = "round";
        c.lineJoin = "round";
        c.strokeStyle = "#e5edf0";
        c.lineWidth = 3;
        const paths = {
          sword: "M5 27L25 5L28 3L27 10L10 29Z M4 20L15 30",
          hammer: "M6 28L22 12 M12 7L19 2L30 14L24 20Z",
          spear: "M3 30L25 8 M21 9L29 2L27 13Z",
          axes: "M4 28L26 4 M4 4L26 28 M2 3L13 5L5 14Z M20 3L30 6L24 14Z",
          crossbow: "M9 3Q32 6 29 23 M9 3L29 23 M5 27L26 6 M22 5L27 5L27 10",
          staff: "M5 29L23 11 M23 2L29 8L23 14L17 8Z",
        };
        c.stroke(new Path2D(paths[kind] || paths.sword));
        c.strokeStyle = "#cfa658";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(5, 28);
        c.lineTo(10, 23);
        c.stroke();
      },
      64,
    );
  }
  function crest() {
    return get("crest", (c) => {
      c.fillStyle = "#172a2a";
      c.strokeStyle = "#dfbf77";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-54, -62);
      c.quadraticCurveTo(0, -85, 54, -62);
      c.lineTo(48, 20);
      c.quadraticCurveTo(30, 65, 0, 79);
      c.quadraticCurveTo(-30, 65, -48, 20);
      c.closePath();
      c.fill();
      c.stroke();
      c.strokeStyle = "#819b80";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, -8, 35, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#f5de9f";
      c.beginPath();
      c.moveTo(0, -60);
      c.lineTo(8, -36);
      c.lineTo(5, 22);
      c.lineTo(24, 24);
      c.lineTo(24, 32);
      c.lineTo(5, 32);
      c.lineTo(5, 51);
      c.lineTo(-5, 51);
      c.lineTo(-5, 32);
      c.lineTo(-24, 32);
      c.lineTo(-24, 24);
      c.lineTo(-5, 22);
      c.lineTo(-8, -36);
      c.closePath();
      c.fill();
    });
  }
  function bossFlash(world, phase) {
    return get(`bossFlash:${world}:${phase}`, (c) => {
      c.drawImage(boss(world, phase), -96, -96);
      c.globalCompositeOperation = "source-atop";
      c.fillStyle = "#ffffff";
      c.fillRect(-96, -96, 192, 192);
      c.globalCompositeOperation = "source-over";
    });
  }
  return { boss, bossFlash, weapon, crest, icon };
}
