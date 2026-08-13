// Direct test of strip regex
const stripRe = /\s+(?:para|a\s+nombre\s+de|entreg(?:ar(?:le)?|a)\s+a)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][\s\S]*$/i;

const tests = [
  "2 sanguches para roberto",
  "2 sanguches para María González",
  "2 sanguches para Roberto",
  "Hola María, 2 sanguches para Roberto",
];

for (const t of tests) {
  const m = t.match(stripRe);
  console.log(`"${t}"`);
  console.log("  match:", m ? `"${m[0]}"` : "no match");
  const replaced = t.replace(stripRe, "");
  console.log("  replaced:", JSON.stringify(replaced));
}