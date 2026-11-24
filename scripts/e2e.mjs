// Teste ponta a ponta: node scripts/e2e.mjs [baseURL]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:3100';
const SHOTS = process.env.SHOTS || 'test-results';
let fail = 0;
const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fail++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// ---------------- FÁCIL ----------------
await page.goto(BASE);
await page.getByRole('button', { name: 'Abrir um caso' }).click();
await page.getByRole('radio', { name: /Fácil/ }).click();
await page.getByRole('button', { name: 'Jogar o caso de demonstração' }).click();
await page.getByText('CASO Nº 0417').first().waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/01-abertura.png` });
await page.getByRole('button', { name: 'Pular abertura' }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
ok(await page.getByText('Sua missão').isVisible(), 'missão aparece antes da escolha de tempo');
await page.getByText('Quanto tempo você quer para investigar?').waitFor();
await page.screenshot({ path: `${SHOTS}/02-missao.png` });
await page.getByRole('radio', { name: /15 min/ }).click();
await page.getByRole('button', { name: 'Começar a investigação' }).click();
await page.getByText('Aqui estão suas primeiras pistas').waitFor();
ok(!(await page.locator('[role=timer]').count()), 'cronômetro não roda durante a transição');
await page.getByText('Pistas desta etapa').waitFor();
const t1 = await page.locator('[role=timer]').textContent();
ok(/^1[45]:\d\d$/.test(t1), `cronômetro começou com as pistas (${t1})`);

// primeira pista: foto, ampliar e virar
await page.locator('[data-clue="foto-cabine"]').click();
await page.getByRole('button', { name: 'Ampliar: Post-it amarelo' }).click();
ok(await page.getByText('ALARME — 5512').isVisible(), 'ampliar detalhe da foto');
await page.getByRole('button', { name: /Virar/ }).click();
await page.waitForTimeout(600);
ok(await page.getByText('Tirei esta foto assim que subi').isVisible(), 'virar a foto mostra o verso');
await page.screenshot({ path: `${SHOTS}/03-pista-verso.png` });
await page.getByRole('button', { name: /Comparar/ }).click();
await page.getByRole('option', { name: /Registro do servidor/ }).click();
ok(await page.locator('.viewer-body.compare .pane').count() === 2, 'comparação lado a lado');
await page.screenshot({ path: `${SHOTS}/04-comparar.png` });
await page.keyboard.press('Escape');
const t0 = Date.now();
await page.locator('[data-clue="foto-cabine"]').click();
await page.locator('.viewer').waitFor();
ok(Date.now() - t0 < 1000, `reabrir pista é rápido (${Date.now() - t0} ms)`);
await page.keyboard.press('Escape');

// etapa 1: erro -> dica; acerto -> descoberta
await page.getByRole('radio', { name: /Caio programou/ }).click();
await page.getByRole('button', { name: 'Responder' }).click();
await page.getByText('Ainda não.').waitFor();
ok(true, 'resposta errada mostra dica');
await page.getByRole('radio', { name: /A energia caiu/ }).click();
await page.getByRole('button', { name: 'Responder' }).click();
await page.getByText('Descoberta').waitFor();
await page.screenshot({ path: `${SHOTS}/05-descoberta.png` });
await page.getByRole('button', { name: 'Abrir etapa 2' }).click();
await page.getByRole('heading', { name: 'O código colado no monitor' }).waitFor();

// recarregar preserva etapa e prazo
await page.waitForTimeout(2200);
await page.reload();
await page.getByRole('heading', { name: 'O código colado no monitor' }).waitFor();
const t2 = await page.locator('[role=timer]').textContent();
const sec = (t) => +t.split(':')[0] * 60 + +t.split(':')[1];
ok(sec(t2) < sec(t1) && sec(t2) > sec(t1) - 120, `recarregar preserva a etapa e o prazo (${t1} → ${t2})`);

// áudio: transcrição sempre presente
await page.locator('[data-clue="audio-raimundo"]').click();
ok(await page.getByText('Transcrição').isVisible(), 'gravação tem transcrição integral');
await page.keyboard.press('Escape');

await page.getByRole('radio', { name: /Outra pessoa usou/ }).click();
await page.getByRole('button', { name: 'Responder' }).click();
await page.getByRole('button', { name: 'Abrir etapa 3' }).click();
await page.getByRole('radio', { name: /Não saí/ }).click();
await page.getByRole('button', { name: 'Responder' }).click();
await page.getByRole('button', { name: 'Ir para a conclusão' }).click();
await page.locator('[data-clue="ingresso"]').click();
await page.getByRole('button', { name: /Virar/ }).click();
ok(await page.getByText(/2 – 7 – 1 – 9/).isVisible(), 'ingresso tem a senha no verso');
await page.keyboard.press('Escape');

for (const re of [/Otávio Reis/, /Entrou com a própria chave/, /desligar as câmeras/, /desacreditar a gestão/]) {
  await page.getByRole('radio', { name: re }).click();
  await page.getByRole('button', { name: 'Próxima' }).click();
}
for (const t of ['Cupom — Posto Aurora 24h', 'Pedido de reembolso — Festival de Inverno', 'Registro da central de alarme', 'Grupo “Niver da Bia”', 'Ingresso — sessão de encerramento', 'Agenda do escritório', 'Carta da Incorporadora Vértice', 'Registro do servidor de projeção', 'Quadro de luz'])
  await page.locator('.chip', { hasText: t }).click();
await page.getByRole('button', { name: 'Apresentar acusação' }).click();
await page.getByText('Caso resolvido.').waitFor();
await page.waitForTimeout(4800);
await page.screenshot({ path: `${SHOTS}/06-desfecho.png`, fullPage: true });
ok(await page.getByRole('link', { name: 'Investigar outro caso' }).isVisible(), 'desfecho termina com "Investigar outro caso"');
ok(await page.getByText('Um caso novo, sempre que você quiser.').isVisible(), 'assinatura apresentada após a demonstração');

// tempo esgotado: continua sem revelar solução
await page.goto(`${BASE}/caso/demo/medio`);
await page.getByRole('button', { name: 'Pular abertura' }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('radio', { name: /Personalizado/ }).click();
await page.getByLabel('Minutos').fill('5');
await page.getByRole('button', { name: 'Começar a investigação' }).click();
await page.getByText('Quem você quer ouvir?').waitFor();
await page.evaluate(() => {
  const k = 'alibi:game:demo:medio';
  const s = JSON.parse(localStorage.getItem(k));
  s.startedAt = Date.now() - 6 * 60000;
  s.notes = { 'log-servidor': 'minha nota' };
  localStorage.setItem(k, JSON.stringify(s));
});
await page.reload();
await page.getByText('Tempo esgotado.').waitFor();
ok(!(await page.getByText('Otávio Reis roubou').count()), 'tempo esgotado não revela a solução');
await page.getByRole('button', { name: 'Continuar', exact: true }).click();
await page.locator('[data-clue="log-servidor"]').click();
ok((await page.locator('textarea#note-log-servidor').inputValue()) === 'minha nota', 'anotações preservadas após esgotar o tempo');
await page.keyboard.press('Escape');
// médio: ouvir + conectar
await page.getByRole('button', { name: 'Ouvir' }).nth(4).click();
await page.getByRole('button', { name: 'Selecionar Registro do servidor de projeção' }).click();
await page.getByRole('button', { name: 'Selecionar Quadro de luz' }).click();
await page.getByRole('radio', { name: /cortou a energia de propósito/ }).click();
await page.getByRole('button', { name: 'Verificar relação' }).click();
await page.getByText(/Dedução registrada/).waitFor();
ok(await page.locator('[data-clue="log-alarme"]').count() === 1, 'Médio: dedução libera nova evidência');
await page.screenshot({ path: `${SHOTS}/07-medio.png` });

// difícil: confronto desbloqueia declaração em aba nova
await page.goto(`${BASE}/caso/demo/dificil`);
await page.getByRole('button', { name: 'Pular abertura' }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('radio', { name: /Sem limite/ }).click();
await page.getByRole('button', { name: 'Começar a investigação' }).click();
await page.getByRole('tab', { name: 'Confrontar' }).click();
await page.getByRole('button', { name: /Otávio Reis/ }).click();
await page.getByLabel('Evidência').selectOption('recibo-posto');
await page.getByRole('button', { name: 'Confrontar', exact: true }).click();
await page.getByRole('tab', { name: /Novas declarações \(1\)/ }).waitFor();
ok(true, 'Difícil: confronto pertinente cria aba com nova declaração');
await page.getByRole('tab', { name: 'Cronologia' }).click();
await page.screenshot({ path: `${SHOTS}/08-dificil-cronologia.png` });

// ---------------- EXTREME ----------------
await page.goto(`${BASE}/caso/demo/extreme`);
await page.getByRole('button', { name: 'Pular abertura' }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('radio', { name: /Sem limite/ }).click();
await page.getByRole('button', { name: 'Começar a investigação' }).click();
await page.locator('.bcard').first().waitFor();
await page.waitForTimeout(400);
ok((await page.locator('.bcard').count()) === 20, 'Extreme: 20 pistas na mesa');
const card = (id) => page.locator(`[data-bcard="${id}"]`);
// arrastar
const b0 = await card('recibo-posto').boundingBox();
await page.mouse.move(b0.x + 60, b0.y + 40);
await page.mouse.down();
await page.mouse.move(b0.x + 160, b0.y + 120, { steps: 8 });
await page.mouse.up();
const b1 = await card('recibo-posto').boundingBox();
ok(Math.abs(b1.x - b0.x - 100) < 6, 'Extreme: arrastar cartão');
// cor com legenda
await card('log-alarme').locator('.cluecard').click();
await page.keyboard.down('Shift');
await card('log-servidor').locator('.cluecard').click();
await page.keyboard.up('Shift');
await page.locator('.legend-row').first().locator('button').click();
await page.locator('.legend-row').first().locator('input').fill('horário duvidoso');
// ligar com linha rotulada (arrastando o ponto)
const h = await card('log-alarme').locator('.handle').boundingBox();
const tgt = await card('log-servidor').boundingBox();
await page.mouse.move(h.x + 9, h.y + 9);
await page.mouse.down();
await page.mouse.move(tgt.x + 100, tgt.y + 50, { steps: 10 });
ok(await page.locator('.links line.draft').count() === 1, 'Extreme: linha acompanha o cursor');
await page.mouse.up();
await page.getByPlaceholder(/Rótulo da ligação/).fill('os relógios discordam');
await page.keyboard.press('Enter');
ok(await page.locator('.linklabel', { hasText: 'os relógios discordam' }).isVisible(), 'Extreme: ligação rotulada criada');
// grupo + nota
await card('ingresso').locator('.cluecard').click();
await page.keyboard.down('Shift');
await card('agenda-escritorio').locator('.cluecard').click();
await page.keyboard.up('Shift');
await page.getByRole('button', { name: 'Agrupar' }).click();
await page.getByPlaceholder('Nome do grupo').fill('Senha do cofre');
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'Nova nota' }).click();
await page.getByLabel('Nota', { exact: true }).first().fill('Quem sabia do post-it?');
await page.getByRole('button', { name: 'Aproximar' }).click();
await page.getByRole('button', { name: 'Enquadrar todas as pistas' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/09-extreme-mesa.png` });
// recarregar preserva tudo
await page.reload();
await page.locator('.bcard').first().waitFor();
ok(await page.locator('.linklabel', { hasText: 'os relógios discordam' }).isVisible(), 'recarga preserva ligação');
ok((await page.locator('.legend-row input').first().inputValue()) === 'horário duvidoso', 'recarga preserva legenda de cor');
ok(await page.locator('.bgroup', { hasText: 'Senha do cofre' }).count() === 1, 'recarga preserva grupo');
ok((await page.getByLabel('Nota', { exact: true }).first().inputValue()) === 'Quem sabia do post-it?', 'recarga preserva nota');
ok(await card('log-alarme').locator('.tags i').count() === 1, 'recarga preserva cor do cartão');
// todas as pistas visíveis após enquadrar
await page.getByRole('button', { name: 'Enquadrar todas as pistas' }).click();
await page.waitForTimeout(200);
const vp = page.viewportSize();
const boxes = await page.locator('.bcard').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.top, r.right, r.bottom]));
ok(boxes.every(([l, t, r, b]) => l >= 0 && t >= 0 && r <= vp.width && b <= vp.height), 'enquadrar mostra todas as pistas');
// relatório
await page.getByRole('button', { name: 'Escrever relatório e acusar' }).click();
await page.getByText('Relatório de investigação').waitFor();
await page.getByRole('radio', { name: /Helena Duarte/ }).click();
await page.getByRole('radio', { name: /Forçou a porta/ }).click();
await page.getByRole('radio', { name: /trocar o filme/ }).click();
await page.getByRole('radio', { name: /quitar uma dívida/ }).click();
await page.locator('.chip', { hasText: 'Bilhete de Marta' }).click();
await page.getByPlaceholder(/Conte o que aconteceu/).fill('Acho que foi a Helena.');
await page.getByRole('button', { name: 'Apresentar acusação' }).click();
await page.getByText('O culpado escapou.').waitFor();
ok(await page.getByText('Como perceber:').first().isVisible(), 'desfecho mostra como perceber o que faltou');
await page.waitForTimeout(4800);
await page.screenshot({ path: `${SHOTS}/10-extreme-desfecho.png`, fullPage: true });

