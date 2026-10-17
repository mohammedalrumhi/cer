import { ISLAMIC_ICON_NODES } from './islamicIcons';

// Geometry of the featured icons only (small chunk); the full set loads on demand (iconLibrary.js).
const modules = import.meta.glob('../../../node_modules/lucide-react/dist/esm/icons/{award,trophy,medal,star,crown,book-open,book,notebook-pen,graduation-cap,school,moon,moon-star,sun,sparkles,heart,hand-heart,handshake,thumbs-up,badge-check,circle-check,shield-check,gem,flower,leaf,sprout,tree-palm,mountain,lamp,lightbulb,target,rocket,flag,calendar,clock,users,user,pen-tool,feather,scroll,ribbon,mic,headphones,music,globe,map-pin,phone,mail,message-circle,smile,party-popper,gift,cake,balloon,candy,palette,brush,calculator,microscope,dumbbell,bike,book-marked,book-open-check,book-heart,book-check,book-a,library,library-big,scroll-text,notebook-text,pencil,pen-line,pencil-ruler,ruler,backpack,presentation,laptop,languages,brain,puzzle,atom,flask-conical,sigma,pi,hourglass,badge,circle-star,star-half,sparkle,goal,zap,flame,shield,key,bell,megaphone,hand-helping,heart-handshake,hand-coins,hand-platter,heart-pulse,user-check,users-round,baby,footprints,sunrise,sunset,sun-moon,cloud-moon,cloud,rainbow,droplet,waves,trees,tree-pine,flower-2,clover,bird,fish,shell,mountain-snow,tent,compass,map,plane,bus,house,landmark,apple,volleyball}.js', { eager: true });

export const FEATURED_NODES = {
  ...ISLAMIC_ICON_NODES,
  ...Object.fromEntries(
    Object.entries(modules)
      .map(([file, mod]) => [file.split('/').pop().replace(/\.js$/, ''), mod.__iconNode])
      .filter(([, nodes]) => Array.isArray(nodes)),
  ),
};
