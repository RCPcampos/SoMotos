// ══════════════════════════════════════════════
//   MotoGastos Pro - App Logic
// ══════════════════════════════════════════════

let donutChart = null;
let barChart = null;
let lineChart = null;
let deferredInstall = null;
let mesSelecionado = new Date();
let ultimoResultado = null;

// ── INIT ──
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
    const app = document.getElementById('app');
    app.style.opacity = '1';
  }, 1400);

  carregarConfig();
  atualizarDataHoje();
  renderHistorico();
  atualizarMensal();
  atualizarContador();
  document.getElementById('mesSelecionado').textContent = formatarMes(mesSelecionado);
});

// ── PWA Install ──
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  document.getElementById('installBanner').style.display = 'flex';
});

function installApp() {
  if (deferredInstall) {
    deferredInstall.prompt();
    deferredInstall.userChoice.then(() => {
      deferredInstall = null;
      document.getElementById('installBanner').style.display = 'none';
    });
  }
}

// ── DATE ──
function atualizarDataHoje() {
  const d = new Date();
  document.getElementById('dataHoje').textContent = d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ── TABS ──
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .tnav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + tab).classList.add('active');

  const navBtn = document.getElementById('nav-' + tab);
  if (navBtn) navBtn.classList.add('active');
  const sideBtn = document.getElementById('side-' + tab);
  if (sideBtn) sideBtn.classList.add('active');

  // Scroll para o topo ao trocar de aba
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (tab === 'mensal') atualizarMensal();
  if (tab === 'historico') renderHistorico();
  if (tab === 'config') atualizarContador();
}

// ── CONFIG ──
function salvarConfig() {
  const cfg = {
    consumo: parseFloat(document.getElementById('cfg-consumo').value) || 35,
    vidaPneu: parseFloat(document.getElementById('cfg-vidaPneu').value) || 20000,
    custoPneu: parseFloat(document.getElementById('cfg-custoPneu').value) || 350,
    vidaRelacao: parseFloat(document.getElementById('cfg-vidaRelacao').value) || 20000,
    custoRelacao: parseFloat(document.getElementById('cfg-custoRelacao').value) || 280,
    ipva: parseFloat(document.getElementById('cfg-ipva').value) || 0,
    seguro: parseFloat(document.getElementById('cfg-seguro').value) || 0,
  };
  localStorage.setItem('motogastos_config', JSON.stringify(cfg));
}

function carregarConfig() {
  const raw = localStorage.getItem('motogastos_config');
  if (!raw) return;
  const cfg = JSON.parse(raw);
  if (cfg.consumo) document.getElementById('cfg-consumo').value = cfg.consumo;
  if (cfg.vidaPneu) document.getElementById('cfg-vidaPneu').value = cfg.vidaPneu;
  if (cfg.custoPneu) document.getElementById('cfg-custoPneu').value = cfg.custoPneu;
  if (cfg.vidaRelacao) document.getElementById('cfg-vidaRelacao').value = cfg.vidaRelacao;
  if (cfg.custoRelacao) document.getElementById('cfg-custoRelacao').value = cfg.custoRelacao;
  if (cfg.ipva) { document.getElementById('cfg-ipva').value = cfg.ipva; atualizarDiario('ipva'); }
  if (cfg.seguro) { document.getElementById('cfg-seguro').value = cfg.seguro; atualizarDiario('seguro'); }
}

function getConfig() {
  const raw = localStorage.getItem('motogastos_config');
  return raw ? JSON.parse(raw) : {
    consumo: 35, vidaPneu: 20000, custoPneu: 350,
    vidaRelacao: 20000, custoRelacao: 280, ipva: 0, seguro: 0
  };
}

function atualizarDiario(tipo) {
  const val = parseFloat(document.getElementById('cfg-' + tipo).value) || 0;
  const diario = val / 365;
  document.getElementById('diario-' + tipo).textContent = fmt(diario);
}

