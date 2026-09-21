import { loadRuntimeData } from './data-loader.js';
import { displaySchema, displaySections, formatDisplayValue } from './display-schema.js';

const statusNode = document.getElementById('status');
const summaryNode = document.getElementById('summary');
const machineListNode = document.getElementById('machine-list');

async function render() {
  try {
    statusNode.textContent = 'Loading generated catalogue…';
    const data = await loadRuntimeData();
    const publishedCount = data.machines.length;
    const manufacturerCount = new Set(data.machines.map((machine) => machine.manufacturer)).size;
    const latestYear = Math.max(...data.machines.map((machine) => Number(machine.model_year) || 0));
    const buildInfo = data.buildInfo || {};

    summaryNode.innerHTML = `
      <p><strong>Published machines:</strong> ${publishedCount}</p>
      <p><strong>Manufacturers:</strong> ${manufacturerCount}</p>
      <p><strong>Latest model year:</strong> ${latestYear}</p>
      <p><strong>Build:</strong> ${buildInfo.buildDate || 'n/a'}${buildInfo.version ? ` (${buildInfo.version})` : ''}</p>
    `;

    const machine = data.machines[0];
    if (!machine) {
      statusNode.textContent = 'No published machines were loaded.';
      return;
    }

    const sectionGroups = new Map();
    for (const section of displaySections) {
      sectionGroups.set(section, []);
    }

    for (const field of displaySchema) {
      const value = machine[field.propertyPath];
      const entry = {
        label: field.label,
        value: value === null || value === undefined ? '—' : value,
        unit: field.unit,
        priority: field.priority,
        section: field.section
      };
      sectionGroups.get(field.section)?.push(entry);
    }

    const sectionsMarkup = [...sectionGroups.entries()].map(([section, entries]) => {
      const rows = entries.map((entry) => {
        const formattedValue = formatDisplayValue(entry.value, entry.unit, '—');
        const priorityBadge = entry.priority ? '<span class="priority">Priority</span>' : '';
        return `
          <div class="spec-row ${entry.priority ? 'priority-row' : ''}">
            <dt>${entry.label}</dt>
            <dd>${formattedValue}${priorityBadge}</dd>
          </div>
        `;
      }).join('');

      return `
        <section class="spec-section">
          <h2>${section}</h2>
          <dl>${rows}</dl>
        </section>
      `;
    }).join('');

    machineListNode.innerHTML = `
      <h2>Representative machine: ${machine.machine}</h2>
      ${sectionsMarkup}
    `;

    statusNode.textContent = 'Generated catalogue loaded successfully.';
  } catch (error) {
    statusNode.textContent = 'Data load failed.';
    summaryNode.innerHTML = `<p class="error">${error.message}</p>`;
    machineListNode.innerHTML = '<p class="error">Unable to render representative machine because the required generated data did not load.</p>';
  }
}

render();
