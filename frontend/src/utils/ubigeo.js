const UBIGEO_URL = 'https://free.e-api.net.pe/ubigeos.json';
let cache = null;

const FALLBACK_UBIGEOS = [
  { departamento: 'AMAZONAS', provincia: 'CHACHAPOYAS', distrito: 'CHACHAPOYAS' },
  { departamento: 'ÁNCASH', provincia: 'HUARAZ', distrito: 'HUARAZ' },
  { departamento: 'APURÍMAC', provincia: 'ABANCAY', distrito: 'ABANCAY' },
  { departamento: 'AREQUIPA', provincia: 'AREQUIPA', distrito: 'AREQUIPA' },
  { departamento: 'AYACUCHO', provincia: 'HUAMANGA', distrito: 'AYACUCHO' },
  { departamento: 'CAJAMARCA', provincia: 'CAJAMARCA', distrito: 'CAJAMARCA' },
  { departamento: 'CALLAO', provincia: 'CALLAO', distrito: 'CALLAO' },
  { departamento: 'CUSCO', provincia: 'CUSCO', distrito: 'CUSCO' },
  { departamento: 'HUANCAVELICA', provincia: 'HUANCAVELICA', distrito: 'HUANCAVELICA' },
  { departamento: 'HUÁNUCO', provincia: 'HUÁNUCO', distrito: 'HUÁNUCO' },
  { departamento: 'ICA', provincia: 'ICA', distrito: 'ICA' },
  { departamento: 'JUNÍN', provincia: 'HUANCAYO', distrito: 'HUANCAYO' },
  { departamento: 'LA LIBERTAD', provincia: 'TRUJILLO', distrito: 'TRUJILLO' },
  { departamento: 'LAMBAYEQUE', provincia: 'CHICLAYO', distrito: 'CHICLAYO' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'SAN ISIDRO' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'MIRAFLORES' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'SANTIAGO DE SURCO' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'SAN JUAN DE LURIGANCHO' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'LOS OLIVOS' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'COMAS' },
  { departamento: 'LIMA', provincia: 'LIMA', distrito: 'ATE' },
  { departamento: 'LORETO', provincia: 'MAYNAS', distrito: 'IQUITOS' },
  { departamento: 'MADRE DE DIOS', provincia: 'TAMBOPATA', distrito: 'TAMBOPATA' },
  { departamento: 'MOQUEGUA', provincia: 'MARISCAL NIETO', distrito: 'MOQUEGUA' },
  { departamento: 'PASCO', provincia: 'PASCO', distrito: 'CHAUPIMARCA' },
  { departamento: 'PIURA', provincia: 'PIURA', distrito: 'PIURA' },
  { departamento: 'PUNO', provincia: 'PUNO', distrito: 'PUNO' },
  { departamento: 'SAN MARTÍN', provincia: 'MOYOBAMBA', distrito: 'MOYOBAMBA' },
  { departamento: 'TACNA', provincia: 'TACNA', distrito: 'TACNA' },
  { departamento: 'TUMBES', provincia: 'TUMBES', distrito: 'TUMBES' },
  { departamento: 'UCAYALI', provincia: 'CORONEL PORTILLO', distrito: 'CALLERIA' },
];

const clean = (value) => String(value || '').trim();
const getField = (item, names) => {
  for (const name of names) {
    if (item?.[name] !== undefined && item?.[name] !== null) return clean(item[name]);
  }
  return '';
};

const normalizeRow = (item) => {
  const departamento = getField(item, ['departamento', 'department', 'departamento_nombre', 'nombre_departamento', 'dep', 'dpto']);
  const provincia = getField(item, ['provincia', 'province', 'provincia_nombre', 'nombre_provincia', 'prov']);
  const distrito = getField(item, ['distrito', 'district', 'distrito_nombre', 'nombre_distrito', 'dist']);
  const ubigeo = getField(item, ['ubigeo', 'codigo', 'code', 'inei']);
  return departamento && provincia && distrito ? { departamento, provincia, distrito, ubigeo } : null;
};

const flattenNestedObject = (data) => {
  const rows = [];
  Object.entries(data || {}).forEach(([departamento, provincias]) => {
    if (Array.isArray(provincias)) {
      provincias.forEach((item) => {
        const row = typeof item === 'string'
          ? { departamento, provincia: item, distrito: item }
          : normalizeRow({ departamento, ...item });
        if (row) rows.push(row);
      });
      return;
    }

    if (provincias && typeof provincias === 'object') {
      Object.entries(provincias).forEach(([provincia, distritos]) => {
        if (Array.isArray(distritos)) {
          distritos.forEach((dist) => {
            if (typeof dist === 'string') rows.push({ departamento, provincia, distrito: dist });
            else {
              const row = normalizeRow({ departamento, provincia, ...dist });
              if (row) rows.push(row);
            }
          });
        } else if (distritos && typeof distritos === 'object') {
          Object.entries(distritos).forEach(([distrito, value]) => {
            const row = typeof value === 'object'
              ? normalizeRow({ departamento, provincia, distrito, ...value })
              : { departamento, provincia, distrito };
            if (row) rows.push(row);
          });
        }
      });
    }
  });
  return rows;
};

export const normalizeUbigeos = (data) => {
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.ubigeos)
        ? data.ubigeos
        : Array.isArray(data?.items)
          ? data.items
          : null;

  if (source) {
    const rows = source.map(normalizeRow).filter(Boolean);
    if (rows.length) return rows;
  }

  if (data && typeof data === 'object') {
    const rows = flattenNestedObject(data);
    if (rows.length) return rows;
  }

  return [];
};

export const loadUbigeos = async () => {
  if (cache) return cache;
  try {
    const response = await fetch(UBIGEO_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error('No se pudo cargar ubigeo');
    const data = await response.json();
    cache = normalizeUbigeos(data);
  } catch (error) {
    console.warn('No se pudo cargar la API de ubigeo, usando respaldo local:', error?.message || error);
    cache = FALLBACK_UBIGEOS;
  }
  if (!cache.length) cache = FALLBACK_UBIGEOS;
  return cache;
};

export const getDepartments = (ubigeos = []) => [...new Set(ubigeos.map(item => item.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

export const getProvinces = (ubigeos = [], departamento = '') => [...new Set(ubigeos
  .filter(item => item.departamento === departamento)
  .map(item => item.provincia)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

export const getDistricts = (ubigeos = [], departamento = '', provincia = '') => [...new Set(ubigeos
  .filter(item => item.departamento === departamento && item.provincia === provincia)
  .map(item => item.distrito)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