// ── HODÔMETRO ──
function onHodoChange() {
  const ini = parseFloat(document.getElementById('hodoInicio').value) || 0;
  const fim = parseFloat(document.getElementById('hodoFim').value) || 0;
  const diff = fim - ini;
  if (diff > 0) {
    document.getElementById('kmTotal').textContent = diff.toFixed(1) + ' km';
  } else {
    document.getElementById('kmTotal').textContent = '— km';
  }
}

// ── CALCULAR ──
function calcular() {
  const hodoIni = parseFloat(document.getElementById('hodoInicio').value) || 0;
  const hodoFim = parseFloat(document.getElementById('hodoFim').value) || 0;
  const vlrLitro = parseFloat(document.getElementById('vlrLitro').value) || 0;
  const ganho = parseFloat(document.getElementById('ganhoDia').value) || 0;

  const custoOleo = parseFloat(document.getElementById('custoOleo').value) || 0;
  const custoManut = parseFloat(document.getElementById('custoManutencao').value) || 0;
  const custoIpvaDia = parseFloat(document.getElementById('custoIpva').value) || 0;
  const custoSeguroDia = parseFloat(document.getElementById('custoSeguro').value) || 0;

  if (hodoFim <= hodoIni) {
    toast('❌ Hodômetro final deve ser maior que o inicial!');
    return;
  }
  if (!vlrLitro) { toast('⛽ Informe o valor do litro!'); return; }
  if (!ganho) { toast('💰 Informe o ganho do dia!'); return; }

  const cfg = getConfig();
  const km = hodoFim - hodoIni;
  const litros = km / cfg.consumo;
  const gastoGas = litros * vlrLitro;
  const gastoPneu = (km / cfg.vidaPneu) * cfg.custoPneu;
  const gastoRelacao = (km / cfg.vidaRelacao) * cfg.custoRelacao;

  const totalGastos = gastoGas + gastoPneu + gastoRelacao + custoOleo + custoManut + custoIpvaDia + custoSeguroDia;
  const ganhoReal = ganho - totalGastos;
  const pctLucro = ganho > 0 ? (ganhoReal / ganho) * 100 : 0;

  ultimoResultado = {
    data: new Date().toISOString(),
    km, hodoIni, hodoFim, vlrLitro, ganho,
    gastoGas, gastoPneu, gastoRelacao,
    custoOleo, custoManut, custoIpvaDia, custoSeguroDia,
    totalGastos, ganhoReal, litros
  };

  // Hero
  const hero = document.getElementById('heroResult');
  document.getElementById('heroValor').textContent = fmt(ganhoReal);
  document.getElementById('heroSub').textContent = ganhoReal >= 0
    ? `✅ ${pctLucro.toFixed(1)}% de margem de lucro`
    : `⚠️ Prejuízo de ${fmt(Math.abs(ganhoReal))} hoje`;
  hero.className = 'hero-result ' + (ganhoReal >= 0 ? 'hero-positive' : 'hero-negative');

  // Breakdown
  document.getElementById('b-ganho').textContent = fmt(ganho);
  document.getElementById('b-gas').textContent = '- ' + fmt(gastoGas);
  document.getElementById('b-gas-det').textContent = `${litros.toFixed(2)}L × R$${vlrLitro.toFixed(2)} (${km.toFixed(1)}km ÷ ${cfg.consumo}km/L)`;
  document.getElementById('b-pneu').textContent = '- ' + fmt(gastoPneu);
  document.getElementById('b-pneu-det').textContent = `R$${(cfg.custoPneu/cfg.vidaPneu).toFixed(4)}/km × ${km.toFixed(1)}km`;
  document.getElementById('b-relacao').textContent = '- ' + fmt(gastoRelacao);
  document.getElementById('b-relacao-det').textContent = `R$${(cfg.custoRelacao/cfg.vidaRelacao).toFixed(4)}/km × ${km.toFixed(1)}km`;

  toggleRow('row-oleo', custoOleo, 'b-oleo', custoOleo);
  toggleRow('row-manut', custoManut, 'b-manut', custoManut);
  toggleRow('row-ipva', custoIpvaDia, 'b-ipva', custoIpvaDia);
  toggleRow('row-seguro', custoSeguroDia, 'b-seguro', custoSeguroDia);

  document.getElementById('b-total').textContent = '- ' + fmt(totalGastos);

  // Donut chart
  renderDonut(gastoGas, gastoPneu, gastoRelacao, custoOleo, custoManut, custoIpvaDia, custoSeguroDia, Math.max(0, ganhoReal));
  document.getElementById('dc-total').textContent = fmtShort(totalGastos);

  // Efficiency bars
  renderEfficiency(ganho, gastoGas, gastoPneu, gastoRelacao, custoOleo + custoManut + custoIpvaDia + custoSeguroDia, ganhoReal);

  // Show results
  const resultados = document.getElementById('resultados');
  resultados.style.display = 'block';
  setTimeout(() => resultados.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function toggleRow(rowId, val, valId, amount) {
  const row = document.getElementById(rowId);
  if (val > 0) {
    row.style.display = 'flex';
    document.getElementById(valId).textContent = '- ' + fmt(amount);
  } else {
    row.style.display = 'none';
  }
}

// ── DONUT CHART ──
function renderDonut(gas, pneu, relacao, oleo, manut, ipva, seguro, lucro) {
  if (donutChart) { donutChart.destroy(); donutChart = null; }

  const labels = ['⛽ Gasolina','🔘 Pneu','⛓️ Relação'];
  const data = [gas, pneu, relacao];
  const colors = ['#f97316','#60a5fa','#a78bfa'];

  if (oleo > 0) { labels.push('🛢️ Óleo'); data.push(oleo); colors.push('#fbbf24'); }
  if (manut > 0) { labels.push('🔧 Manutenção'); data.push(manut); colors.push('#34d399'); }
  if (ipva > 0) { labels.push('📋 IPVA'); data.push(ipva); colors.push('#f472b6'); }
  if (seguro > 0) { labels.push('🛡️ Seguro'); data.push(seguro); colors.push('#818cf8'); }
  if (lucro > 0) { labels.push('✅ Lucro'); data.push(lucro); colors.push('#22d3a0'); }

  const total = data.reduce((a,b) => a+b, 0);

  const ctx = document.getElementById('donutChart').getContext('2d');
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#13131a', hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '68%',
      animation: { animateRotate: true, duration: 1000 },
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: (ctx) => ` ${fmt(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)`
      }}}
    }
  });

  // Legend
  const legend = document.getElementById('chartLegend');
  legend.innerHTML = labels.map((l, i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span class="legend-name">${l}</span>
      <span class="legend-val">${fmt(data[i])}</span>
      <span class="legend-pct">${((data[i]/total)*100).toFixed(1)}%</span>
    </div>
  `).join('');
}

// ── EFFICIENCY BARS ──
function renderEfficiency(ganho, gas, pneu, relacao, extras, lucro) {
  const items = [
    { name: '⛽ Gasolina', val: gas, color: '#f97316' },
    { name: '🔘 Pneu + Relação', val: pneu + relacao, color: '#60a5fa' },
    { name: '🔧 Outros custos', val: extras, color: '#a78bfa' },
    { name: '✅ Lucro líquido', val: Math.max(0, lucro), color: '#22d3a0' },
  ];

  const container = document.getElementById('efficiencyBars');
  container.innerHTML = items.map(item => {
    const pct = ganho > 0 ? Math.min(100, Math.max(0, (item.val / ganho) * 100)) : 0;
    return `
      <div class="eff-item">
        <div class="eff-top">
          <span class="eff-name">${item.name}</span>
          <span class="eff-pct" style="color:${item.color}">${fmt(item.val)} — ${pct.toFixed(1)}%</span>
        </div>
        <div class="eff-bar-bg">
          <div class="eff-bar-fill" style="background:${item.color};width:0" data-target="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  setTimeout(() => {
    document.querySelectorAll('.eff-bar-fill').forEach(b => {
      b.style.width = b.dataset.target + '%';
    });
  }, 200);
}

