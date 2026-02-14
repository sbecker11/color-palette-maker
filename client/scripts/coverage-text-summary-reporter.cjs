#!/usr/bin/env node
/**
 * Custom Istanbul text-summary reporter with equal-width columns.
 * Uses red/yellow/green colorization for percentages:
 *   red: < 80, yellow: 80-89, green: >= 90
 */
'use strict';
const { ReportBase } = require('istanbul-lib-report');
const supportsColor = require('supports-color');

const LABEL_WIDTH = 11;
const PCT_WIDTH = 7;
const FRAC_WIDTH = 9;

// Red < 80, Yellow 80-89, Green >= 90
const RED = '\x1b[31;1m';
const YELLOW = '\x1b[33;1m';
const GREEN = '\x1b[32;1m';
const RESET = '\x1b[0m';

function colorForPct(pct) {
  if (!supportsColor.stdout) return '';
  if (pct >= 90) return GREEN;
  if (pct >= 80) return YELLOW;
  return RED;
}

function colorize(str, pct) {
  const color = colorForPct(pct);
  return color ? color + str + RESET : str;
}

function pad(str, width, right = false) {
  const s = String(str);
  if (s.length >= width) return s;
  const sp = ' '.repeat(width - s.length);
  return right ? sp + s : s + sp;
}

function lineForKey(summary, key) {
  const metrics = summary[key];
  const label = key.substring(0, 1).toUpperCase() + key.substring(1);
  const pctStr = metrics.pct + '%';
  const fracStr = metrics.covered + '/' + metrics.total;
  const line =
    pad(label, LABEL_WIDTH) + ' : ' +
    pad(pctStr, PCT_WIDTH, true) + ' ( ' +
    pad(fracStr, FRAC_WIDTH, true) + ' )';
  if (metrics.skipped > 0) {
    return line + ', ' + metrics.skipped + ' ignored';
  }
  return line;
}

class TextSummaryReport extends ReportBase {
  constructor(opts) {
    super();
    opts = opts || {};
    this.file = opts.file || null;
  }

  onStart(node, context) {
    const summary = node.getCoverageSummary();
    const cw = context.writer.writeFile(this.file);
    const printLine = (key) => {
      const str = lineForKey(summary, key);
      const pct = summary[key].pct;
      cw.println(colorize(str, pct));
    };
    cw.println('');
    cw.println('=============================== Coverage summary ===============================');
    printLine('statements');
    printLine('branches');
    printLine('functions');
    printLine('lines');
    cw.println('================================================================================');
    cw.close();
  }
}

module.exports = TextSummaryReport;
