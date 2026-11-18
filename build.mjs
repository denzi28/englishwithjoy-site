// English with Joy build (runs on Vercel): builds dist/ from what is live now and adds the new files in overlay/.
// The live files are downloaded unchanged, apart from Turkish messages turned into English. School Race is not touched.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execSync } from 'node:child_process';
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SITE = path.join(HERE, 'dist'); const LIVE = process.env.LIVE_SITE || 'https://englishwithjoy-cefrdenzi.vercel.app/';
const FILES = ['birthdays/index.html','birthdays/print.html','birthdays/sheet.js','how-many/print.html','how-many/data.js','how-many/index.html','how-many/sheet.js',
  'months/print.html','months/index.html','months/sheet.js','games/feed-the-caterpillar/index.html','games/number-pop/index.html','games/off-to-school/index.html',
  'games/school-race/index.html','people-at-school/index.html','people-at-school/print.html','shared/kit.css','shared/kit.js','shared/people-data.js','shared/print.js'];
const EN = [["Bu cihazda İngilizce ses bulunamadı. Sesler için ElevenLabs dosyalarını ekleyin.","No English voice found on this device."],
 ["Bu cihazda İngilizce ses yok, okuma Türkçe sesle yapılır.","No English voice on this device, so another voice will read aloud."],
 ["Bu tarayıcıda sesli okuma yok. Başlangıçta “Show the word: Yes” seçin.","This browser can't read aloud. Choose “Show the word: Yes” at the start."],
 ["Bu tarayıcıda sesli okuma yok. Chrome ya da Edge ile açmayı deneyin.","This browser can't read aloud. Try Chrome or Edge."],
 ["Akıllı tahtada aç","Open on the smart board"],[">${ICON.print}Yazdır<",">${ICON.print}Print<"],
 ["PDF aracı yüklenemedi. Yazdır penceresinde “PDF olarak kaydet”i seçebilirsin.","The PDF tool didn't load. Use Print and choose “Save as PDF”."],
 ["PDF hazırlanıyor…","Making the PDF…"],["PDF oluşturulamadı. Yazdır → “PDF olarak kaydet” ile de alabilirsin.","Couldn't make the PDF. Use Print → “Save as PDF” instead."]];
const sha1 = (b) => crypto.createHash('sha1').update(b).digest('hex');
fs.rmSync(SITE, { recursive: true, force: true });
for (const f of FILES) {
  const url = LIVE + (f.endsWith('index.html') ? f.slice(0, -10) : f);
  const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(url + ' ' + r.status);
  let buf = Buffer.from(await r.arrayBuffer());
  if (!f.startsWith('games/school-race/')) { let s = buf.toString('utf8'); for (const [a, b] of EN) s = s.split(a).join(b); buf = Buffer.from(s, 'utf8'); }
  fs.mkdirSync(path.dirname(path.join(SITE, f)), { recursive: true }); fs.writeFileSync(path.join(SITE, f), buf);
  console.log('live  ', f, sha1(buf).slice(0, 10));
}
const race = sha1(fs.readFileSync(path.join(SITE, 'games/school-race/index.html')));
if (race !== '6fb8427411c027522dc9a4f2deb2f0dcbb27487e') throw new Error('School Race differs from the live file, stopping: ' + race);
console.log('School Race unchanged');
fs.cpSync(path.join(HERE, 'overlay'), SITE, { recursive: true });
console.log('new files added');
console.log('BUILD OK');