// ── SALVAR ──
function salvarDia() {
  if (!ultimoResultado) { toast('⚠️ Calcule primeiro!'); return; }
  const historico = getHistorico();

  // Verificar se já existe entrada para hoje
  const hoje = new Date().toDateString();
  const idx = historico.findIndex(h => new Date(h.data).toDateString() === hoje);
  if (idx >= 0) {
    historico[idx] = ultimoResultado;
    toast('✅ Registro de hoje atualizado!');
  } else {
    historico.unshift(ultimoResultado);
    toast('💾 Dia salvo no histórico!');
  }

  localStorage.setItem('motogastos_historico', JSON.stringify(historico));
  atualizarContador();
}

function getHistorico() {
  const raw = localStorage.getItem('motogastos_historico');
  return raw ? JSON.parse(raw) : [];
}

// ── RENDER HISTÓRICO ──
function renderHistorico() {
  const historico = getHistorico();
  const container = document.getElementById('historicoList');

  if (historico.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-ico">📭</div><p>Nenhum registro ainda.<br>Calcule e salve seu primeiro dia!</p></div>`;
    return;
  }

  container.innerHTML = historico.map((h, i) => {
    const d = new Date(h.data);
    const dia = d.getDate().toString().padStart(2,'0');
    const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
    const cor = h.ganhoReal >= 0 ? 'var(--green)' : 'var(--red)';
    return `
      <div class="hist-item">
        <div class="hist-date">
          <div class="hist-date-day">${dia}</div>
          <div class="hist-date-mon">${mes}</div>
        </div>
        <div class="hist-info">
          <div class="hist-km">🛣️ ${h.km?.toFixed(1) || 0} km &nbsp;|&nbsp; ⛽ ${h.litros?.toFixed(2) || 0}L</div>
          <div class="hist-lucro" style="color:${cor}">${fmt(h.ganhoReal)}</div>
          <div class="hist-km">Bruto: ${fmt(h.ganho)} &nbsp;|&nbsp; Gastos: ${fmt(h.totalGastos)}</div>
        </div>
        <button class="hist-del" onclick="deletarRegistro(${i})">🗑️</button>
      </div>
    `;
  }).join('');
}

