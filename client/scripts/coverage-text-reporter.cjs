#!/usr/bin/env node
/**
 * Custom Istanbul text reporter with uniform column widths.
 * All columns use fixed character widths for consistent alignment.
 * Based on istanbul-reports/lib/text - uses PCT_COLS_UNIFORM for all percentage columns.
 */
'use strict';
const { ReportBase } = require('istanbul-lib-report');

const NAME_COL = 4;
const PCT_COLS_UNIFORM = 8;  // Same width for % Stmts, % Branch, % Funcs, % Lines
const MISSING_COL = 17;
const TAB_SIZE = 1;
const DELIM = ' | ';

function padding(num, ch) {
    let str = '';
    ch = ch || ' ';
    for (let i = 0; i < num; i += 1) str += ch;
    return str;
}

function fill(str, width, right, tabs) {
    tabs = tabs || 0;
    str = String(str);
    const leadingSpaces = tabs * TAB_SIZE;
    const remaining = width - leadingSpaces;
    const leader = padding(leadingSpaces);
    let fmtStr = '';
    if (remaining > 0) {
        const strlen = str.length;
        let fillStr;
        if (remaining >= strlen) {
            fillStr = padding(remaining - strlen);
        } else {
            fillStr = '...';
            str = str.substring(strlen - (remaining - fillStr.length));
            right = true;
        }
        fmtStr = right ? fillStr + str : str + fillStr;
    }
    return leader + fmtStr;
}

function formatName(name, maxCols, level) {
    return fill(name, maxCols, false, level);
}

function formatPct(pct, width) {
    return fill(pct, width || PCT_COLS_UNIFORM, true, 0);
}

function nodeMissing(node) {
    if (node.isSummary()) return '';
    const metrics = node.getCoverageSummary();
    const isEmpty = metrics.isEmpty();
    const lines = isEmpty ? 0 : metrics.lines.pct;
    const fileCoverage = node.getFileCoverage();
    let coveredLines;
    if (lines === 100) {
        const branches = fileCoverage.getBranchCoverageByLine();
        coveredLines = Object.entries(branches).map(([key, { coverage }]) => [key, coverage === 100]);
    } else {
        coveredLines = Object.entries(fileCoverage.getLineCoverage());
    }
    let newRange = true;
    const ranges = coveredLines
        .reduce((acum, [line, hit]) => {
            if (hit) newRange = true;
            else {
                line = parseInt(line);
                if (newRange) { acum.push([line]); newRange = false; }
                else acum[acum.length - 1][1] = line;
            }
            return acum;
        }, [])
        .map(range => (range.length === 1 ? range[0] : `${range[0]}-${range[1]}`));
    const all = [].concat(...ranges);
    const limited = all.slice(0, 3);
    const more = all.length - 3;
    const suffix = more > 0 ? ` (+ ${more} more)` : '';
    return limited.join(',') + suffix;
}

function nodeName(node) {
    return node.getRelativeName() || 'All files';
}

function depthFor(node) {
    let ret = 0;
    node = node.getParent();
    while (node) { ret += 1; node = node.getParent(); }
    return ret;
}

function nullDepthFor() { return 0; }

function findWidth(node, context, nodeExtractor, depthFor = nullDepthFor) {
    let last = 0;
    const compareWidth = (n) => {
        last = Math.max(last, TAB_SIZE * depthFor(n) + nodeExtractor(n).length);
    };
    node.visit(context.getVisitor({ onSummary: compareWidth, onDetail: compareWidth }));
    return last;
}

function makeLine(nameWidth, missingWidth) {
    const pct = padding(PCT_COLS_UNIFORM, '-');
    return [
        padding(nameWidth, '-'),
        pct, pct, pct, pct,
        padding(missingWidth, '-')
    ].join(DELIM.replace(/ /g, '-')) + '-';
}

function tableHeader(maxNameCols, missingWidth) {
    const pct = (x) => formatPct(x, PCT_COLS_UNIFORM);
    return [
        formatName('File', maxNameCols, 0),
        pct('% Stmts'), pct('% Branch'), pct('% Funcs'), pct('% Lines'),
        formatName('Uncovered Line #s', missingWidth)
    ].join(DELIM) + ' ';
}

function isFull(metrics) {
    return metrics.statements.pct === 100 && metrics.branches.pct === 100 &&
        metrics.functions.pct === 100 && metrics.lines.pct === 100;
}

function tableRow(node, context, colorizer, maxNameCols, level, skipEmpty, skipFull, missingWidth) {
    const name = nodeName(node);
    const metrics = node.getCoverageSummary();
    const isEmpty = metrics.isEmpty();
    if (skipEmpty && isEmpty) return '';
    if (skipFull && isFull(metrics)) return '';
    const mm = {
        statements: isEmpty ? 0 : metrics.statements.pct,
        branches: isEmpty ? 0 : metrics.branches.pct,
        functions: isEmpty ? 0 : metrics.functions.pct,
        lines: isEmpty ? 0 : metrics.lines.pct
    };
    const colorize = isEmpty ? (s) => s : (s, k) => colorizer(s, context.classForPercent(k, mm[k]));
    const pct = (x, k) => colorize(formatPct(x, PCT_COLS_UNIFORM), k);
    return [
        colorize(formatName(name, maxNameCols, level), 'statements'),
        pct(mm.statements, 'statements'), pct(mm.branches, 'branches'),
        pct(mm.functions, 'functions'), pct(mm.lines, 'lines'),
        colorizer(formatName(nodeMissing(node), missingWidth), mm.lines === 100 ? 'medium' : 'low')
    ].join(DELIM) + ' ';
}

class TextReport extends ReportBase {
    constructor(opts) {
        super(opts);
        opts = opts || {};
        const { maxCols } = opts;
        this.file = opts.file || null;
        this.maxCols = maxCols != null ? maxCols : process.stdout.columns || 80;
        this.cw = null;
        this.skipEmpty = opts.skipEmpty;
        this.skipFull = opts.skipFull;
    }

    onStart(root, context) {
        this.cw = context.writer.writeFile(this.file);
        this.nameWidth = Math.max(NAME_COL, findWidth(root, context, nodeName, depthFor));
        this.missingWidth = Math.max(MISSING_COL, findWidth(root, context, nodeMissing));
        if (this.maxCols > 0) {
            const pct_cols = DELIM.length + 4 * (PCT_COLS_UNIFORM + DELIM.length) + 2;
            let maxRemaining = this.maxCols - (pct_cols + MISSING_COL);
            if (this.nameWidth > maxRemaining) {
                this.nameWidth = maxRemaining;
                this.missingWidth = MISSING_COL;
            } else {
                maxRemaining = this.maxCols - (this.nameWidth + pct_cols);
                if (this.missingWidth > maxRemaining) this.missingWidth = maxRemaining;
            }
        }
        const line = makeLine(this.nameWidth, this.missingWidth);
        this.cw.println(line);
        this.cw.println(tableHeader(this.nameWidth, this.missingWidth));
        this.cw.println(line);
    }

    onSummary(node, context) {
        const row = tableRow(node, context, this.cw.colorize.bind(this.cw),
            this.nameWidth, depthFor(node), this.skipEmpty, this.skipFull, this.missingWidth);
        if (row) this.cw.println(row);
    }

    onDetail(node, context) {
        return this.onSummary(node, context);
    }

    onEnd() {
        this.cw.println(makeLine(this.nameWidth, this.missingWidth));
        this.cw.close();
    }
}

module.exports = TextReport;
