#!/usr/bin/env node
/**
 * Custom Istanbul text-summary reporter with equal-width columns.
 */
'use strict';
const { ReportBase } = require('istanbul-lib-report');

const LABEL_WIDTH = 11;
const PCT_WIDTH = 7;
const FRAC_WIDTH = 9;

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
      const clazz = context.classForPercent(key, summary[key].pct);
      cw.println(cw.colorize(str, clazz));
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