function deletarRegistro(idx) {
  const historico = getHistorico();
  historico.splice(idx, 1);
  localStorage.setItem('motogastos_historico', JSON.stringify(historico));
  renderHistorico();
  atualizarContador();
  toast('🗑️ Registro removido');
}

function limparHistorico() {
  if (!confirm('Apagar todo o histórico?')) return;
  localStorage.removeItem('motogastos_historico');
  renderHistorico();
  atualizarContador();
  toast('🗑️ Histórico limpo');
}

function confirmarLimparTudo() {
  if (!confirm('⚠️ Apagar TODOS os dados? Isso não pode ser desfeito.')) return;
  localStorage.clear();
  toast('✅ Dados apagados!');
  setTimeout(() => location.reload(), 1000);
}

function atualizarContador() {
  const historico = getHistorico();
  document.getElementById('registros-count').innerHTML = `<span>📊</span> ${historico.length} registros salvos`;
}

// ── MENSAL ──
function mudarMes(delta) {
  mesSelecionado = new Date(mesSelecionado.getFullYear(), mesSelecionado.getMonth() + delta, 1);
  document.getElementById('mesSelecionado').textContent = formatarMes(mesSelecionado);
  atualizarMensal();
}

function formatarMes(d) {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
}

function atualizarMensal() {
  const historico = getHistorico();
  const ano = mesSelecionado.getFullYear();
  const mes = mesSelecionado.getMonth();

  const registrosMes = historico.filter(h => {
    const d = new Date(h.data);
    return d.getFullYear() === ano && d.getMonth() === mes;
  }).sort((a,b) => new Date(a.data) - new Date(b.data));

  const totalDias = registrosMes.length;
  const totalKm = registrosMes.reduce((s,h) => s + (h.km||0), 0);
  const totalBruto = registrosMes.reduce((s,h) => s + (h.ganho||0), 0);
  const totalGastos = registrosMes.reduce((s,h) => s + (h.totalGastos||0), 0);
  const totalLucro = registrosMes.reduce((s,h) => s + (h.ganhoReal||0), 0);
  const mediaLucro = totalDias > 0 ? totalLucro / totalDias : 0;
  const melhorDia = totalDias > 0 ? Math.max(...registrosMes.map(h => h.ganhoReal||0)) : 0;

  document.getElementById('s-dias').textContent = totalDias;
  document.getElementById('s-km').textContent = totalKm.toFixed(0) + ' km';
  document.getElementById('s-bruto').textContent = fmtShort(totalBruto);
  document.getElementById('s-gastos').textContent = fmtShort(totalGastos);

  const lucroEl = document.getElementById('s-lucro');
  lucroEl.textContent = fmt(totalLucro);
  lucroEl.className = 'stat-value big ' + (totalLucro >= 0 ? 'green' : 'red');

  document.getElementById('s-media').textContent = fmtShort(mediaLucro);
  document.getElementById('s-melhor').textContent = fmtShort(melhorDia);

  renderBarChart(registrosMes);
  renderLineChart(registrosMes);
}