// ---------------- CELULAR ----------------
const m = await browser.newContext({ ...require('playwright').devices['iPhone 13'] });
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push(e.message));
await mp.goto(BASE);
await mp.screenshot({ path: `${SHOTS}/11-celular-inicio.png` });
await mp.goto(`${BASE}/caso/demo/extreme`);
await mp.getByRole('button', { name: 'Pular abertura' }).click();
await mp.getByRole('button', { name: 'Continuar' }).click();
await mp.getByRole('radio', { name: /Sem limite/ }).click();
await mp.getByRole('button', { name: 'Começar a investigação' }).click();
await mp.locator('.listitem').first().waitFor();
ok((await mp.locator('.listitem').count()) === 20, 'celular: visão em lista com todas as pistas');
await mp.locator('.listitem').first().getByRole('button', { name: 'Abrir' }).click();
await mp.locator('.viewer').waitFor();
await mp.screenshot({ path: `${SHOTS}/12-celular-pista.png` });
await mp.keyboard.press('Escape');
const docW = await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(docW, 'celular: sem rolagem horizontal');
await mp.screenshot({ path: `${SHOTS}/13-celular-lista.png` });

ok(errors.length === 0, `sem erros de JavaScript${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
if (fail) { console.log(`\n${fail} falha(s)`); process.exit(1); }
console.log('\nE2E ok.');
