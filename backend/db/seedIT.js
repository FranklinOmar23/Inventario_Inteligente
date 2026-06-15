import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

// ── Raw items (133 units) ────────────────────────────────────────────────────
const RAW_ITEMS = [
  // Monitores
  { name: 'Monitor Samsung',        brand: 'Samsung', model: 'Monitor',      cat: 'Monitor',           af: '',          sn: '092HHCNX802474V',      st: '' },
  { name: 'Monitor Dell',           brand: 'Dell',    model: 'Monitor',      cat: 'Monitor',           af: '13-1570',   sn: '',                     st: '' },
  { name: 'Monitor Dell',           brand: 'Dell',    model: 'Monitor',      cat: 'Monitor',           af: '13-1381',   sn: '',                     st: '' },
  { name: 'Monitor Dell',           brand: 'Dell',    model: 'Monitor',      cat: 'Monitor',           af: '13-1574',   sn: '',                     st: '' },
  { name: 'Monitor Dell',           brand: 'Dell',    model: 'Monitor',      cat: 'Monitor',           af: '13-1212',   sn: '',                     st: '' },
  { name: 'Monitor AOC',            brand: 'AOC',     model: 'Monitor',      cat: 'Monitor',           af: '13-1951',   sn: '',                     st: '' },
  { name: 'Monitor Dell',           brand: 'Dell',    model: 'Monitor',      cat: 'Monitor',           af: '',          sn: 'CN01J181-64180',       st: '' },
  { name: 'Monitor Samsung',        brand: 'Samsung', model: 'Monitor',      cat: 'Monitor',           af: '',          sn: '09HHCNT406B13B',       st: '' },
  { name: 'Monitor Samsung',        brand: 'Samsung', model: 'Monitor',      cat: 'Monitor',           af: '',          sn: 'B2T3H4T601035D',       st: '' },
  { name: 'Monitor AOC',            brand: 'AOC',     model: 'Monitor',      cat: 'Monitor',           af: '',          sn: '',                     st: '' },
  // PC de Escritorio
  { name: 'PC de Escritorio Dell',  brand: 'Dell',    model: 'Desktop',      cat: 'PC de Escritorio',  af: '13-43914',  sn: '',                     st: '6Z05JK2' },
  { name: 'PC de Escritorio Dell',  brand: 'Dell',    model: 'Desktop',      cat: 'PC de Escritorio',  af: '13-4281',   sn: '',                     st: '955JHH2' },
  { name: 'PC de Escritorio Dell',  brand: 'Dell',    model: 'Desktop',      cat: 'PC de Escritorio',  af: '',          sn: '',                     st: '' },
  { name: 'PC de Escritorio Dell',  brand: 'Dell',    model: 'Desktop',      cat: 'PC de Escritorio',  af: '13-2564',   sn: '',                     st: '70F2D32' },
  { name: 'PC de Escritorio Dell',  brand: 'Dell',    model: 'Desktop',      cat: 'PC de Escritorio',  af: '13-2556',   sn: '',                     st: '79X2C32' },
  { name: 'PC de Escritorio Dell',  brand: 'Dell',    model: 'Desktop',      cat: 'PC de Escritorio',  af: '',          sn: '',                     st: 'DWR1Q22' },
  // Impresora Epson LQ-590
  { name: 'Impresora Epson LQ-590', brand: 'Epson',   model: 'LQ-590',       cat: 'Impresora',         af: '13-2133',   sn: '',                     st: '' },
  // All-in-One
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2633',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2626',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2607',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2640',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2647',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2646',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2629',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2653',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2641',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2638',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2680',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2620',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2657',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2604',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2627',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2614',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2036',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2679',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2639',   sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '',          sn: '',                     st: '' },
  { name: 'All-in-One',             brand: '',        model: 'All-in-One',   cat: 'All-in-One PC',     af: '13-2628',   sn: '',                     st: '' },
  // Laptops
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '402278',               st: '' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '',                     st: '1RTQ082' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '13-1615',   sn: '',                     st: '75L1ZQ1' },
  { name: 'Laptop HP',              brand: 'HP',      model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '2UA1290129',           st: '' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '',                     st: 'DSNE1F' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '',                     st: '1JVG942' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '2550621031302090',     st: '9PPZH02' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '',                     st: 'DW8WW71' },
  { name: 'Laptop Dell',            brand: 'Dell',    model: 'Laptop',       cat: 'Laptop',            af: '',          sn: '',                     st: '2RVJXR1' },
  // Dispositivos de Red
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '13-4050',  sn: '274BUG2307050342',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '274BUG2112291474',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '2506052627',           st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '13-4207',  sn: '274BUG2403050564',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '274BUG2112291753',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '2506052610',           st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '2303062654',           st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '2506050468',           st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '274BUG2512152015',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '13-3123',  sn: '274BUG2112292043',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '274BUG2307050338',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '274BUG2403050012',     st: '' },
  { name: 'Dispositivo 2 Connet',   brand: '2 Connet',model: '2 CONNET',    cat: 'Dispositivo de Red', af: '',         sn: '274BUG2203292232',     st: '' },
  // Escáneres
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J193100061',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-3024',   sn: 'D4N222900040',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2801',   sn: 'D4J200200505',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2803',   sn: 'D4J213103952',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2940',   sn: 'D4J193300351',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J221101638',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J221101679',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J221101665',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2879',   sn: 'D4J192600632',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2800',   sn: 'D4J200200522',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2875',   sn: 'D4J193200204',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2851',   sn: 'D4J213103960',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J193300343',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2876',   sn: 'D4J192600623',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '13-2852',   sn: 'D4J213103992',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J221101488',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J221101656',         st: '' },
  { name: 'Escáner Zebra',          brand: 'Zebra',   model: 'ZEBRA',        cat: 'Escáner de Código', af: '',          sn: 'D4J192800261',         st: '' },
  // Impresoras Star
  { name: 'Impresora Star',         brand: 'Star',    model: 'STAR PRINT',   cat: 'Impresora',         af: '13-2944',   sn: 'S2550621061302352',    st: '' },
  { name: 'Impresora Star',         brand: 'Star',    model: 'STAR PRINT',   cat: 'Impresora',         af: '',          sn: 'S2550621181106024844', st: '' },
  { name: 'Impresora Star',         brand: 'Star',    model: 'STAR PRINT',   cat: 'Impresora',         af: '13-2987',   sn: 'S2550621121302790',    st: '' },
  { name: 'Impresora Star',         brand: 'Star',    model: 'STAR PRINT',   cat: 'Impresora',         af: '',          sn: 'S2400114070602764',    st: '' },
  { name: 'Impresora Star',         brand: 'Star',    model: 'STAR PRINT',   cat: 'Impresora',         af: '13-2813',   sn: 'S2400114040603483',    st: '' },
  // Impresoras Epson LQ-220
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82E016520',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-1847',   sn: 'F73F009231',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82H152696',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82H076633',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82F017481',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82H175728',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'F73F009228',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'F73F011218',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-2050',   sn: 'F73F250833',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-1254',   sn: 'F73G160683',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-1607',   sn: 'F73G161498',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-1414',   sn: 'F73F004559',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X2NN126811',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-02185',  sn: 'F73F252612',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-1941',   sn: 'F73F211084',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'F6WG172007',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82H076746',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '13-2073',   sn: 'F73F251683',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'F73F252554',           st: '' },
  { name: 'Impresora Epson LQ-220', brand: 'Epson',   model: 'LQ-220',       cat: 'Impresora',         af: '',          sn: 'X82F018464',           st: '' },
  // Impresoras ZJ-9200
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102202200046',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19091604100005',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200016',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200021',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '20101400700001',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200048',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19091604100010',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200024',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19091604100012',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200042',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200043',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200022',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19102200200045',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19091604100004',       st: '' },
  { name: 'Impresora ZJ-9200',      brand: 'ZJ',      model: 'ZJ-9200',      cat: 'Impresora',         af: '',          sn: '19091604100001',       st: '' },
  // Otras impresoras únicas
  { name: 'Impresora Canon 1435IF+', brand: 'Canon',  model: '1435IF+',      cat: 'Impresora',         af: '',          sn: 'YDB03246',             st: '' },
  { name: 'Impresora HP M402N',     brand: 'HP',      model: 'M402N',        cat: 'Impresora',         af: '13-2406',   sn: 'PHBHG31403',           st: '' },
  { name: 'Impresora HP P2015',     brand: 'HP',      model: 'P2015',        cat: 'Impresora',         af: '13-1203',   sn: 'CNB1S00350',           st: '' },
  { name: 'Impresora HP P2035',     brand: 'HP',      model: 'P2035',        cat: 'Impresora',         af: '13-1427',   sn: 'CNB9J25724',           st: '' },
  { name: 'Impresora Canon MF229DW',brand: 'Canon',   model: 'MF229DW',      cat: 'Impresora',         af: '',          sn: 'RUV17690',             st: '' },
];