function renderBarChart(registros) {
  if (barChart) { barChart.destroy(); barChart = null; }

  const labels = registros.map(h => new Date(h.data).getDate() + '/' + (new Date(h.data).getMonth()+1));
  const lucros = registros.map(h => parseFloat((h.ganhoReal||0).toFixed(2)));
  const colors = lucros.map(v => v >= 0 ? 'rgba(34,211,160,0.75)' : 'rgba(244,63,94,0.75)');
  const borders = lucros.map(v => v >= 0 ? '#22d3a0' : '#f43f5e');

  const ctx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Lucro Líquido',
        data: lucros,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ' ' + fmt(ctx.parsed.y) } }
      },
      scales: {
        x: { grid: { color: '#2a2a40' }, ticks: { color: '#6b6b8a', font: { size: 10 } } },
        y: { grid: { color: '#2a2a40' }, ticks: { color: '#6b6b8a', font: { size: 10 }, callback: v => fmtShort(v) } }
      }
    }
  });
}

function renderLineChart(registros) {
  if (lineChart) { lineChart.destroy(); lineChart = null; }

  const labels = registros.map(h => new Date(h.data).getDate() + '/' + (new Date(h.data).getMonth()+1));
  let acumulado = 0;
  const dataAcum = registros.map(h => { acumulado += (h.ganhoReal||0); return parseFloat(acumulado.toFixed(2)); });

  const ctx = document.getElementById('lineChart').getContext('2d');
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Acumulado',
        data: dataAcum,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#f97316',
        pointRadius: 4,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ' ' + fmt(ctx.parsed.y) } }
      },
      scales: {
        x: { grid: { color: '#2a2a40' }, ticks: { color: '#6b6b8a', font: { size: 10 } } },
        y: { grid: { color: '#2a2a40' }, ticks: { color: '#6b6b8a', font: { size: 10 }, callback: v => fmtShort(v) } }
      }
    }
  });
}

