import { readFileSync, writeFileSync } from "node:fs";

const path = "lib/fundamentals/mock-data.ts";
let s = readFileSync(path, "utf8");

// Peers: remove price + changePercent, keep symbol/name/pe/marketCap
s = s.replace(
  /\{ symbol: "([^"]+)", name: "([^"]+)", price: [^,]+, changePercent: [^,]+, pe: /g,
  '{ symbol: "$1", name: "$2", pe: '
);

writeFileSync(path, s);
const priceLeft = (s.match(/\bprice:/g) || []).length;
const changeLeft = (s.match(/\bchangePercent:/g) || []).length;
console.log({ priceLeft, changeLeft, has2890: s.includes("2890") });
