// Geometry of the featured icons only (small chunk); the full set loads on demand (iconLibrary.js).
const modules = import.meta.glob('../../../node_modules/lucide-react/dist/esm/icons/{award,trophy,medal,star,crown,book-open,book,notebook-pen,graduation-cap,school,moon,moon-star,sun,sparkles,heart,hand-heart,handshake,thumbs-up,badge-check,circle-check,shield-check,gem,flower,leaf,sprout,tree-palm,mountain,lamp,lightbulb,target,rocket,flag,calendar,clock,users,user,pen-tool,feather,scroll,ribbon,mic,headphones,music,globe,map-pin,phone,mail,message-circle,smile,party-popper,gift,cake,balloon,candy,palette,brush,calculator,microscope,dumbbell,bike}.js', { eager: true });

export const FEATURED_NODES = Object.fromEntries(
  Object.entries(modules)
    .map(([file, mod]) => [file.split('/').pop().replace(/\.js$/, ''), mod.__iconNode])
    .filter(([, nodes]) => Array.isArray(nodes)),
);
