const fs = require("fs");
const path = require("path");

const root = __dirname;
const sourcePath = path.join(root, "frases-prontas.js");
const dataPath = path.join(root, "frases-data.json");
const minPath = path.join(root, "frases-prontas.min.js");
const bookmarkletPath = path.join(root, "frases-prontas-github.bookmarklet.txt");
const configPath = path.join(root, "github-url-config.example.txt");
const cdnUrl = "https://cdn.jsdelivr.net/gh/attgiasi/SAC-PREVENCAO@main/JIRA/FRASES/V4/frases-prontas.min.js";
const marker = 'let BASE_DATA = {"topics":[]};';

const source = fs.readFileSync(sourcePath, "utf8").trim() + "\n";
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

if (!source.includes(marker)) {
  throw new Error("Marcador de dados não encontrado em frases-prontas.js.");
}

const built = source.replace(marker, `let BASE_DATA = ${JSON.stringify(data)};`);
const bookmarklet = "javascript:(function(){var s=document.createElement('script');s.src='" + cdnUrl + "?v='+Date.now();s.charset='UTF-8';document.body.appendChild(s);}());\n";

fs.writeFileSync(minPath, built, "utf8");
fs.writeFileSync(bookmarkletPath, bookmarklet, "utf8");
fs.writeFileSync(configPath, [
  "Repositorio: attgiasi/SAC-PREVENCAO",
  "Pasta correta: JIRA/FRASES/V4",
  "Dados editaveis: JIRA/FRASES/V4/frases-data.json",
  "Arquivo CDN:",
  cdnUrl,
  ""
].join("\n"), "utf8");

console.log("Arquivos gerados:");
console.log("- " + minPath);
console.log("- " + bookmarkletPath);
console.log("- " + configPath);
