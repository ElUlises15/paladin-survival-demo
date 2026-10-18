// Original, compact silhouettes. Shared outlines keep the family legible at HUD sizes.
const C = { steel: '#c9d1d9', gold: '#e8b44a', wood: '#8a5a32', dark: '#15100d' };
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const line = d => path(d, 'none');
const steel = d => path(d, C.steel);
const gold = d => path(d, C.gold);
const wood = d => path(d, C.wood);
const hi = (d, color = '#f4f7fa') => path(d, color, 'stroke="none"');
const shade = (d, color = '#7d8894') => path(d, color, 'stroke="none"');
const icons = {
  sword: steel('M12 19 23 4 29 3 28 9 15 22Z') + shade('M15 20 28 5 28 9 15 22Z') + hi('M14 17 24 5 26 5 15 19Z') + line('M17 16 25 7') + wood('M5 25 11 19 14 22 8 28Z') + gold('M8 17 10 15 19 24 17 26Z') + gold('M3 26 6 24 10 28 7 30Z'),
  crossbow: path('M7 2Q32 16 7 30L10.5 28.5Q26 16 10.5 3.5Z', '#a8703f') + hi('M8.5 3.5Q28 16 8.5 28.5L9.5 27.5Q24.5 16 9.5 4.5Z', '#e0a868') + path('M8 3.5 5.5 16 8 28.5', 'none', 'stroke="#f3e8cc" stroke-width="1.3"') + path('M3 14.8H25V17.2H3Z', '#efdcab') + steel('M23.5 11.5 31 16 23.5 20.5Z') + hi('M24.5 13 28.5 16 24.5 16Z') + path('M5 16 1 11.5 6 12.5 9 16 6 19.5 1 20.5Z', '#e8b44a'),
  staff: wood('M13 13 17 13 18 29 13 29Z') + shade('M16 15 17 15 18 29 16 29Z', '#58371f') + gold('M10 11 13 10 16 14 20 10 23 11 20 17 12 17Z') + circle(16, 8, 6, '#fff1b8') + shade('M16 13Q22 11 21 6 25 14 16 14Z', '#e8b44a') + hi('M12 8Q11 4 16 4L15 6Z', '#ffffff'),
  hammer: wood('M14 12H19L18 29H13Z') + shade('M16 15H19L18 29H16Z', '#58371f') + steel('M4 5 24 3 28 7 27 14 7 16 4 12Z') + shade('M7 12 27 10 27 14 7 16Z') + hi('M6 6 23 4 25 6 7 8Z') + gold('M13 4 18 4 19 15 14 15Z'),
  spear: wood('M14 15H18V30H14Z') + shade('M16 16H18V30H16Z', '#58371f') + steel('M16 2Q26 12 18 17H14Q6 12 16 2Z') + shade('M16 3V16H18Q24 12 16 3Z') + hi('M15 6 12 12 14 13Z') + gold('M12 16H20V19H12Z'),
  axes: wood('M5 27 23 6 26 9 8 30Z') + wood('M6 7 9 5 27 27 24 30Z') + steel('M4 3 12 7 16 13 9 18Q3 14 3 8L7 10Z') + steel('M28 3 20 7 16 13 23 18Q29 14 29 8L25 10Z') + shade('M4 12 9 16 14 13 12 11 9 14Z') + shade('M28 12 23 16 18 13 20 11 23 14Z') + hi('M4 5 10 8 12 11 7 8Z') + hi('M28 5 22 8 20 11 25 8Z'),
  skill: gold('M16 2 19 9 25 5 23 12 30 16 23 20 25 27 19 23 16 30 13 23 6 27 9 20 2 16 9 12 6 5 13 9Z') + shade('M16 17 23 20 25 27 19 23 16 30Z', '#a8761f') + path('M16 8 19 13 24 16 19 19 16 24 13 19 8 16 13 13Z', '#fff1b8') + hi('M16 10 16 16 11 16Z', '#ffffff'),
  dash: wood('M17 11 25 12 23 21 29 24 28 29H12L11 25 16 21Z') + shade('M12 26H28V29H12Z', '#58371f') + steel('M18 18Q7 18 4 5L11 9 12 5 17 12 21 10Z') + shade('M7 11 18 18 16 14Z') + hi('M7 8 11 10 14 14Z') + line('M3 22H10M2 26H7'),
  hand: steel('M9 17 7 12Q6 9 9 9L12 14 11 5Q12 2 14 5L16 13 16 3Q18 1 19 4L20 13 22 6Q25 4 25 8L24 18 28 14Q31 14 29 18L23 26H12L6 22 3 17Q3 14 6 15Z') + shade('M19 16 24 18 28 16 23 24H17Z') + hi('M13 16 16 17 16 22 13 21Z') + gold('M11 25H24V30H11Z'),
  swap: gold('M4 14Q3 4 15 4H23V1L30 7 23 13V9H15Q8 9 8 14Z') + gold('M28 18Q29 28 17 28H9V31L2 25 9 19V23H17Q24 23 24 18Z') + shade('M9 27H18Q26 27 27 22 27 28 17 28H9Z', '#a8761f') + hi('M6 10Q7 5 15 5H22V7H14Q9 7 6 10Z', '#ffe39a'),
  heart: path('M16 8C5-3-6 12 16 29 38 12 27-3 16 8Z', '#c0353f') + shade('M16 25Q29 14 28 8 34 17 16 29L7 20Z', '#7d202b') + hi('M6 12Q4 7 9 6 13 6 13 9 8 8 6 12Z', '#ff7a7f'),
  shield: gold('M16 2 29 6 27 20Q24 27 16 30 8 27 5 20L3 6Z') + steel('M16 6 25 9 23 20Q21 24 16 26 11 24 9 20L7 9Z') + shade('M16 7 25 9 23 20 16 26Z') + hi('M9 10 13 8 13 11 10 13Z') + gold('M14 9H18V14H23V18H18V24H14V18H9V14H14Z'),
  coin: circle(16, 16, 13, C.gold) + shade('M7 24Q24 29 28 12 33 29 16 29 10 29 7 24Z', '#a8761f') + hi('M6 16Q5 6 16 5L16 8Q9 8 8 16Z', '#ffe39a') + path('M16 9 18 12 22 12 21 16 23 19 19 20 16 24 13 20 9 19 11 16 10 12 14 12Z', '#a8761f') + circle(16, 16, 3, '#ffe39a'),
  soul: path('M17 2Q29 11 22 15 29 13 28 21 26 30 15 29 2 28 4 18 5 13 11 9 8 18 14 17 19 14 17 2Z', '#9b7bff') + shade('M16 28Q28 25 25 18 32 26 20 29H13Z', '#5b3fb8') + hi('M16 24Q9 24 11 19L17 12Q15 19 20 20Z', '#e2d6ff'),
  gem: path('M9 3H23L30 13 16 30 2 13Z', '#3fc7c0') + shade('M23 3 30 13 16 30 21 13Z', '#1f7f86') + hi('M9 3 12 12 3 12Z', '#b9fff7') + line('M2 13H30M9 3 12 13 16 30 21 13 23 3') + hi('M13 5H20L19 10H14Z', '#b9fff7'),
  pause: gold('M6 4H12V28H6Q4 28 4 26V6Q4 4 6 4ZM22 4H26Q28 4 28 6V26Q28 28 26 28H22Q20 28 20 26V6Q20 4 22 4Z') + shade('M9 6H12V28H9ZM25 6H28V26Q28 28 25 28Z', '#a8761f') + hi('M6 6H8V24H6ZM22 6H24V24H22Z', '#ffe39a'),
  gear: steel('M12 3H20L21 7 25 6 29 12 26 16 29 20 25 26 21 25 20 29H12L11 25 7 26 3 20 6 16 3 12 7 6 11 7Z') + shade('M21 8 25 7 28 12 25 16 28 20 24 25 20 24 19 28H14L16 24 21 22 24 16Z') + hi('M8 8 11 9 14 5H18L17 8 12 12 7 14 5 12Z') + circle(16, 16, 6, C.dark) + circle(16, 16, 3, C.gold),
  sound: steel('M3 12H9L18 5V27L9 20H3Z') + shade('M10 18 18 23V27L9 20H3V17Z') + hi('M5 13H8V16H5ZM12 12 16 9V13L12 15Z') + path('M22 11Q27 16 22 21M26 6Q35 16 26 26', 'none', 'stroke="#e8b44a" stroke-width="2.4" stroke-linecap="round"'),
  chest: wood('M3 15V10Q3 4 10 4H22Q29 4 29 10V15ZM3 15H29V28H3Z') + shade('M4 22H28V27H4Z', '#58371f') + hi('M5 9Q6 6 11 6H22V8H10Q7 8 7 11H5Z', '#c18b50') + gold('M7 5H11V28H7ZM21 5H25V28H21ZM3 14H29V18H3Z') + gold('M13 13H19V21H13Z') + line('M16 16V18'),
  potion: steel('M12 4H20V12Q28 17 27 24 26 30 16 30 6 30 5 24 4 17 12 12Z') + path('M8 19Q16 22 24 19L25 24Q23 28 16 28 9 28 7 24Z', '#6ad46a') + shade('M17 28Q25 27 24 20L21 21Q22 26 17 28Z', '#328443') + hi('M9 17 12 15 12 19 9 21Z') + wood('M11 2H21V7H11Z'),
  crown: gold('M3 8 10 14 16 4 22 14 29 8 26 27H6Z') + shade('M6 22H26V27H6Z', '#a8761f') + hi('M5 12 9 16 8 21H7ZM15 10 17 10 18 19H14Z', '#ffe39a') + path('M16 18 19 21 16 24 13 21Z', '#c0353f'),
  star: gold('M16 2 20 11 30 12 23 19 25 29 16 24 7 29 9 19 2 12 12 11Z') + shade('M16 17 23 19 25 29 16 24 7 29Z', '#a8761f') + hi('M16 5 17 12 6 13 13 11Z', '#ffe39a'),
};

export const ICON_NAMES = Object.freeze(Object.keys(icons));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const resolve = name => Object.hasOwn(icons, name) ? name : 'sword';

export function iconSvg(name, { size, cls = '', title } = {}) {
  name = resolve(name);
  const dimensions = size === undefined ? '' : ` width="${escape(size)}" height="${escape(size)}"`;
  const accessible = title === undefined ? ' aria-hidden="true"' : ' role="img"';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="ico ico-${name}${cls ? ` ${escape(cls)}` : ''}" viewBox="0 0 32 32"${dimensions}${accessible} focusable="false" stroke="${C.dark}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${title === undefined ? '' : `<title>${escape(title)}</title>`}${icons[name]}</svg>`;
}

const dataUrls = new Map();
export function iconDataUrl(name) {
  name = resolve(name);
  if (!dataUrls.has(name)) dataUrls.set(name, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(name)));
  return dataUrls.get(name);
}
