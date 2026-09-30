import { icon } from './view-html.js';

export function helpMarkup() {
  return `<div class="help-panel">
      <div class="help-head"><h2 id="help-title">Using this tool</h2><button type="button" class="icon-btn" data-action="close-help" aria-label="Close help">${icon('close')}</button></div>
      <section aria-labelledby="help-steps"><h3 id="help-steps">Three steps</h3><ol>
        <li><strong>Pick a machine.</strong> Search by brand or model, or use the filters to narrow the list.</li>
        <li><strong>See what is in range.</strong> Machines with a similar Max HP are listed. Change the percentage to widen or narrow the range.</li>
        <li><strong>Compare up to four.</strong> Tick Add on a machine, then review differences, copy, export or print.</li>
      </ol></section>
      <section aria-labelledby="help-notes"><h3 id="help-notes">Good to know</h3><ul>
        <li>Filters narrow which machines you can choose as the primary machine. The Max HP results always include every published machine in range.</li>
        <li>Differences are each machine minus the baseline (Machine A). Use Make baseline to change it. Differences are neutral and do not rank machines.</li>
        <li>A dash means no published value is held for that field. Nothing is estimated or filled in.</li>
        <li>Power-to-weight is calculated from Max HP and unladen weight, only when both are single published values. It is not a loaded or operating measure.</li>
        <li>Copy link creates an address that restores your selection and comparison for anyone who opens it.</li>
      </ul></section>
      <section aria-labelledby="help-keys"><h3 id="help-keys">Keyboard</h3><dl class="shortcuts">
        <div><dt><kbd>/</kbd></dt><dd>Jump to the machine search</dd></div>
        <div><dt><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></dt><dd>Move through and choose search suggestions</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>Close suggestions or this window</dd></div>
        <div><dt><kbd>Space</kbd></dt><dd>Add or remove the focused machine from the comparison</dd></div>
        <div><dt><kbd>Ctrl</kbd> <kbd>Z</kbd></dt><dd>Press the Undo button while its message is showing (<kbd>Cmd</kbd> <kbd>Z</kbd> on a Mac)</dd></div>
      </dl></section>
    </div>`;
}
