// The theme shop catalog. price is in cents (0 = free for everyone).
// Supporters can use every theme. Preview images live in public/themes/<slug>.png
import midnightRed from './midnight-red';
import moneyTalks from './money-talks';
import redMoney from './red-money';
import systemOverride from './system-override';
import miamiNights from './miami-nights';
import pinkElephant from './pink-elephant';
import throwback06 from './throwback-06';
import y2kGlitter from './y2k-glitter';
import sceneQueen from './scene-queen';
import vaporOs from './vapor-os';
import graffitiWall from './graffiti-wall';
import galaxy from './galaxy';
import iceOut from './ice-out';
import bloodMoon from './blood-moon';
import candyShop from './candy-shop';
import camo from './camo';
import arcade from './arcade';
import neonRain from './neon-rain';
import oldMoney from './old-money';
import sakura from './sakura';
import lavaLamp from './lava-lamp';
import halloween from './halloween';
import deepSea from './deep-sea';
import fireflyForest from './firefly-forest';
import notebook from './notebook';
import terminal from './terminal';
import snowDay from './snow-day';
import varsity from './varsity';
import rainbow from './rainbow';
import goldenHour from './golden-hour';

export const THEMES = [
  { slug: 'halloween', name: "Halloween \u{1F383}", price: 0, description: "Free for spooky season: a harvest moon, floating ghosts, flying bats, spider webs, candy corn, slime-drip name and a jack-o'-lantern cursor.", css: halloween },
  { slug: 'deep-sea', name: "Deep Sea", price: 0, description: "Underwater: sunbeams through blue water, rising bubbles, swaying seaweed, a school of fish and a fish cursor.", css: deepSea },
  { slug: 'firefly-forest', name: "Firefly Forest", price: 0, description: "A summer night in the pines with a big moon, blinking fireflies, wooden boxes and a firefly-jar cursor.", css: fireflyForest },
  { slug: 'notebook', name: "Notebook", price: 0, description: "A light, hand-made look: lined school paper, taped-on boxes, blue-pen doodles, a polaroid pic and a pencil cursor.", css: notebook },
  { slug: 'terminal', name: "Terminal", price: 0, description: "Green-screen hacker vibes: glowing text, scanlines, ASCII corners, a blinking cursor after your name.", css: terminal },
  { slug: 'snow-day', name: "Snow Day", price: 0, description: "Cozy winter night: falling snow, snowy hills, frosted boxes with icicles and a snowflake cursor.", css: snowDay },
  { slug: 'varsity', name: "Varsity", price: 0, description: "Game day in navy & gold: jersey mesh, stitched boxes, outlined block letters and a basketball cursor.", css: varsity },
  { slug: 'rainbow', name: "Rainbow", price: 0, description: "A glowing rainbow sky, rainbow-edged boxes, a color-flowing name and a rainbow heart cursor.", css: rainbow },
  { slug: 'golden-hour', name: "Golden Hour", price: 0, description: "A warm light theme: peach-to-pink sunset sky, a soft glowing sun, creamy boxes and a sun cursor.", css: goldenHour },
  { slug: 'midnight-red', name: "Midnight Red", price: 0, description: "Red & black poster layout with a glowing name, round Top 8 and chat-bubble comments.", css: midnightRed },
  { slug: 'throwback-06', name: "Throwback '06", price: 0, description: "The classic 2006 look: white boxes, blue headers, Verdana and a Top 8 grid. Pure nostalgia.", css: throwback06 },
  { slug: 'money-talks', name: "Money Talks", price: 199, description: "Red & black over a photo of fanned $100 bills, with see-through boxes.", css: moneyTalks },
  { slug: 'red-money', name: "Red Money", price: 299, description: "Money falls inside every see-through box. Add your own background picture.", css: redMoney },
  { slug: 'system-override', name: "System Override", price: 299, description: "Cyberpunk red & cyan: glitching name, scan lines, reticle cursor and falling money.", css: systemOverride },
  { slug: 'miami-nights', name: "Miami Nights", price: 299, description: "80s neon sunset in black & gold with shimmering gold lettering and a $ coin cursor.", css: miamiNights },
  { slug: 'pink-elephant', name: "Pink Elephant", price: 199, description: "Pink & black over an elephant photo, with an elephant cursor.", css: pinkElephant },
  { slug: 'y2k-glitter', name: "Y2K Glitter", price: 199, description: "Hot pink, baby blue and twinkling sparkles, bubbly boxes, shimmering name and a heart cursor.", css: y2kGlitter },
  { slug: 'scene-queen', name: "Scene Queen", price: 199, description: "Black & white checkerboard with hot pink and lime, tilted pics, stripes and a star cursor.", css: sceneQueen },
  { slug: 'vapor-os', name: "Vapor OS", price: 299, description: "Vaporwave sunset with a moving neon grid floor. Every box is a retro computer window.", css: vaporOs },
  { slug: 'graffiti-wall', name: "Graffiti Wall", price: 299, description: "Brick wall, spray-paint neon name, big tag-style header and a spray can cursor.", css: graffitiWall },
  { slug: 'galaxy', name: "Galaxy", price: 299, description: "Deep space with twinkling stars, a purple nebula, glass boxes and a planet cursor.", css: galaxy },
  { slug: 'ice-out', name: "Iced Out", price: 299, description: "Chrome and diamonds: frosted glass boxes, shining chrome name, sparkles and a diamond cursor.", css: iceOut },
  { slug: 'blood-moon', name: "Blood Moon", price: 199, description: "Gothic horror: a huge red moon, rolling fog, dripping name and a bat cursor.", css: bloodMoon },
  { slug: 'candy-shop', name: "Candy Shop", price: 199, description: "A bright light theme: pastel candy stripes, sprinkles, rainbow banner and a lollipop cursor.", css: candyShop },
  { slug: 'camo', name: "Camo", price: 199, description: "Woodland camouflage, stencil lettering, a dog-tag mood, hazard stripes and a crosshair cursor.", css: camo },
  { slug: 'arcade', name: "8-Bit Arcade", price: 299, description: "Pixel borders, CRT scanlines, blinking PRESS START and a pixel arrow cursor.", css: arcade },
  { slug: 'neon-rain', name: "Neon Rain", price: 299, description: "A rainy city night: falling rain, a flickering neon-sign name, pink & cyan glow.", css: neonRain },
  { slug: 'old-money', name: "Old Money", price: 299, description: "Quiet luxury: ivory paper, navy & gold, elegant serif type and a fountain-pen cursor.", css: oldMoney },
  { slug: 'sakura', name: "Sakura", price: 299, description: "Cherry-blossom petals drifting down a soft night sky, blush glass boxes and a petal cursor.", css: sakura },
  { slug: 'lava-lamp', name: "Lava Lamp", price: 299, description: "Glowing lava blobs float behind see-through boxes, with a melting-color name and a bubble cursor.", css: lavaLamp },
];

export function getTheme(slug) {
  return THEMES.find((t) => t.slug === slug) || null;
}
