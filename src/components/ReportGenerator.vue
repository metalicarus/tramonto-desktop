<template>
  <q-card style="min-width: 400px">
    <q-card-section class="bg-primary text-white">
      <div class="text-h6">Generate Report</div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <q-checkbox v-model="includeExecutive" label="Executive Report" />
      <q-checkbox v-model="includeTechnical" label="Technical Report" />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Cancel" v-close-popup />
      <q-btn
        color="primary"
        label="Generate PDF"
        :disable="!includeExecutive && !includeTechnical"
        @click="generate"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { useProjectStore } from 'stores/project.js'

const store = useProjectStore()
const includeExecutive = ref(true)
const includeTechnical = ref(false)

function severityBadge(severity) {
  const styles = {
    critical: 'background:#FCEBEB;color:#A32D2D',
    high: 'background:#FAEEDA;color:#854F0B',
    medium: 'background:#E6F1FB;color:#185FA5',
    low: 'background:#EAF3DE;color:#3B6D11',
    info: 'background:#f5f5f5;color:#666',
  }
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }
  const style = styles[severity] || 'background:#f5f5f5;color:#666'
  return `<span style="display:inline-block;font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;${style}">${labels[severity] || severity}</span>`
}

function buildCvssBar() {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  Object.values(store.vulnerabilities).forEach(v => {
    if (counts[v.severity] !== undefined) counts[v.severity]++
  })
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  const colors = { critical: '#E24B4A', high: '#EF9F27', medium: '#378ADD', low: '#1D9E75', info: '#888' }
  const labels = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' }

  return Object.entries(counts).map(([sev, count]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="width:70px;color:#666;font-size:13px;">${labels[sev]}</span>
      <div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden;">
        <div style="width:${Math.round(count/total*100)}%;height:100%;background:${colors[sev]};border-radius:4px;"></div>
      </div>
      <span style="width:24px;text-align:right;font-weight:500;">${count}</span>
    </div>
  `).join('')
}

function sortedVulns() {
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  return Object.values(store.vulnerabilities).sort((a, b) => (order[a.severity] ?? 5) - (order[b.severity] ?? 5))
}

function buildExecutive() {
  const m = store.projectMetrics
  const p = store.currentProject
  const rows = sortedVulns().map(v => `
    <tr>
      <td>${v.id}</td>
      <td>${v.title || '—'}</td>
      <td>${severityBadge(v.severity)}</td>
      <td>${v.cvss || '—'}</td>
      <td>${v.owasp || '—'}</td>
    </tr>
  `).join('')

  return `
    <h1>Security Assessment — ${p.customer}</h1>
    <p class="meta">Project: ${p.name} · Period: ${p.start_date} – ${p.end_date} · Environment: ${p.environment}</p>
    <span class="confidential">CONFIDENTIAL</span>
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-label">Controllers tested</div><div class="metric-value">${m.tested}/${m.total_controllers}</div></div>
      <div class="metric-card"><div class="metric-label">Critical</div><div class="metric-value critical">${m.vulnerabilities.criticisms}</div></div>
      <div class="metric-card"><div class="metric-label">High</div><div class="metric-value high">${m.vulnerabilities.highs}</div></div>
      <div class="metric-card"><div class="metric-label">Passed</div><div class="metric-value pass">${m.passed}</div></div>
    </div>
    <h2>Vulnerabilities by severity</h2>
    ${buildCvssBar()}
    <h2>Vulnerability summary</h2>
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>CVSS</th><th>OWASP</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function buildTechnical() {
  const p = store.currentProject
  const phaseNames = {
    1: 'Phase 1 — Reconnaissance',
    2: 'Phase 2 — Authentication',
    3: 'Phase 3 — Authorization',
    4: 'Phase 4 — Session Management',
    5: 'Phase 5 — Input Validation',
  }

  const phasesHtml = Object.entries(store.controllersByPhase).map(([phaseId, controllers]) => {
    const tested = controllers.filter(c => c.status === 'tested').length
    const rows = controllers.map(c => {
      const statusClass = c.result === 'passed' ? 'status-pass' : c.status === 'na' ? 'status-na' : 'status-fail'
      const statusLabel = c.result === 'passed' ? 'Passed' : c.status === 'na' ? 'N/A' : c.status === 'not_test' ? 'Not tested' : 'Failed'
      return `
        <div class="ctrl-row">
          <span class="ctrl-id">${c.id.split('_')[1] || c.id}</span>
          <span class="ctrl-obj">${c.objective}</span>
          <span class="ctrl-status ${statusClass}">${statusLabel}</span>
        </div>
      `
    }).join('')

    return `
      <div class="phase-block">
        <div class="phase-header">
          <span>${phaseNames[phaseId] || 'Phase ' + phaseId}</span>
          <span class="phase-progress">${tested}/${controllers.length} tested</span>
        </div>
        ${rows}
      </div>
    `
  }).join('')

  const vulnsHtml = sortedVulns().map(v => `
    <div class="vuln-detail">
      <div class="vuln-title-row">${severityBadge(v.severity)}<span class="vuln-name">${v.title || '—'}</span></div>
      <div class="vuln-meta">
        <div>CVSS <span>${v.cvss || '—'}</span></div>
        <div>CWE <span>${v.cwe || '—'}</span></div>
        <div>OWASP <span>${v.owasp || '—'}</span></div>
      </div>
      ${v.description ? `<div class="vuln-section-label">Description</div><div class="vuln-section-text">${v.description}</div>` : ''}
      ${v.impact ? `<div class="vuln-section-label">Impact</div><div class="vuln-section-text">${v.impact}</div>` : ''}
      ${v.recommendation ? `<div class="vuln-section-label">Recommendation</div><div class="recommendation-box">${v.recommendation}</div>` : ''}
    </div>
  `).join('')

  return `
    <h1>Technical Report — ${p.name}</h1>
    <p class="meta">Tester: ${p.settings?.userEmail || '—'} · Generated: ${new Date().toLocaleDateString()}</p>
    <span class="confidential">CONFIDENTIAL</span>
    <h2>Test coverage by phase</h2>
    ${phasesHtml}
    <h2>Vulnerability details</h2>
    ${vulnsHtml}
  `
}

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 40px; }
  h1 { font-size: 22px; font-weight: 500; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 500; margin: 2rem 0 1rem; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 8px; }
  .confidential { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 4px; background: #FCEBEB; color: #A32D2D; margin-bottom: 1.5rem; }
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.5rem; }
  .metric-card { background: #f5f5f5; border-radius: 8px; padding: 12px; }
  .metric-label { font-size: 11px; color: #666; margin-bottom: 4px; }
  .metric-value { font-size: 22px; font-weight: 500; }
  .metric-value.critical { color: #A32D2D; }
  .metric-value.high { color: #854F0B; }
  .metric-value.pass { color: #3B6D11; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-label { width: 70px; color: #666; }
  .bar-track { flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-fill.critical { background: #E24B4A; }
  .bar-fill.high { background: #EF9F27; }
  .bar-fill.medium { background: #378ADD; }
  .bar-fill.low { background: #1D9E75; }
  .bar-fill.info { background: #888; }
  .bar-count { width: 24px; text-align: right; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 1.5rem; }
  th { text-align: left; font-weight: 500; color: #666; padding: 6px 8px; border-bottom: 1px solid #eee; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  .badge { display: inline-block; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }
  .badge.critical { background: #FCEBEB; color: #A32D2D; }
  .badge.high { background: #FAEEDA; color: #854F0B; }
  .badge.medium { background: #E6F1FB; color: #185FA5; }
  .badge.low { background: #EAF3DE; color: #3B6D11; }
  .badge.info { background: #f5f5f5; color: #666; }
  .vuln-detail { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; page-break-inside: avoid; }
  .vuln-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .vuln-name { font-size: 14px; font-weight: 500; }
  .vuln-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; font-size: 12px; color: #666; }
  .vuln-meta span { color: #222; font-weight: 500; }
  .vuln-section-label { font-size: 11px; font-weight: 500; color: #666; margin: 8px 0 4px; }
  .vuln-section-text { font-size: 13px; line-height: 1.6; }
  .recommendation-box { background: #EAF3DE; border-radius: 4px; padding: 10px 12px; font-size: 13px; color: #27500A; line-height: 1.6; margin-top: 8px; }
  .phase-block { margin-bottom: 1.5rem; }
  .phase-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: 500; }
  .phase-progress { font-weight: 400; color: #666; font-size: 12px; }
  .ctrl-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; }
  .ctrl-id { width: 40px; color: #666; font-family: monospace; }
  .ctrl-obj { flex: 1; }
  .ctrl-status { width: 80px; text-align: right; }
  .status-pass { color: #3B6D11; }
  .status-fail { color: #A32D2D; }
  .status-na { color: #888; }
  .page-break { page-break-before: always; }
  @media print { body { padding: 20px; } }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
`

function generate() {
  const win = window.open('', '_blank')

  win.document.documentElement.innerHTML = `
    <head>
      <meta charset="utf-8">
      <title>Report — ${store.currentProject.name}</title>
      <style>${css}</style>
    </head>
    <body>
      ${includeExecutive.value ? buildExecutive() : ''}
      ${includeExecutive.value && includeTechnical.value ? '<div class="page-break"></div>' : ''}
      ${includeTechnical.value ? buildTechnical() : ''}
    </body>
  `

  const script = win.document.createElement('script')
  script.textContent = 'window.print(); window.onafterprint = () => window.close();'
  win.document.body.appendChild(script)
}
</script>
