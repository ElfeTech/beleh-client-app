/**
 * Parse PostgreSQL connection strings into discrete fields.
 * Supports:
 * - postgresql:// and postgres:// URIs (incl. query params: sslmode, ssl, user, password, dbname, host)
 * - jdbc:postgresql://… and jdbc:postgres://…
 * - libpq keyword/value (host=… port=… dbname=… user=… password=… sslmode=…)
 */

export type ParsedPostgresFields = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
};

export type ParsePostgresConnectionStringResult =
  | { ok: true; partial: Partial<ParsedPostgresFields>; warnings: string[] }
  | { ok: false; error: string };

/** Strip shell export, outer quotes, comments, and use first non-empty line. */
export function normalizePostgresConnectionStringInput(raw: string): string {
  let s = raw.trim();
  if (!s) return '';

  const exportMatch = s.match(/^\s*export\s+[A-Za-z_][\w]*\s*=\s*(.+)$/i);
  if (exportMatch) {
    s = exportMatch[1].trim();
  }

  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }

  const strippedLines = s.split(/\r?\n/).map((line) => line.replace(/#.*$/, '').trim());
  const nonEmpty = strippedLines.filter((line) => line.length > 0);
  if (!nonEmpty.length) return '';

  const uriLine = nonEmpty.find((line) => /^jdbc:|postgres(ql)?:\/\//i.test(line));
  if (uriLine) {
    return uriLine;
  }

  return nonEmpty.join(' ');
}

function sslModeToBoolean(sslmode: string | null | undefined): boolean | undefined {
  if (sslmode == null || sslmode === '') return undefined;
  const s = sslmode.trim().toLowerCase();
  if (s === 'disable' || s === 'false') return false;
  if (['require', 'verify-ca', 'verify-full', 'allow', 'prefer', 'true'].includes(s)) {
    return s === 'allow' || s === 'prefer' ? false : true;
  }
  return true;
}

function parseSslQueryParams(searchParams: URLSearchParams): boolean | undefined {
  const sslmode = sslModeToBoolean(searchParams.get('sslmode'));
  if (sslmode !== undefined) return sslmode;

  const ssl = searchParams.get('ssl');
  if (ssl == null) return undefined;
  const v = ssl.trim().toLowerCase();
  if (['1', 'true', 'on', 'yes'].includes(v)) return true;
  if (['0', 'false', 'off', 'no'].includes(v)) return false;
  return undefined;
}

/** Normalize multi-host hostnames (e.g. host1,host2) to a single host for the form. */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeHostname(hostname: string): { host: string; warning?: string } {
  let h = hostname.trim();
  if (h.startsWith('[') && h.includes(']')) {
    h = h.slice(1, h.indexOf(']')) || h;
  }
  if (!h) return { host: '' };
  if (h.includes(',')) {
    const first = h.split(',')[0].trim();
    return { host: first, warning: 'Multiple hosts detected; using the first host for this form.' };
  }
  return { host: h };
}

function tryParseJdbcOrUri(raw: string): {
  partial: Partial<ParsedPostgresFields>;
  warnings: string[];
} | null {
  let s = raw.trim();
  if (!s) return null;

  const warnings: string[] = [];

  const jdbc = s.match(/^jdbc:(postgresql|postgres):(\/\/.*)$/i);
  if (jdbc) {
    s = `${jdbc[1].toLowerCase()}:${jdbc[2]}`;
  }

  if (!/^postgres(ql)?:\/\//i.test(s)) {
    return null;
  }

  try {
    const u = new URL(s);
    const proto = u.protocol.replace(':', '').toLowerCase();
    if (proto !== 'postgres' && proto !== 'postgresql') {
      return null;
    }

    let host = u.hostname;
    const port = u.port ? parseInt(u.port, 10) : 5432;
    let database = (u.pathname || '').replace(/^\//, '').split('/')[0] ?? '';
    database = safeDecodeURIComponent(database);

    const userFromAuth = safeDecodeURIComponent(u.username || '');
    const passFromAuth = safeDecodeURIComponent(u.password || '');

    const userQ = u.searchParams.get('user');
    const passQ = u.searchParams.get('password');
    const username = userFromAuth || (userQ ? safeDecodeURIComponent(userQ) : '');
    const password = passFromAuth || (passQ ? safeDecodeURIComponent(passQ) : '');

    const dbnameQ = u.searchParams.get('dbname');
    if (dbnameQ) {
      database = safeDecodeURIComponent(dbnameQ);
    }

    const hostQ = u.searchParams.get('host');
    if (hostQ) {
      host = safeDecodeURIComponent(hostQ);
    }

    const { host: normHost, warning: hostWarn } = normalizeHostname(host);
    if (hostWarn) warnings.push(hostWarn);

    if (!normHost) {
      return null;
    }

    let ssl = parseSslQueryParams(u.searchParams);
    if (ssl === undefined) {
      const h = normHost.toLowerCase();
      const local = h === 'localhost' || h === '127.0.0.1' || h === '::1';
      ssl = local ? false : true;
    }

    const partial: Partial<ParsedPostgresFields> = {
      host: normHost,
      port: Number.isFinite(port) && port > 0 ? port : 5432,
      database,
      username,
      password,
      ssl,
    };

    return { partial, warnings };
  } catch {
    return null;
  }
}

/**
 * libpq-style: host=… port=… dbname=… user=… password=… sslmode=…
 * Values may be single-quoted; inside quotes, '' is an escaped quote.
 */
function parseKeywordValueConninfo(input: string): { partial: Partial<ParsedPostgresFields>; warnings: string[] } | null {
  const s = input.trim();
  if (!s || !s.includes('=')) {
    return null;
  }
  if (/^postgres(ql)?:\/\//i.test(s) || /^jdbc:(postgresql|postgres):/i.test(s)) {
    return null;
  }

  const pairs: Record<string, string> = {};
  let i = 0;

  const skipSpaces = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };

  const readValue = (): string => {
    if (s[i] === "'") {
      i++;
      let out = '';
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") {
          out += "'";
          i += 2;
          continue;
        }
        if (s[i] === "'") {
          i++;
          break;
        }
        out += s[i];
        i++;
      }
      return out;
    }
    let out = '';
    while (i < s.length && !/\s/.test(s[i])) {
      out += s[i];
      i++;
    }
    return out;
  };

  while (i < s.length) {
    skipSpaces();
    if (i >= s.length) break;

    const keyStart = i;
    if (!/[A-Za-z_]/.test(s[i])) {
      return null;
    }
    while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++;
    const key = s.slice(keyStart, i).toLowerCase();
    skipSpaces();
    if (s[i] !== '=') {
      return null;
    }
    i++;
    skipSpaces();
    const value = readValue();
    if (key) pairs[key] = value;
  }

  const hostRaw = pairs.host || pairs.hostaddr || '';
  const { host, warning: hostWarn } = normalizeHostname(hostRaw);
  const warnings: string[] = [];
  if (hostWarn) warnings.push(hostWarn);

  const portRaw = pairs.port;
  const port = portRaw ? parseInt(portRaw, 10) : 5432;

  const database = pairs.dbname || pairs.database || '';
  const username = pairs.user || pairs.username || '';
  const password = pairs.password || '';

  let ssl: boolean | undefined = sslModeToBoolean(pairs.sslmode);
  if (ssl === undefined && pairs.ssl) {
    ssl = sslModeToBoolean(pairs.ssl);
  }
  if (ssl === undefined) {
    const h = host.toLowerCase();
    const local = h === 'localhost' || h === '127.0.0.1' || h === '::1';
    ssl = local ? false : true;
  }

  if (!host) {
    return null;
  }

  const partial: Partial<ParsedPostgresFields> = {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 5432,
    database,
    username,
    password,
    ssl,
  };

  return { partial, warnings };
}

/**
 * Parse a pasted connection string and return fields to merge into the connector form.
 */
export function parsePostgresConnectionString(input: string): ParsePostgresConnectionStringResult {
  const trimmed = normalizePostgresConnectionStringInput(input);
  if (!trimmed) {
    return { ok: false, error: 'Paste a connection string first.' };
  }

  const uri = tryParseJdbcOrUri(trimmed);
  if (uri) {
    return { ok: true, partial: uri.partial, warnings: uri.warnings };
  }

  const kv = parseKeywordValueConninfo(trimmed);
  if (kv) {
    return { ok: true, partial: kv.partial, warnings: kv.warnings };
  }

  return {
    ok: false,
    error:
      'Could not parse that string. Use a URI (postgresql://…), jdbc:postgresql://…, or key=value form (host=… port=… dbname=… user=… password=…).',
  };
}