const NEW_CATS = [
  { name: 'PC de Escritorio',  rat: 1, rui: 1, min: 2 },
  { name: 'All-in-One PC',     rat: 1, rui: 1, min: 2 },
  { name: 'Escáner de Código', rat: 1, rui: 1, min: 2 },
  { name: 'Dispositivo de Red',rat: 1, rui: 1, min: 2 },
];

async function main() {
  const db = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    5,
    charset:            'utf8mb4',
    timezone:           '+00:00',
  });

  try {
    // ── IT Department ──────────────────────────────────────────────────────────
    const [[itDept]] = await db.execute(
      "SELECT id, name, sucursal_id, sucursal_name FROM departments WHERE name = 'IT' AND deleted_at IS NULL LIMIT 1"
    );
    if (!itDept) throw new Error('Departamento IT no encontrado. Ejecuta el servidor primero.');
    console.log(`✓ Departamento IT: ${itDept.id} (${itDept.sucursal_name || 'sin sucursal'})`);

    // ── Delete existing IT items ───────────────────────────────────────────────
    const [del] = await db.execute(
      'DELETE FROM inventory_items WHERE department_id = ?',
      [itDept.id]
    );
    console.log(`✓ ${del.affectedRows} items anteriores eliminados`);

    // ── Ensure categories exist ────────────────────────────────────────────────
    const [existingCats] = await db.execute('SELECT id, name FROM categories WHERE deleted_at IS NULL');
    const catMap = Object.fromEntries(existingCats.map(c => [c.name, c.id]));

    for (const { name, rat, rui, min } of NEW_CATS) {
      if (!catMap[name]) {
        const id = crypto.randomUUID();
        await db.execute(
          'INSERT INTO categories (id, name, requires_asset_tag, requires_unique_id, minimum_stock) VALUES (?, ?, ?, ?, ?)',
          [id, name, rat, rui, min]
        );
        catMap[name] = id;
        console.log(`  + Categoría creada: ${name}`);
      }
    }
    const [allCats] = await db.execute('SELECT id, name FROM categories WHERE deleted_at IS NULL');
    for (const c of allCats) catMap[c.name] = c.id;

    // ── Insert each item individually (quantity = 1, own identifiers) ──────────
    const today = new Date().toISOString().split('T')[0];
    let inserted = 0;

    for (const item of RAW_ITEMS) {
      const catId = catMap[item.cat] || null;
      await db.execute(`
        INSERT INTO inventory_items
          (id, name, brand, model, category_id, category_name,
           department_id, department_name, sucursal_id, sucursal_name,
           status, quantity, asset_tag, service_tag, serial_number,
           has_unique_id, entry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', 1, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(),
        item.name, item.brand, item.model,
        catId, item.cat,
        itDept.id, itDept.name,
        itDept.sucursal_id || null, itDept.sucursal_name || '',
        item.af || null, item.st || null, item.sn || null,
        !!(item.af || item.st || item.sn) ? 1 : 0,
        today,
      ]);
      inserted++;
    }

    console.log(`\n✅ Seed completado: ${inserted} items individuales insertados`);
  } finally {
    await db.end();
  }
}

main().catch(err => { console.error('❌ Error:', err.message || err); console.error(err.stack); process.exit(1); });
