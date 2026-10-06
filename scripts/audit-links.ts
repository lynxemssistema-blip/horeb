import fs from "fs";
import path from "path";

// 1. Coletar rotas válidas existentes em app/
function getRoutes(dir: string, base: string = ""): string[] {
  const routes: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      if (item.name.startsWith("(") && item.name.endsWith(")")) {
        routes.push(...getRoutes(path.join(dir, item.name), base));
      } else if (item.name === "api") {
        // api route
      } else {
        routes.push(...getRoutes(path.join(dir, item.name), base + "/" + item.name));
      }
    } else if (
      item.name === "page.tsx" ||
      item.name === "page.jsx" ||
      item.name === "page.js" ||
      item.name === "page.ts"
    ) {
      routes.push(base || "/");
    }
  }
  return routes;
}

const validRoutes = getRoutes("app");
console.log(`[INFO] Rotas válidas no App Router (${validRoutes.length}):`);
validRoutes.sort().forEach((r) => console.log(`  - ${r}`));

// 2. Construtor de Matchers de rota
function routeRegex(pattern: string): RegExp {
  const regexStr =
    "^" +
    pattern
      .replace(/\[\.\.\.[^\]]+\]/g, "(.+)")
      .replace(/\[[^\]]+\]/g, "([^\\/\\?#]+)") +
    "(\\?.*)?(#.*)?$";
  return new RegExp(regexStr);
}

const matchers = validRoutes.map((r) => ({ pattern: r, regex: routeRegex(r) }));

function isRouteValid(url: string): boolean {
  if (!url) return true;
  // Externos, âncoras, esquemas especiais
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("javascript:") ||
    url.startsWith("#") ||
    url.startsWith("data:")
  ) {
    return true;
  }
  // Rotas de API internas
  if (url.startsWith("/api/")) return true;

  // Limpar query e fragment
  const cleanUrl = url.split("?")[0].split("#")[0];

  for (const m of matchers) {
    if (m.regex.test(cleanUrl)) return true;
  }
  return false;
}

// 3. Varrer arquivos de código
function scanCodeFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (
      e.name === "node_modules" ||
      e.name === ".next" ||
      e.name === ".git" ||
      e.name === "tests" ||
      e.name === "scripts" ||
      e.name === "test-results"
    ) {
      continue;
    }
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...scanCodeFiles(full));
    } else if (
      e.name.endsWith(".tsx") ||
      e.name.endsWith(".ts") ||
      e.name.endsWith(".jsx") ||
      e.name.endsWith(".js")
    ) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = scanCodeFiles(".");
console.log(`\n[INFO] Analisando ${allFiles.length} arquivos fonte por links...`);

interface LinkOccurrence {
  file: string;
  line: number;
  raw: string;
  simulated: string;
  reason: string;
}

const brokenLinks: LinkOccurrence[] = [];
const verifiedLinks = new Set<string>();

allFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((lineText, lineIdx) => {
    // 1. Template literals: href={`...`}
    const tplMatches = lineText.matchAll(/href=\{`([^`]+)`\}/g);
    for (const match of tplMatches) {
      const raw = match[1];
      // simular slugs de teste
      const simulated = raw
        .replace(/\$\{[^}]*slug[^}]*\}/gi, "matriz")
        .replace(/\$\{[^}]*id[^}]*\}/gi, "item-123")
        .replace(/\$\{[^}]*\}/g, "test-param");

      verifiedLinks.add(simulated);
      if (!isRouteValid(simulated)) {
        brokenLinks.push({
          file: filePath,
          line: lineIdx + 1,
          raw,
          simulated,
          reason: `Rota simulada "${simulated}" não corresponde a nenhuma página em app/`,
        });
      }
    }

    // 2. String literals: href="..." ou href='...'
    const strMatches = lineText.matchAll(/href=["']([^"']+)["']/g);
    for (const match of strMatches) {
      const raw = match[1];
      if (raw.startsWith("{") || raw.includes("${")) continue;
      verifiedLinks.add(raw);
      if (!isRouteValid(raw)) {
        brokenLinks.push({
          file: filePath,
          line: lineIdx + 1,
          raw,
          simulated: raw,
          reason: `Rota estática "${raw}" não corresponde a nenhuma página em app/`,
        });
      }
    }

    // 3. router.push(...) ou redirect(...)
    const navMatches = lineText.matchAll(/(?:router\.push|redirect)\s*\(\s*[`"']([^`"']+)["'`]/g);
    for (const match of navMatches) {
      const raw = match[1];
      const simulated = raw
        .replace(/\$\{[^}]*slug[^}]*\}/gi, "matriz")
        .replace(/\$\{[^}]*id[^}]*\}/gi, "item-123")
        .replace(/\$\{[^}]*\}/g, "test-param");

      verifiedLinks.add(simulated);
      if (!isRouteValid(simulated)) {
        brokenLinks.push({
          file: filePath,
          line: lineIdx + 1,
          raw,
          simulated,
          reason: `Redirecionamento/Push "${simulated}" não corresponde a nenhuma página em app/`,
        });
      }
    }
  });
});

console.log(`\n============================================================`);
console.log(`RELATÓRIO DE AUDITORIA ESTÁTICA DE LINKS:`);
console.log(`Total de links únicos verificados: ${verifiedLinks.size}`);
console.log(`Total de links com problemas detectados: ${brokenLinks.length}`);
console.log(`============================================================\n`);

if (brokenLinks.length > 0) {
  brokenLinks.forEach((b, idx) => {
    console.log(
      `${idx + 1}. [${b.file}:${b.line}]\n   Original: ${b.raw}\n   Simulado: ${b.simulated}\n   Motivo: ${b.reason}\n`
    );
  });
} else {
  console.log("✅ Nenhum link quebrado encontrado na análise de código!");
}