// ── EXPORTAR PDF (via print) ──
function exportarPDF() {
  if (!ultimoResultado) { toast('⚠️ Calcule primeiro!'); return; }
  const r = ultimoResultado;
  const d = new Date(r.data);
  const dataStr = d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>MotoGastos - Relatório ${d.toLocaleDateString('pt-BR')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  body { font-family: 'Syne', sans-serif; padding: 40px; color: #111; max-width: 680px; margin: 0 auto; }
  .header { border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 36px; font-weight: 800; letter-spacing: 3px; }
  .logo span { color: #f97316; }
  .sub { font-size: 12px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
  .date { font-size: 13px; color: #444; margin-top: 8px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #f97316; margin: 24px 0 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  td:last-child { text-align: right; font-family: 'JetBrains Mono', monospace; }
  .income td:last-child { color: #059669; font-weight: 700; }
  .cost td:last-child { color: #e11d48; }
  .total td { font-weight: 700; background: #f8f8f8; }
  .hero { background: ${r.ganhoReal >= 0 ? '#f0fdf4' : '#fff1f2'}; border: 2px solid ${r.ganhoReal >= 0 ? '#22c55e' : '#f43f5e'}; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
  .hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #666; }
  .hero-val { font-size: 48px; font-weight: 800; font-family: 'JetBrains Mono'; color: ${r.ganhoReal >= 0 ? '#059669' : '#e11d48'}; }
  .hero-sub { font-size: 12px; color: #666; margin-top: 4px; }
  .footer { margin-top: 40px; font-size: 10px; color: #aaa; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">MOTO<span>GASTOS</span></div>
  <div class="sub">Relatório Diário</div>
  <div class="date">${dataStr}</div>
</div>

<div class="hero">
  <div class="hero-label">Ganho Real do Dia</div>
  <div class="hero-val">${fmt(r.ganhoReal)}</div>
  <div class="hero-sub">${r.ganhoReal >= 0 ? '✅ Lucro de ' + ((r.ganhoReal/r.ganho)*100).toFixed(1) + '% sobre o bruto' : '⚠️ Prejuízo no dia'}</div>
</div>

<h2>📍 Hodômetro</h2>
<table>
  <tr><td>Km inicial</td><td>${r.hodoIni?.toLocaleString('pt-BR')} km</td></tr>
  <tr><td>Km final</td><td>${r.hodoFim?.toLocaleString('pt-BR')} km</td></tr>
  <tr><td>Distância percorrida</td><td>${r.km?.toFixed(1)} km</td></tr>
  <tr><td>Litros consumidos</td><td>${r.litros?.toFixed(2)} L</td></tr>
</table>

<h2>💸 Financeiro</h2>
<table>
  <tr class="income"><td>💰 Ganho bruto</td><td>${fmt(r.ganho)}</td></tr>
  <tr class="cost"><td>⛽ Gasolina (${r.litros?.toFixed(2)}L × R$${r.vlrLitro?.toFixed(2)})</td><td>- ${fmt(r.gastoGas)}</td></tr>
  <tr class="cost"><td>🔘 Desgaste pneu</td><td>- ${fmt(r.gastoPneu)}</td></tr>
  <tr class="cost"><td>⛓️ Desgaste relação</td><td>- ${fmt(r.gastoRelacao)}</td></tr>
  ${r.custoOleo > 0 ? `<tr class="cost"><td>🛢️ Óleo/filtro</td><td>- ${fmt(r.custoOleo)}</td></tr>` : ''}
  ${r.custoManut > 0 ? `<tr class="cost"><td>🔧 Manutenção</td><td>- ${fmt(r.custoManut)}</td></tr>` : ''}
  ${r.custoIpvaDia > 0 ? `<tr class="cost"><td>📋 IPVA</td><td>- ${fmt(r.custoIpvaDia)}</td></tr>` : ''}
  ${r.custoSeguroDia > 0 ? `<tr class="cost"><td>🛡️ Seguro</td><td>- ${fmt(r.custoSeguroDia)}</td></tr>` : ''}
  <tr class="total"><td>📊 Total de gastos</td><td>- ${fmt(r.totalGastos)}</td></tr>
</table>

<div class="footer">MotoGastos Pro — Relatório gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
  toast('📄 Relatório aberto para impressão!');
}

function exportarMensalPDF() {
  const historico = getHistorico();
  const ano = mesSelecionado.getFullYear();
  const mes = mesSelecionado.getMonth();
  const registros = historico.filter(h => {
    const d = new Date(h.data);
    return d.getFullYear() === ano && d.getMonth() === mes;
  }).sort((a,b) => new Date(a.data) - new Date(b.data));

  if (registros.length === 0) { toast('⚠️ Nenhum dado neste mês!'); return; }

  const totalBruto = registros.reduce((s,h) => s + (h.ganho||0), 0);
  const totalGastos = registros.reduce((s,h) => s + (h.totalGastos||0), 0);
  const totalKm = registros.reduce((s,h) => s + (h.km||0), 0);
  const totalLucro = registros.reduce((s,h) => s + (h.ganhoReal||0), 0);

  const linhas = registros.map(h => {
    const d = new Date(h.data);
    return `<tr>
      <td>${d.toLocaleDateString('pt-BR')}</td>
      <td>${h.km?.toFixed(0)} km</td>
      <td style="color:#059669">${fmt(h.ganho)}</td>
      <td style="color:#e11d48">- ${fmt(h.totalGastos)}</td>
      <td style="color:${h.ganhoReal >= 0 ? '#059669':'#e11d48'};font-weight:700">${fmt(h.ganhoReal)}</td>
    </tr>`;
  }).join('');

  const mesTxt = formatarMes(mesSelecionado);
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>MotoGastos - ${mesTxt}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  body { font-family:'Syne',sans-serif; padding:40px; color:#111; max-width:800px; margin:0 auto; }
  .header { border-bottom:3px solid #f97316; padding-bottom:20px; margin-bottom:30px; }
  .logo { font-size:32px; font-weight:800; letter-spacing:3px; }
  .logo span { color:#f97316; }
  .mes { font-size:16px; font-weight:700; color:#f97316; margin-top:4px; letter-spacing:2px; }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
  .stat { background:#f8f8f8; border-radius:10px; padding:14px; text-align:center; }
  .stat-label { font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:#666; margin-bottom:4px; }
  .stat-val { font-family:'JetBrains Mono'; font-size:18px; font-weight:500; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:2px; color:#f97316; margin:24px 0 12px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f97316; color:#000; padding:10px 12px; font-size:11px; text-transform:uppercase; letter-spacing:1px; text-align:left; }
  td { padding:10px 12px; border-bottom:1px solid #eee; font-size:12px; font-family:'JetBrains Mono'; }
  tr:last-child td { border-bottom:none; }
  .tfoot td { background:#f8f8f8; font-weight:700; font-size:13px; }
  .footer { margin-top:40px; font-size:10px; color:#aaa; text-align:center; }
</style>
</head><body>
<div class="header">
  <div class="logo">MOTO<span>GASTOS</span></div>
  <div class="mes">📅 ${mesTxt}</div>
</div>
<div class="stats">
  <div class="stat"><div class="stat-label">Dias trabalhados</div><div class="stat-val">${registros.length}</div></div>
  <div class="stat"><div class="stat-label">KM rodados</div><div class="stat-val">${totalKm.toFixed(0)}</div></div>
  <div class="stat"><div class="stat-label">Ganho bruto</div><div class="stat-val" style="color:#059669">${fmtShort(totalBruto)}</div></div>
  <div class="stat"><div class="stat-label">Lucro líquido</div><div class="stat-val" style="color:${totalLucro>=0?'#059669':'#e11d48'}">${fmtShort(totalLucro)}</div></div>
</div>
<h2>📊 Registros do Mês</h2>
<table>
<thead><tr><th>Data</th><th>KM</th><th>Bruto</th><th>Gastos</th><th>Lucro</th></tr></thead>
<tbody>${linhas}</tbody>
<tfoot><tr class="tfoot">
  <td>TOTAL</td>
  <td>${totalKm.toFixed(0)} km</td>
  <td style="color:#059669">${fmt(totalBruto)}</td>
  <td style="color:#e11d48">- ${fmt(totalGastos)}</td>
  <td style="color:${totalLucro>=0?'#059669':'#e11d48'}">${fmt(totalLucro)}</td>
</tr></tfoot>
</table>
<div class="footer">MotoGastos Pro — Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
  toast('📄 Relatório mensal pronto!');
}

// ── RESET ──
function resetarCalculo() {
  ['hodoInicio','hodoFim','vlrLitro','ganhoDia','custoOleo','custoManutencao','custoIpva','custoSeguro']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('resultados').style.display = 'none';
  document.getElementById('kmTotal').textContent = '— km';
  ultimoResultado = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharModal() {
  document.getElementById('pdfModal').style.display = 'none';
}

// ── TOAST ──
function toast(msg, dur = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

// ── FORMAT ──
function fmt(v) {
  return (v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
function fmtShort(v) {
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toFixed(1) + 'k';
  return (v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}
