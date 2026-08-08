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
const bookmarklet = "javascript:(function(){var u='" + cdnUrl + "',h=u.replace(/frases-prontas(?:\\.min)?\\.js(?:\\?.*)?$/,'sync.html#hub');try{window.__jiraFrasesV4Hub=window.open(h,'jira_frases_v4_sync_hub','popup,width=360,height=240,left=24,top=24');}catch(e){}var s=document.createElement('script');s.src=u+'?v='+Date.now();s.charset='UTF-8';document.body.appendChild(s);}());\n";

fs.writeFileSync(minPath, built, "utf8");
fs.writeFileSync(bookmarkletPath, bookmarklet, "utf8");
fs.writeFileSync(configPath, [
  "Repositorio: attgiasi/SAC-PREVENCAO",
  "Pasta correta: JIRA/FRASES/V4",
  "Dados editaveis: JIRA/FRASES/V4/frases-data.json",
  "Ponte de sincronizacao: JIRA/FRASES/V4/sync.html",
  "Hub compartilhado: JIRA/FRASES/V4/sync.html#hub",
  "Arquivo CDN:",
  cdnUrl,
  ""
].join("\n"), "utf8");

console.log("Arquivos gerados:");
console.log("- " + minPath);
console.log("- " + bookmarkletPath);
console.log("- " + configPath);
