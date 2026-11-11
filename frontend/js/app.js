// Global State
const state = {
    config: {
        symbol: "GER40",
        default_lot: 0.1,
        default_sl_points: 100,
        default_tp_points: 100
    },
    lastBid: 0,
    lastAsk: 0,
    positions: [],
    status: {
        long: { connected: false },
        short: { connected: false }
    },
    eventSource: null,
    
    // In-card positions actions state
    activeActionsTicket: null,
    activePanelTicket: null,
    activePanelType: null,
    isEditingInput: false,
    lastRenderedTickets: "",
    lastRenderState: "",
    lastLoadedTvSymbol: "",
    isSplitActive: false,
    splitScenario: 0,
    lastHistoryData: null,
    journalUnit: localStorage.getItem('journalUnit') || 'EUR',
    journalPeriod: localStorage.getItem('journal_stats_period') || 'day',
    journalAccount: localStorage.getItem('journal_account_view') || 'total',
    chartPriceLines: [],
    bidPriceLine: null,
    askPriceLine: null,
    executionType: 'market',
    limitPrice: null,
    keyLevelPriceLines: [],
    lastBidPrice: null,
    activeConsigne: null,
    activeLevelId: null
};

// DOM Elements Cache
const elements = {
    // Tabs & Nav
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Header quote labels
    currentSymbolText: document.getElementById('current-symbol'),
    
    // Connection dots
    statusLongBadge: document.getElementById('status-long'),
    statusShortBadge: document.getElementById('status-short'),
    
    // Scalp Tab
    scalpBuyBtn: document.getElementById('scalp-buy-btn'),
    scalpSellBtn: document.getElementById('scalp-sell-btn'),
    scalpBuyPrice: document.getElementById('scalp-buy-price'),
    scalpSellPrice: document.getElementById('scalp-sell-price'),
    scalpSpreadMiddle: document.getElementById('scalp-spread-middle'),
    
    // Quick params
    lotInput: document.getElementById('input-lot'),
    slInput: document.getElementById('input-sl-points'),
    tpInput: document.getElementById('input-tp-points'),
    autoBeInput: document.getElementById('input-auto-be'),
    
    // Positions view
    quickPosCount: document.getElementById('quick-pos-count'),
    quickTotalPnL: document.getElementById('quick-total-pnl'),
    quickPositionsContainer: document.getElementById('quick-positions-container'),
    quickOrdersCount: document.getElementById('quick-orders-count'),
    quickOrdersContainer: document.getElementById('quick-orders-container'),
    
    // Positions Dashboard
    dashEquity: document.getElementById('dash-equity'),
    dashBalance: document.getElementById('dash-balance'),
    dashFreeMargin: document.getElementById('dash-free-margin'),
    positionsCardsContainer: document.getElementById('positions-cards-container'),
    ordersCardsContainer: document.getElementById('orders-cards-container'),
    closeAllBtn: document.getElementById('close-all-btn'),
    
    // Config Tab
    configForm: document.getElementById('config-form'),
    cfgSymbol: document.getElementById('cfg-symbol'),
    cfgLot: document.getElementById('cfg-lot'),
    cfgSl: document.getElementById('cfg-sl'),
    cfgTp: document.getElementById('cfg-tp'),
    cfgAutoBe: document.getElementById('cfg-auto-be'),
    cfgMaxSpread: document.getElementById('cfg-max-spread'),
    cfgPathLong: document.getElementById('cfg-path-long'),
    cfgPathShort: document.getElementById('cfg-path-short'),
    
    // Account details
    accSrvLong: document.getElementById('acc-srv-long'),
    accLogLong: document.getElementById('acc-log-long'),
    accBalLong: document.getElementById('acc-bal-long'),
    accLevLong: document.getElementById('acc-lev-long'),
    
    accSrvShort: document.getElementById('acc-srv-short'),
    accLogShort: document.getElementById('acc-log-short'),
    accBalShort: document.getElementById('acc-bal-short'),
    accLevShort: document.getElementById('acc-lev-short'),
    
    // Modify Modal Sheet
    modifyModal: document.getElementById('modify-modal'),
    closeModalX: document.getElementById('close-modal-x'),
    submitModifyBtn: document.getElementById('submit-modify-btn'),
    closePosModalBtn: document.getElementById('close-pos-modal-btn'),
    modTicket: document.getElementById('mod-ticket'),
    modAccType: document.getElementById('mod-acc-type'),
    modPosDetails: document.getElementById('mod-pos-details'),
    modOpenPrice: document.getElementById('mod-open-price'),
    modCurrentPrice: document.getElementById('mod-current-price'),
    modSl: document.getElementById('mod-mod-sl'), // Keep existing (might be unused, but safe)
    modSlInput: document.getElementById('mod-sl'),
    modTpInput: document.getElementById('mod-tp'),
    modSlMinus: document.getElementById('mod-sl-minus'),
    modSlPlus: document.getElementById('mod-sl-plus'),
    modTpMinus: document.getElementById('mod-tp-minus'),
    modTpPlus: document.getElementById('mod-tp-plus'),
    
    // Detail Modal Sheet
    detailModal: document.getElementById('detail-modal'),
    closeDetailModalX: document.getElementById('close-detail-modal-x'),
    detailModalBody: document.getElementById('detail-modal-body'),
    
    // Toast Container
    toastContainer: document.getElementById('toast-container'),
    
    // Graph Tab Positions
    graphPosCount: document.getElementById('graph-pos-count'),
    graphTotalPnL: document.getElementById('graph-total-pnl'),
    graphPositionsContainer: document.getElementById('graph-positions-container'),
    graphOrdersCount: document.getElementById('graph-orders-count'),
    graphOrdersContainer: document.getElementById('graph-orders-container'),
    
    // Graph Tab Order-Taking Elements
    graphBuyBtn: document.getElementById('graph-buy-btn'),
    graphSellBtn: document.getElementById('graph-sell-btn'),
    graphBuyPrice: document.getElementById('graph-buy-price'),
    graphSellPrice: document.getElementById('graph-sell-price'),
    graphSpreadMiddle: document.getElementById('graph-spread-middle'),
    graphLotInput: document.getElementById('graph-input-lot'),
    graphSlInput: document.getElementById('graph-input-sl-points'),
    graphTpInput: document.getElementById('graph-input-tp-points'),
    graphAutoBeInput: document.getElementById('graph-input-auto-be'),
    graphChartCard: document.getElementById('graph-chart-card'),
    graphResizer: document.getElementById('graph-resizer'),
    graphConsoleToggleBtn: document.getElementById('graph-console-toggle-btn'),
    graphScalpConsoleCard: document.getElementById('graph-scalp-console-card'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    journalEquity: document.getElementById('journal-equity'),
    journalBalance: document.getElementById('journal-balance'),
    journalFreeMargin: document.getElementById('journal-free-margin'),
    journalUnitSelector: document.getElementById('journal-unit-selector'),
    journalPeriodSelector: document.getElementById('journal-stats-period-selector'),
    journalAccountSelector: document.getElementById('journal-account-selector'),
    journalEquityLabel: document.getElementById('journal-equity-label'),
    journalBalanceLabel: document.getElementById('journal-balance-label'),
    journalFreeMarginLabel: document.getElementById('journal-free-margin-label'),
    journalEquitySub: document.getElementById('journal-equity-sub'),
    journalBalanceSub: document.getElementById('journal-balance-sub'),
    journalFreeMarginSub: document.getElementById('journal-free-margin-sub'),
    
    // Limit order inputs and displays
    limitPriceInput: document.getElementById('input-limit-price'),
    graphLimitPriceInput: document.getElementById('graph-input-limit-price'),
    valDisplayType: document.getElementById('val-display-type'),
    graphValDisplayType: document.getElementById('graph-val-display-type'),
    valDisplayPrice: document.getElementById('val-display-price'),
    graphValDisplayPrice: document.getElementById('graph-val-display-price'),
    paramColPrice: document.getElementById('param-col-price'),
    graphParamColPrice: document.getElementById('graph-param-col-price')
};

// ==========================================================================
// TOAST ENGINE (NOTIFICATION UTILITY)
// ==========================================================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Auto dismiss after 1.5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-15px)';
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}

// ==========================================================================
// JOURNAL & STATS LOGIC
// ==========================================================================
async function fetchHistoryData(isAutoRefresh = false) {
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error("History API returned error");
        const data = await response.json();
        
        // Detect if trades data has actually changed to avoid redundant chart reloads
        const oldTrades = state.lastHistoryData && state.lastHistoryData.trades ? state.lastHistoryData.trades : [];
        const newTrades = data && data.trades ? data.trades : [];
        const hasChanged = JSON.stringify(oldTrades) !== JSON.stringify(newTrades);
        
        renderHistoryTab(data, isAutoRefresh, hasChanged);
    } catch (err) {
        console.error("Error fetching history data:", err);
    }
}

function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function renderHistoryTab(data, isAutoRefresh = false, hasChanged = true) {
    state.lastHistoryData = data;
    const trades = data.trades || [];
    const stats = data.stats || [];
    
    let totalNet = 0;
    let totalPips = 0;
    let totalTrades = trades.length;
    let winningTrades = 0;
    
    trades.forEach(t => {
        totalNet += t.net;
        totalPips += t.pips || 0;
        const isWin = t.category ? t.category === 'WIN' : t.net > 0;
        if (isWin) winningTrades++;
    });
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgTrade = totalTrades > 0 ? (totalNet / totalTrades) : 0;
    const avgPips = totalTrades > 0 ? (totalPips / totalTrades) : 0;
    
    const netEl = document.getElementById('stats-total-net');
    const tradesEl = document.getElementById('stats-total-trades');
    const winRateEl = document.getElementById('stats-win-rate');
    const avgEl = document.getElementById('stats-avg-trade');
    
    if (netEl) {
        if (state.journalUnit === 'EUR') {
            const sign = totalNet >= 0 ? '+' : '';
            netEl.innerText = `${sign}${totalNet.toFixed(2)} EUR`;
        } else {
            const pipsSign = totalPips >= 0 ? '+' : '';
            netEl.innerText = `${pipsSign}${totalPips.toFixed(1)} pips`;
        }
        netEl.className = `metric-val ${totalNet >= 0 ? 'profit-text' : 'loss-text'}`;
    }
    if (tradesEl) tradesEl.innerText = totalTrades;
    if (winRateEl) winRateEl.innerText = `${winRate.toFixed(1)}%`;
    if (avgEl) {
        if (state.journalUnit === 'EUR') {
            const sign = avgTrade >= 0 ? '+' : '';
            avgEl.innerText = `${sign}${avgTrade.toFixed(2)} EUR`;
        } else {
            const pipsSign = avgPips >= 0 ? '+' : '';
            avgEl.innerText = `${pipsSign}${avgPips.toFixed(1)} pips`;
        }
        avgEl.className = `metric-val ${avgTrade >= 0 ? 'profit-text' : 'loss-text'}`;
    }
    
    const period = state.journalPeriod || 'day';
    
    // Update title and column header
    const titleEl = document.getElementById('journal-stats-title');
    const thEl = document.getElementById('stats-period-th');
    if (titleEl) {
        if (period === 'week') titleEl.innerText = 'Performance par Semaine';
        else if (period === 'month') titleEl.innerText = 'Performance par Mois';
        else titleEl.innerText = 'Performance par Jour';
    }
    if (thEl) {
        if (period === 'week') thEl.innerText = 'Semaine';
        else if (period === 'month') thEl.innerText = 'Mois';
        else thEl.innerText = 'Date';
    }

    // Sync active state on period selector buttons if present
    const periodSelector = document.getElementById('journal-stats-period-selector');
    if (periodSelector) {
        periodSelector.querySelectorAll('.preset-btn').forEach(btn => {
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Determine which stats dataset to display
    let statsList = [];
    if (period === 'week') {
        statsList = data.weekly_stats || [];
    } else if (period === 'month') {
        statsList = data.monthly_stats || [];
    } else {
        statsList = data.daily_stats || data.stats || [];
    }
    
    const dailyTbody = document.getElementById('stats-daily-tbody');
    if (dailyTbody) {
        if (statsList.length === 0) {
            dailyTbody.innerHTML = `<tr><td colspan="4" class="no-data-cell" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucune donnée disponible</td></tr>`;
        } else {
            let html = "";
            statsList.forEach(item => {
                const netClass = item.net >= 0 ? "profit-text" : "loss-text";
                let displayLabel = item.label || item.date || item.key;
                if (period === 'day' && item.date) {
                    displayLabel = new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                }
                
                // Show Gagnant / BE / Perdant breakdown
                const gbe = `${item.winning_count} / ${item.be_count} / ${item.losing_count}`;
                const netValStr = state.journalUnit === 'EUR'
                    ? `${item.net >= 0 ? '+' : ''}${item.net.toFixed(2)} EUR`
                    : `${item.pips >= 0 ? '+' : ''}${(item.pips || 0).toFixed(1)} pips`;
                
                const activeClass = analysisSelectedDate === item.date ? "active-inspect-row" : "";
                html += `
                    <tr class="daily-stat-row ${activeClass}" data-date="${item.date}" data-key="${item.key}" data-label="${item.label || displayLabel}">
                        <td><strong>${displayLabel}</strong></td>
                        <td>${item.trades_count}</td>
                        <td>${gbe}</td>
                        <td class="${netClass}">${netValStr}</td>
                    </tr>
                `;
            });
            dailyTbody.innerHTML = html;
        }
    }
    
    const tradesTbody = document.getElementById('stats-trades-tbody');
    if (tradesTbody) {
        if (trades.length === 0) {
            tradesTbody.innerHTML = `<tr><td colspan="5" class="no-data-cell" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucune position fermée récente</td></tr>`;
        } else {
            let html = "";
            trades.forEach(t => {
                const netClass = t.net >= 0 ? "profit-text" : "loss-text";
                const typeLetter = t.type === 'BUY' ? 'L' : 'S';
                const typeClass = t.type.toLowerCase();
                
                const closeTimeStr = new Date(t.close_time * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const netValStr = state.journalUnit === 'EUR'
                    ? `${t.net >= 0 ? '+' : ''}${t.net.toFixed(2)} EUR`
                    : `${t.pips >= 0 ? '+' : ''}${(t.pips || 0).toFixed(1)} pips`;
                
                const activeClass = analysisSelectedTradeId === t.position_id ? "active-inspect-row" : "";
                html += `
                    <tr class="history-trade-row ${activeClass}" data-id="${t.position_id}">
                        <td><span class="type-tag ${typeClass}">${typeLetter}</span></td>
                        <td>${t.volume.toFixed(2)}</td>
                        <td style="font-size: 11px; color: var(--text-secondary);">
                            ${t.open_price.toFixed(1)} <i class="fa-solid fa-arrow-right" style="font-size: 9px; margin: 0 3px;"></i> ${t.close_price.toFixed(1)}
                            <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">Fermé à ${closeTimeStr}</div>
                        </td>
                        <td>${formatDuration(t.duration)}</td>
                        <td class="${netClass}">${netValStr}</td>
                    </tr>
                `;
            });
            tradesTbody.innerHTML = html;
        }
    }

    // Bind Performance Breakdown click handlers
    document.querySelectorAll('.daily-stat-row').forEach(row => {
        row.addEventListener('click', () => {
            const dateStr = row.getAttribute('data-date');
            const labelStr = row.getAttribute('data-label') || dateStr;
            analysisSelectedDate = dateStr;
            
            // Highlight row
            document.querySelectorAll('.daily-stat-row').forEach(r => r.classList.remove('active-inspect-row'));
            row.classList.add('active-inspect-row');
            
            // Load chart
            const dateSpan = document.getElementById('analysis-active-date');
            if (dateSpan) dateSpan.innerText = `(${labelStr})`;
            loadAnalysisChartData(dateStr);
        });
    });
    
    // Bind History Trades click handlers
    document.querySelectorAll('.history-trade-row').forEach(row => {
        row.addEventListener('click', () => {
            const tradeId = parseInt(row.getAttribute('data-id'));
            inspectTrade(tradeId);
        });
    });
    
    // Auto-select and load the first day on initial draw if none selected
    if (stats.length > 0) {
        if (!analysisSelectedDate) {
            const firstDate = stats[0].date;
            analysisSelectedDate = firstDate;
            setTimeout(() => {
                const firstRow = document.querySelector(`.daily-stat-row[data-date="${firstDate}"]`);
                if (firstRow) {
                    firstRow.click();
                } else {
                    const dateSpan = document.getElementById('analysis-active-date');
                    if (dateSpan) dateSpan.innerText = `(${firstDate})`;
                    loadAnalysisChartData(firstDate);
                }
            }, 100);
        } else {
            // Reload current selected day's chart to keep it fresh ONLY if not an auto-refresh
            if (!isAutoRefresh) {
                setTimeout(() => {
                    loadAnalysisChartData(analysisSelectedDate, true);
                    if (analysisSelectedTradeId) {
                        inspectTrade(analysisSelectedTradeId);
                    }
                }, 100);
            }
        }
    }
}

function exportHistoryToCSV() {
    if (!state.lastHistoryData || !state.lastHistoryData.trades || state.lastHistoryData.trades.length === 0) {
        showToast("Aucun trade disponible pour l'export", "warning");
        return;
    }
    
    const trades = state.lastHistoryData.trades;
    
    // Define headers
    const headers = [
        "Position ID",
        "Symbole",
        "Sens",
        "Lots",
        "Date Ouverture (UTC)",
        "Date Cloture (UTC)",
        "Prix Ouverture",
        "Prix Cloture",
        "Duree (sec)",
        "Duree (format)",
        "Profit Brut (EUR)",
        "Commission (EUR)",
        "Swap (EUR)",
        "PnL Net (EUR)",
        "Compte",
        "Categorie",
        "Diff Pips"
    ];
    
    const rows = [headers.join(",")];
    
    trades.forEach(t => {
        const openDate = new Date(t.open_time * 1000).toISOString().replace('T', ' ').substring(0, 19);
        const closeDate = new Date(t.close_time * 1000).toISOString().replace('T', ' ').substring(0, 19);
        const durationStr = formatDuration(t.duration);
        
        const row = [
            t.position_id,
            t.symbol,
            t.type,
            t.volume.toFixed(2),
            openDate,
            closeDate,
            t.open_price.toFixed(2),
            t.close_price.toFixed(2),
            t.duration,
            `"${durationStr}"`,
            t.profit.toFixed(2),
            t.commission.toFixed(2),
            t.swap.toFixed(2),
            t.net.toFixed(2),
            t.account_type,
            t.category || "",
            t.pips_diff !== undefined ? t.pips_diff.toFixed(2) : ""
        ];
        rows.push(row.join(","));
    });
    
    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().substring(0, 10);
    link.setAttribute("download", `trading_history_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Fichier CSV téléchargé !", "success");
}

// ==========================================================================
// NAVIGATION & TABS LOGIC
// ==========================================================================
function initNavigation() {
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTabId = item.getAttribute('data-tab');
            
            // Switch navigation items active state
            elements.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch tabs
            elements.tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(targetTabId).classList.add('active');
            
            // Toggle PC Fullscreen layout for Journal and Trade (Graph) tabs
            if (targetTabId === 'tab-journal' || targetTabId === 'tab-graph') {
                document.body.classList.add('pc-fullscreen-active');
            } else {
                document.body.classList.remove('pc-fullscreen-active');
            }
            
            if (targetTabId === 'tab-journal') {
                fetchHistoryData();
                setTimeout(() => {
                    if (analysisSelectedDate) {
                        const dateSpan = document.getElementById('analysis-active-date');
                        if (dateSpan) dateSpan.innerText = `(${analysisSelectedDate})`;
                        loadAnalysisChartData(analysisSelectedDate);
                    } else {
                        initAnalysisChart();
                    }
                }, 100);
            }
            
            // Toggle viewport scroll behavior to prevent iOS gesture interception on the chart
            const viewport = document.querySelector('.app-main-viewport');
            if (targetTabId === 'tab-graph') {
                if (viewport) viewport.classList.add('viewport-no-scroll');
                setTimeout(loadTradingViewWidget, 50); // slight delay to allow the container to be displayed
            } else {
                if (viewport) viewport.classList.remove('viewport-no-scroll');
            }
        });
    });

    // Check on page load if active tab is fullscreen
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        if (activeTab.id === 'tab-journal' || activeTab.id === 'tab-graph') {
            document.body.classList.add('pc-fullscreen-active');
        } else {
            document.body.classList.remove('pc-fullscreen-active');
        }
        
        const viewport = document.querySelector('.app-main-viewport');
        if (activeTab.id === 'tab-graph' && viewport) {
            viewport.classList.add('viewport-no-scroll');
        }
    }
}

// Global TradingView Widget Instance
// Global Lightweight Charts Instance & State
let lwChartInstance = null;
let lwCandlestickSeries = null;
let lwSmaSeries = null;
let lwBbBasisSeries = null;
let lwBbUpperSeries = null;
let lwBbLowerSeries = null;
let lwDurationSeries = null;

// RSI Divergence Globals
let rsiEnabled = false;
let lwRsiPane = null;
let lwRsiSeries = null;
let lwRsiBandSeries = null;
let rsiDivergenceConnectors = [];
let rsiConfig = {
    period: 14,
    pivotLeft: 5,
    pivotRight: 5,
    minLookback: 5,
    maxLookback: 60,
    plotBullish: true,
    plotHiddenBullish: false,
    plotBearish: true,
    plotHiddenBearish: false
};

// Analysis Chart Globals
let analysisChartInstance = null;
let analysisCandlestickSeries = null;
let analysisPnlSeries = null;
let analysisConnectorSeries = null;
let analysisTradeConnectors = [];
let analysisMarkersPlugin = null;
let analysisSelectedDate = null;
let analysisSelectedTradeId = null;

const savedTradeRes = localStorage.getItem('trade_chart_resolution') || "15S";
let currentResolution = savedTradeRes;
let currentTfMode = localStorage.getItem('trade_chart_tf_mode') || (savedTradeRes.endsWith('T') ? "TI" : "TF");
if (currentResolution.endsWith('T')) {
    currentTfMode = "TI";
} else {
    currentTfMode = "TF";
}
let lastTfResolution = localStorage.getItem('trade_chart_last_tf') || (currentResolution.endsWith('T') ? "15S" : currentResolution);
let lastTiResolution = localStorage.getItem('trade_chart_last_ti') || (currentResolution.endsWith('T') ? currentResolution : "200T");
let chartBars = []; // Track historical bars to update correctly on ticks
let candleCountSaveTimeout = null;

// Timestamps from MT5 broker are already in European local time (ActivTrades EU = UTC+2)
function timeToLocal(originalTime) {
    return originalTime;
}

function calculateRSIValues(bars, period = 14) {
    if (!bars || bars.length < period + 1) return [];
    
    const rsiValues = new Array(bars.length).fill(null);
    let gainSum = 0;
    let lossSum = 0;
    
    for (let i = 1; i <= period; i++) {
        const change = bars[i].close - bars[i - 1].close;
        if (change >= 0) gainSum += change;
        else lossSum += Math.abs(change);
    }
    
    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues[period] = 100 - (100 / (1 + rs));
    
    for (let i = period + 1; i < bars.length; i++) {
        const change = bars[i].close - bars[i - 1].close;
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        
        if (avgLoss === 0) {
            rsiValues[i] = 100;
        } else {
            rs = avgGain / avgLoss;
            rsiValues[i] = 100 - (100 / (1 + rs));
        }
    }
    
    return rsiValues;
}

function detectRSIDivergences(bars, rsiValues, cfg) {
    const { pivotLeft, pivotRight, minLookback, maxLookback, plotBullish, plotHiddenBullish, plotBearish, plotHiddenBearish } = cfg;
    const divergences = [];
    const n = bars.length;
    
    const pivotLows = [];
    const pivotHighs = [];
    
    for (let p = pivotLeft; p < n - pivotRight; p++) {
        if (rsiValues[p] === null) continue;
        
        let isLow = true;
        let isHigh = true;
        const val = rsiValues[p];
        
        // Left check (<= or >=)
        for (let l = 1; l <= pivotLeft; l++) {
            if (rsiValues[p - l] === null) { isLow = false; isHigh = false; break; }
            if (rsiValues[p - l] < val) isLow = false;
            if (rsiValues[p - l] > val) isHigh = false;
        }
        
        // Right check (< or >)
        if (isLow || isHigh) {
            for (let r = 1; r <= pivotRight; r++) {
                if (rsiValues[p + r] === null) { isLow = false; isHigh = false; break; }
                if (rsiValues[p + r] <= val) isLow = false;
                if (rsiValues[p + r] >= val) isHigh = false;
            }
        }
        
        if (isLow) pivotLows.push(p);
        if (isHigh) pivotHighs.push(p);
    }
    
    // Process Pivot Lows for Bullish & Hidden Bullish Divergences
    for (let k = 1; k < pivotLows.length; k++) {
        const p2 = pivotLows[k];
        const p1 = pivotLows[k - 1]; // Previous pivot low (valuewhen 1)
        const distance = p2 - p1;
        
        if (distance >= minLookback && distance <= maxLookback) {
            const osc1 = rsiValues[p1];
            const osc2 = rsiValues[p2];
            const priceLow1 = bars[p1].low;
            const priceLow2 = bars[p2].low;
            
            // 1. Regular Bullish: Price LL & Osc HL
            if (plotBullish && priceLow2 < priceLow1 && osc2 > osc1) {
                divergences.push({
                    type: 'bull',
                    text: ' Bull ',
                    p1Idx: p1,
                    p2Idx: p2,
                    time1: bars[p1].time,
                    time2: bars[p2].time,
                    price1: priceLow1,
                    price2: priceLow2,
                    rsi1: osc1,
                    rsi2: osc2
                });
            }
            
            // 2. Hidden Bullish: Price HL & Osc LL
            if (plotHiddenBullish && priceLow2 > priceLow1 && osc2 < osc1) {
                divergences.push({
                    type: 'hbull',
                    text: ' H Bull ',
                    p1Idx: p1,
                    p2Idx: p2,
                    time1: bars[p1].time,
                    time2: bars[p2].time,
                    price1: priceLow1,
                    price2: priceLow2,
                    rsi1: osc1,
                    rsi2: osc2
                });
            }
        }
    }
    
    // Process Pivot Highs for Bearish & Hidden Bearish Divergences
    for (let k = 1; k < pivotHighs.length; k++) {
        const p2 = pivotHighs[k];
        const p1 = pivotHighs[k - 1]; // Previous pivot high
        const distance = p2 - p1;
        
        if (distance >= minLookback && distance <= maxLookback) {
            const osc1 = rsiValues[p1];
            const osc2 = rsiValues[p2];
            const priceHigh1 = bars[p1].high;
            const priceHigh2 = bars[p2].high;
            
            // 3. Regular Bearish: Price HH & Osc LH
            if (plotBearish && priceHigh2 > priceHigh1 && osc2 < osc1) {
                divergences.push({
                    type: 'bear',
                    text: ' Bear ',
                    p1Idx: p1,
                    p2Idx: p2,
                    time1: bars[p1].time,
                    time2: bars[p2].time,
                    price1: priceHigh1,
                    price2: priceHigh2,
                    rsi1: osc1,
                    rsi2: osc2
                });
            }
            
            // 4. Hidden Bearish: Price LH & Osc HH
            if (plotHiddenBearish && priceHigh2 < priceHigh1 && osc2 > osc1) {
                divergences.push({
                    type: 'hbear',
                    text: ' H Bear ',
                    p1Idx: p1,
                    p2Idx: p2,
                    time1: bars[p1].time,
                    time2: bars[p2].time,
                    price1: priceHigh1,
                    price2: priceHigh2,
                    rsi1: osc1,
                    rsi2: osc2
                });
            }
        }
    }
    
    return divergences;
}

function updateRSIIndicator(bars) {
    if (!lwChartInstance) return;
    
    // Clear old divergence connectors
    rsiDivergenceConnectors.forEach(s => {
        try { lwChartInstance.removeSeries(s); } catch (e) {}
    });
    rsiDivergenceConnectors = [];
    
    if (!rsiEnabled) {
        if (lwRsiSeries) {
            try { lwChartInstance.removeSeries(lwRsiSeries); } catch (e) {}
            lwRsiSeries = null;
        }
        if (lwRsiBandSeries) {
            try { lwChartInstance.removeSeries(lwRsiBandSeries); } catch (e) {}
            lwRsiBandSeries = null;
        }
        const panes = lwChartInstance.panes ? lwChartInstance.panes() : [];
        if (panes.length > 1) {
            try {
                lwChartInstance.removePane(1);
            } catch (e) {
                console.warn("Could not remove RSI pane:", e);
            }
        }
        lwRsiPane = null;
        if (lwCandlestickSeries && typeof lwCandlestickSeries.setMarkers === 'function') {
            lwCandlestickSeries.setMarkers([]);
        }
        return;
    }
    
    // Ensure RSI Pane exists
    const panes = lwChartInstance.panes ? lwChartInstance.panes() : [];
    if (panes.length <= 1) {
        try {
            lwRsiPane = lwChartInstance.addPane();
            
            // 1. Background Fill Band (30-70) in light blue (color.rgb(33, 150, 243, 90) from Pine Script)
            lwRsiBandSeries = lwRsiPane.addSeries(LightweightCharts.BaselineSeries, {
                baseValue: { type: 'price', price: 30 },
                topFillColor1: 'rgba(33, 150, 243, 0.15)',
                topFillColor2: 'rgba(33, 150, 243, 0.10)',
                topLineColor: 'rgba(120, 123, 134, 0.25)',
                bottomFillColor1: 'transparent',
                bottomFillColor2: 'transparent',
                bottomLineColor: 'transparent',
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });

            // 2. Main RSI Line (#2962FF Royal Blue from Pine Script)
            lwRsiSeries = lwRsiPane.addSeries(LightweightCharts.LineSeries, {
                color: '#2962FF',
                lineWidth: 2,
                title: `RSI (${rsiConfig.period})`,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
            
            lwRsiSeries.createPriceLine({ price: 70, color: '#787B86', lineStyle: 2, axisLabelVisible: true, title: '70' });
            lwRsiSeries.createPriceLine({ price: 50, color: '#787B86', lineStyle: 3, axisLabelVisible: true, title: '50' });
            lwRsiSeries.createPriceLine({ price: 30, color: '#787B86', lineStyle: 2, axisLabelVisible: true, title: '30' });
        } catch (err) {
            console.error("Error creating RSI pane:", err);
            return;
        }
    } else {
        lwRsiPane = panes[1];
    }
    
    if (lwRsiBandSeries && bars.length > 0) {
        lwRsiBandSeries.setData(bars.map(b => ({ time: b.time, value: 70 })));
    }
    
    const rsiValues = calculateRSIValues(bars, rsiConfig.period);
    const rsiData = [];
    for (let i = 0; i < bars.length; i++) {
        if (rsiValues[i] !== null) {
            rsiData.push({ time: bars[i].time, value: rsiValues[i] });
        }
    }
    if (lwRsiSeries) {
        lwRsiSeries.setData(rsiData);
    }
    
    // Detect Divergences
    const divergences = detectRSIDivergences(bars, rsiValues, rsiConfig);
    
    // Build markers for candlestick series & RSI series
    const markers = [];
    divergences.forEach(div => {
        const isBullish = div.type === 'bull' || div.type === 'hbull';
        const color = isBullish ? '#22c55e' : '#ef4444';
        const position = isBullish ? 'belowBar' : 'aboveBar';
        const shape = isBullish ? 'arrowUp' : 'arrowDown';
        
        markers.push({
            time: div.time2,
            position: position,
            color: color,
            shape: shape,
            text: div.text
        });
    });
    
    markers.sort((a, b) => a.time - b.time);
    if (lwCandlestickSeries && typeof lwCandlestickSeries.setMarkers === 'function') {
        lwCandlestickSeries.setMarkers(markers);
    }
    if (lwRsiSeries && typeof lwRsiSeries.setMarkers === 'function') {
        lwRsiSeries.setMarkers(markers);
    }
    
    // Draw trendlines connecting divergence points (limit to last 15 to avoid massive DOM/Canvas overhead)
    const recentDivergences = divergences.slice(-15);
    recentDivergences.forEach(div => {
        const isBullish = div.type === 'bull' || div.type === 'hbull';
        const color = isBullish ? '#22c55e' : '#ef4444';
        
        // 1. Line on RSI Pane
        if (lwRsiPane) {
            try {
                const rsiConnector = lwRsiPane.addSeries(LightweightCharts.LineSeries, {
                    color: color,
                    lineWidth: 2,
                    lineStyle: 0,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false
                });
                rsiConnector.setData([
                    { time: div.time1, value: div.rsi1 },
                    { time: div.time2, value: div.rsi2 }
                ]);
                rsiDivergenceConnectors.push(rsiConnector);
            } catch (e) {}
        }
        
        // 2. Line on Price Chart
        try {
            const priceConnector = lwChartInstance.addSeries(LightweightCharts.LineSeries, {
                color: color,
                lineWidth: 2,
                lineStyle: 0,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false
            });
            priceConnector.setData([
                { time: div.time1, value: div.price1 },
                { time: div.time2, value: div.price2 }
            ]);
            rsiDivergenceConnectors.push(priceConnector);
        } catch (e) {}
    });
}

function syncTfButtonsUi() {
    // Sync mode buttons styling across all timeframe selectors
    document.querySelectorAll('.chart-timeframe-selector .mode-btn').forEach(b => {
        if (b.getAttribute('data-mode') === currentTfMode) {
            b.classList.add('active');
            b.style.background = 'var(--primary-color)';
            b.style.color = 'white';
        } else {
            b.classList.remove('active');
            b.style.background = 'transparent';
            b.style.color = 'var(--text-secondary)';
        }
    });

    // Toggle interval groups display
    document.querySelectorAll('.chart-timeframe-selector').forEach(selector => {
        const groupTf = selector.querySelector('.group-tf');
        const groupTi = selector.querySelector('.group-ti');
        if (groupTf) groupTf.style.display = (currentTfMode === 'TF') ? 'inline-flex' : 'none';
        if (groupTi) groupTi.style.display = (currentTfMode === 'TI') ? 'inline-flex' : 'none';
    });

    // Sync active state on interval buttons
    document.querySelectorAll('.chart-timeframe-selector .tf-btn[data-tf]').forEach(b => {
        if (b.getAttribute('data-tf') === currentResolution) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
}

function switchTfMode(mode, symbol) {
    currentTfMode = mode;
    const targetRes = (mode === 'TI') ? lastTiResolution : lastTfResolution;
    currentResolution = targetRes;

    try {
        localStorage.setItem('trade_chart_tf_mode', currentTfMode);
        localStorage.setItem('trade_chart_resolution', currentResolution);
    } catch (e) {}

    syncTfButtonsUi();
    loadChartData(symbol || (state.config.symbol || "GER40"), currentResolution, true);
}

function loadTradingViewWidget() {
    const symbol = state.config.symbol || "GER40";
    
    const container = document.getElementById('tradingview_chart');
    if (!container) return;
    
    // Defensive check if LightweightCharts library fails to load
    if (typeof LightweightCharts === 'undefined') {
        container.innerHTML = `<div style="color: #ef5350; padding: 20px; text-align: center; font-family: var(--font-family-base); height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 10px;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px;"></i>
            <strong>Erreur:</strong> La librairie de graphiques (Lightweight Charts) n'est pas chargée.<br>
            <span style="font-size: 12px; color: var(--text-secondary);">Vérifiez la présence du fichier /static/js/lightweight-charts.js</span>
        </div>`;
        return;
    }
    
    // Clear container if initialized for a different symbol, or is empty, or instance is null
    if (state.lastLoadedTvSymbol !== symbol || container.innerHTML === "" || !lwChartInstance) {
        container.innerHTML = "";
        state.lastLoadedTvSymbol = symbol;
        
        // Use container size or reasonable default if currently hidden (0 size)
        const initialWidth = container.clientWidth || 600;
        const initialHeight = container.clientHeight || 400;
        
        // 1. Create Lightweight Chart
        lwChartInstance = LightweightCharts.createChart(container, {
            width: initialWidth,
            height: initialHeight,
            layout: {
                background: { type: 'solid', color: '#ffffff' },
                textColor: '#0f172a',
            },
            grid: {
                vertLines: { color: '#f1f5f9' },
                horzLines: { color: '#f1f5f9' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    labelVisible: false,
                },
                horzLine: {
                    labelVisible: false,
                }
            },
            rightPriceScale: {
                borderColor: '#e2e8f0',
            },
            timeScale: {
                borderColor: '#e2e8f0',
                timeVisible: true,
                secondsVisible: true,
            },
        });
        
        // 2. Add Candlestick Series
        state.bidPriceLine = null;
        state.askPriceLine = null;
        lwRsiPane = null;
        lwRsiSeries = null;
        rsiDivergenceConnectors = [];
        lwCandlestickSeries = lwChartInstance.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderDownColor: '#ef5350',
            borderUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        // 3. Add Indicators (MM50 & BB20, 2.5)
        lwSmaSeries = lwChartInstance.addSeries(LightweightCharts.LineSeries, {
            color: '#2196f3', // Blue
            lineWidth: 1.5,
            title: 'MM50',
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        lwBbBasisSeries = lwChartInstance.addSeries(LightweightCharts.LineSeries, {
            color: '#ff9800', // Orange
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: 'BB Basis',
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        lwBbUpperSeries = lwChartInstance.addSeries(LightweightCharts.LineSeries, {
            color: '#4caf50', // Green
            lineWidth: 1,
            title: 'BB Upper',
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        lwBbLowerSeries = lwChartInstance.addSeries(LightweightCharts.LineSeries, {
            color: '#f44336', // Red
            lineWidth: 1,
            title: 'BB Lower',
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        // 4. Add Candle Duration Histogram Series for Mode TI (volume-style overlay at bottom 20%)
        lwDurationSeries = lwChartInstance.addSeries(LightweightCharts.HistogramSeries, {
            priceScaleId: 'duration',
            priceFormat: {
                type: 'custom',
                formatter: (val) => formatSecsToDuration(Math.round(val)),
            },
            title: 'Durée (s)',
            lastValueVisible: false,
            priceLineVisible: false
        });
        
        lwChartInstance.priceScale('duration').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
            visible: false
        });
        
        // Bind window resize event (safeguarded against 0 sizes when tab is inactive)
        window.addEventListener('resize', () => {
            if (lwChartInstance && container) {
                const w = container.clientWidth;
                const h = container.clientHeight;
                if (w > 0 && h > 0) {
                    lwChartInstance.resize(w, h);
                }
            }
        });
        
        // Bind mode switcher (TF vs TI) and timeframe selector button events
        const tfSelectors = document.querySelectorAll('.chart-timeframe-selector');
        tfSelectors.forEach(selector => {
            // Mode toggle buttons (TF vs TI)
            const modeBtns = selector.querySelectorAll('.mode-btn');
            modeBtns.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', () => {
                    const mode = newBtn.getAttribute('data-mode');
                    switchTfMode(mode, symbol);
                });
            });

            // Interval buttons (only target buttons with data-tf attribute)
            const tfButtons = selector.querySelectorAll('.tf-btn[data-tf]');
            tfButtons.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', () => {
                    const tfVal = newBtn.getAttribute('data-tf');
                    if (!tfVal) return;
                    currentResolution = tfVal;
                    if (tfVal.endsWith('T')) {
                        lastTiResolution = tfVal;
                        try { localStorage.setItem('trade_chart_last_ti', tfVal); } catch (e) {}
                    } else {
                        lastTfResolution = tfVal;
                        try { localStorage.setItem('trade_chart_last_tf', tfVal); } catch (e) {}
                    }
                    try {
                        localStorage.setItem('trade_chart_resolution', tfVal);
                        localStorage.setItem('trade_chart_tf_mode', currentTfMode);
                    } catch (e) {}
                    
                    syncTfButtonsUi();
                    loadChartData(symbol, currentResolution, true); // shouldFit = true on timeframe click
                });
            });
        });
        
        // Initial sync of timeframe buttons UI with stored/default settings
        syncTfButtonsUi();

        // Fast binary search for bar by timestamp (O(log N) instead of O(N) find on every mouse move)
        function findBarByTime(bars, targetTime) {
            if (!bars || bars.length === 0) return null;
            let low = 0;
            let high = bars.length - 1;
            while (low <= high) {
                const mid = (low + high) >> 1;
                const midTime = bars[mid].time;
                if (midTime === targetTime) return bars[mid];
                if (midTime < targetTime) low = mid + 1;
                else high = mid - 1;
            }
            return null;
        }

        // Bind crosshair movement for hover legend (timestamp start/end, duration, OHLC)
        lwChartInstance.subscribeCrosshairMove((param) => {
            if (!param || !param.time || !param.seriesData || !param.seriesData.get(lwCandlestickSeries)) {
                if (chartBars.length > 0) {
                    updateHoverLegend(chartBars[chartBars.length - 1]);
                }
                return;
            }

            const priceData = param.seriesData.get(lwCandlestickSeries);
            if (priceData) {
                const matchingBar = findBarByTime(chartBars, param.time) || priceData;
                updateHoverLegend(matchingBar);
            }
        });

        // Track visible candle count when zooming, panning, or resizing
        lwChartInstance.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (!range || !chartBars || chartBars.length === 0) return;
            const count = Math.round(range.to - range.from);
            if (count > 0 && isFinite(count)) {
                const input = document.getElementById('trade-candle-count-input');
                if (input && document.activeElement !== input) {
                    input.value = count;
                }
                clearTimeout(candleCountSaveTimeout);
                candleCountSaveTimeout = setTimeout(() => {
                    try {
                        localStorage.setItem('trade_chart_candle_count', count.toString());
                    } catch (e) {}
                }, 300);
            }
        });

        // Initial data load
        loadChartData(symbol, currentResolution, true); // shouldFit = true on init
        console.log("Lightweight Chart initialized with local symbol:", symbol);
        
        // Draw key levels on initialization
        updateChartKeyLevels();
    } else {
        // If already initialized, trigger a resize to current container dimensions
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
            console.log(`Resizing existing chart instance to: ${w}x${h}`);
            lwChartInstance.resize(w, h);
        }
    }
}

function formatSecsToDuration(seconds) {
    if (!seconds || seconds <= 0) return "1s";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function updateHoverLegend(bar) {
    const legendBox = document.getElementById('chart-hover-legend');
    if (legendBox) {
        if (!currentResolution.endsWith('T')) {
            legendBox.style.display = 'none';
            return;
        } else {
            legendBox.style.display = 'flex';
        }
    }

    const legendTfTag = document.getElementById('legend-tf-tag');
    const legendTimeRange = document.getElementById('legend-time-range');
    const legendDurationTag = document.getElementById('legend-duration-tag');

    if (legendTfTag) legendTfTag.innerText = currentResolution;
    if (!bar) return;

    const tStart = bar.tStart || bar.time;
    const tEnd = bar.tEnd || bar.time;
    const duration = (bar.duration && bar.duration > 0)
        ? bar.duration
        : (tEnd && tStart ? Math.max(1, Math.min(300, tEnd - tStart)) : null);

    if (tStart) {
        const dStart = new Date(tStart * 1000);
        const startStr = dStart.toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let rangeStr = startStr;
        if (tEnd && tEnd !== tStart) {
            const dEnd = new Date(tEnd * 1000);
            const endStr = dEnd.toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            rangeStr += ` → ${endStr}`;
        }
        if (legendTimeRange) legendTimeRange.innerText = rangeStr;
    }

    if (currentResolution.endsWith('T') && duration) {
        if (legendDurationTag) {
            legendDurationTag.style.display = 'inline-block';
            legendDurationTag.innerText = `Durée: ${formatSecsToDuration(duration)}`;
        }
    } else {
        if (legendDurationTag) legendDurationTag.style.display = 'none';
    }
}

// ==========================================================================
// TRADE ANALYSIS CHART LOGIC (PC/DESKTOP SPLIT VIEW)
// ==========================================================================
function initAnalysisChart() {
    const container = document.getElementById('analysis_chart');
    if (!container || analysisChartInstance) return;
    
    // Only initialize on desktop viewports (width >= 1024px)
    if (window.innerWidth < 1024) return;
    
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 400;
    
    console.log(`Initializing trade analysis chart: ${w}x${h}`);
    
    analysisChartInstance = LightweightCharts.createChart(container, {
        width: w,
        height: h,
        handleScale: {
            axisDoubleClickReset: false, // Prevents double click from resetting zoom/scale
            mouseWheel: true,
            pinch: true,
        },
        handleScroll: {
            mouseWheel: false, // Prevents mouse wheel inertia from scrolling the chart unexpectedly
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
        },
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#64748b',
            fontSize: 10,
            fontFamily: 'Inter, sans-serif',
        },
        grid: {
            vertLines: { color: 'rgba(226, 232, 240, 0.4)' },
            horzLines: { color: 'rgba(226, 232, 240, 0.4)' },
        },
        rightPriceScale: {
            borderColor: 'rgba(226, 232, 240, 0.8)',
            visible: true,
        },
        leftPriceScale: {
            borderColor: 'rgba(226, 232, 240, 0.8)',
            visible: true,
        },
        timeScale: {
            borderColor: 'rgba(226, 232, 240, 0.8)',
            timeVisible: true,
            secondsVisible: false,
        },
        crosshair: {
            mode: 1, // CrosshairMode.Normal
            vertLine: {
                labelVisible: true,
            },
            horzLine: {
                labelVisible: true,
            }
        }
    });
    
    // Add Candlestick Series (Right price scale)
    analysisCandlestickSeries = analysisChartInstance.addSeries(LightweightCharts.CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        lastValueVisible: false,
        priceLineVisible: false
    });
    
    // Add PnL line series (Mapped to left price scale)
    analysisPnlSeries = analysisChartInstance.addSeries(LightweightCharts.LineSeries, {
        color: '#29b6f6',
        lineWidth: 2,
        priceScaleId: 'left', // Map to left-side axis!
        lastValueVisible: false,
        priceLineVisible: false
    });
    
    // Enable left price scale
    analysisChartInstance.priceScale('left').applyOptions({
        visible: true,
        borderVisible: true,
    });
    
    // Bind window resize event (safeguarded against 0 sizes when tab is inactive)
    window.addEventListener('resize', () => {
        if (analysisChartInstance && container) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0) {
                analysisChartInstance.resize(w, h);
            }
        }
    });
}

function getAvailableDates() {
    if (!state.lastHistoryData || !state.lastHistoryData.stats) return [];
    // Extract dates and sort them chronologically
    return state.lastHistoryData.stats.map(s => s.date).sort();
}

function updateAnalysisDayNavButtons() {
    const prevBtn = document.getElementById('btn-prev-analysis-day');
    const nextBtn = document.getElementById('btn-next-analysis-day');
    if (!prevBtn || !nextBtn) return;
    
    const dates = getAvailableDates();
    if (dates.length <= 1 || !analysisSelectedDate) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    const currentIndex = dates.indexOf(analysisSelectedDate);
    if (currentIndex === -1) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        prevBtn.disabled = (currentIndex === 0);
        nextBtn.disabled = (currentIndex === dates.length - 1);
    }
}

async function loadAnalysisChartData(selectedDate, forceFit = true) {
    if (!analysisChartInstance) initAnalysisChart();
    if (!analysisChartInstance) return;
    
    // Hide stats container by default on load
    const statsContainer = document.getElementById('analysis-stats-container');
    if (statsContainer) statsContainer.style.display = 'none';

    // Update navigation buttons enabled/disabled states
    updateAnalysisDayNavButtons();

    // Capture current zoom/pan logical range if not forcing fit
    let logicalRange = null;
    if (!forceFit) {
        logicalRange = analysisChartInstance.timeScale().getVisibleLogicalRange();
    }
    
    // Retrieve selected timezone offset
    let localOffset = 0;
    const selectTz = document.getElementById('select-analysis-timezone');
    const storedTz = localStorage.getItem('analysis_timezone_val') || 'auto';
    if (selectTz) {
        selectTz.value = storedTz;
    }
    if (storedTz === 'auto') {
        localOffset = -new Date().getTimezoneOffset() * 60;
    } else {
        localOffset = parseInt(storedTz);
    }
    
    const chkHideSmall = document.getElementById('chk-hide-small-trades');
    const hideSmall = chkHideSmall ? chkHideSmall.checked : (localStorage.getItem('analysis_hide_small_trades') === 'true');
    
    // Auto-resize analysis chart to container size if container size has become available
    const container = document.getElementById('analysis_chart');
    if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
            analysisChartInstance.resize(w, h);
        }
    }
    if (!state.lastHistoryData || !state.lastHistoryData.trades) return;
    const allTrades = state.lastHistoryData.trades;
    
    // Format timestamp to YYYY-MM-DD in UTC to align with the backend grouping
    const getLocalDateStr = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    
    // Filter trades for this date
    const dayTrades = allTrades.filter(t => getLocalDateStr(t.close_time) === selectedDate);
    
    // Parse selectedDate safely (cross-browser compatible)
    const parts = selectedDate.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-indexed
    const day = parseInt(parts[2]);
    
    // Determine time range bounds (standard 8am to 6pm UTC, or adapted to trades)
    let minOpenTime = Math.floor(Date.UTC(year, month, day, 8, 0, 0) / 1000);
    let maxCloseTime = Math.floor(Date.UTC(year, month, day, 18, 0, 0) / 1000);
    
    if (dayTrades.length > 0) {
        const openTimes = dayTrades.map(t => t.open_time);
        const closeTimes = dayTrades.map(t => t.close_time);
        minOpenTime = Math.min(...openTimes);
        maxCloseTime = Math.max(...closeTimes);
    }
    
    // Add 1 hour margin before first open and after last close
    const fromTime = minOpenTime - 3600;
    const toTime = maxCloseTime + 3600;
    
    const symbol = state.config.symbol;
    const resolution = "1"; // 1-minute candles for precise trading review
    const url = `/api/udf/history?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromTime}&to=${toTime}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.s === "no_data" || !data.t || data.t.length === 0) {
            analysisCandlestickSeries.setData([]);
            analysisPnlSeries.setData([]);
            if (analysisConnectorSeries) {
                analysisConnectorSeries.setData([]);
            }
            analysisTradeConnectors.forEach(s => {
                try {
                    analysisChartInstance.removeSeries(s);
                } catch (e) {}
            });
            analysisTradeConnectors = [];
            if (analysisMarkersPlugin) {
                analysisMarkersPlugin.setMarkers([]);
            }
            return;
        }
        
        const bars = [];
        for (let i = 0; i < data.t.length; i++) {
            bars.push({
                time: data.t[i] + localOffset,
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i]
            });
        }
        analysisCandlestickSeries.setData(bars);
        
        // Clear old trade connector line
        if (analysisConnectorSeries) {
            analysisConnectorSeries.setData([]);
        }
        
        // Remove all old trade connector series
        analysisTradeConnectors.forEach(s => {
            try {
                analysisChartInstance.removeSeries(s);
            } catch (e) {}
        });
        analysisTradeConnectors = [];
        
        // Helper to find the closest candle time to attach markers
        const findClosestCandleTime = (targetTime, candles) => {
            if (!candles || candles.length === 0) return targetTime;
            let closest = candles[0].time;
            let minDiff = Math.abs(targetTime - closest);
            for (let i = 1; i < candles.length; i++) {
                const diff = Math.abs(targetTime - candles[i].time);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = candles[i].time;
                }
            }
            return closest;
        };

        // Plot ALL daily trades entry/exit markers and draw connection lines
        const markers = [];
        dayTrades.forEach(t => {
            // Safety check: ensure all open/close times and prices are valid finite numbers
            if (typeof t.open_time === 'number' && typeof t.close_time === 'number' &&
                typeof t.open_price === 'number' && typeof t.close_price === 'number' &&
                !isNaN(t.open_time) && !isNaN(t.close_time) &&
                !isNaN(t.open_price) && !isNaN(t.close_price)) {
                
                // Skip markers and connectors for small trades if the filter option is enabled
                if (hideSmall && Math.abs(t.pips) <= 10) {
                    return;
                }
                
                const rawEntryTimeShifted = t.open_time + localOffset;
                const rawExitTimeShifted = t.close_time + localOffset;
                
                // Only push Entry marker if it falls within the loaded candle range
                if (bars.length > 0 && rawEntryTimeShifted >= bars[0].time && rawEntryTimeShifted <= bars[bars.length - 1].time) {
                    const entryMarkerTime = findClosestCandleTime(rawEntryTimeShifted, bars);
                    markers.push({
                        time: entryMarkerTime,
                        position: t.type === 'BUY' ? 'belowBar' : 'aboveBar',
                        color: t.type === 'BUY' ? '#26a69a' : '#ef5350',
                        shape: t.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                        text: `${t.type} ${t.volume.toFixed(2)}`
                    });
                }
                
                // Only push Exit marker if it falls within the loaded candle range
                if (bars.length > 0 && rawExitTimeShifted >= bars[0].time && rawExitTimeShifted <= bars[bars.length - 1].time) {
                    const exitMarkerTime = findClosestCandleTime(rawExitTimeShifted, bars);
                    const pipsText = `${t.pips >= 0 ? '+' : ''}${t.pips}p`;
                    markers.push({
                        time: exitMarkerTime,
                        position: t.type === 'BUY' ? 'aboveBar' : 'belowBar',
                        color: t.net >= 0 ? '#26a69a' : '#ef5350',
                        shape: t.type === 'BUY' ? 'arrowDown' : 'arrowUp',
                        text: `Exit (${pipsText})`
                    });
                }
                
                // Connect entry and exit with a faint dashed line (aligned to nearest minute)
                const connector = analysisChartInstance.addSeries(LightweightCharts.LineSeries, {
                    color: t.net >= 0 ? 'rgba(38, 166, 154, 0.35)' : 'rgba(239, 83, 80, 0.35)',
                    lineWidth: 1.5,
                    lineStyle: 2, // Dashed
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false,
                });
                
                const openMinute = Math.floor(t.open_time / 60) * 60;
                const closeMinute = Math.floor(t.close_time / 60) * 60;
                
                connector.setData([
                    { time: openMinute + localOffset, value: t.open_price },
                    { time: closeMinute + localOffset, value: t.close_price }
                ]);
                analysisTradeConnectors.push(connector);
            }
        });
        
        // Sort chronologically
        markers.sort((a, b) => a.time - b.time);
        
        // Update markers using the v5 plugin API (createSeriesMarkers)
        if (analysisMarkersPlugin) {
            analysisMarkersPlugin.setMarkers(markers);
        } else if (typeof LightweightCharts.createSeriesMarkers === 'function') {
            analysisMarkersPlugin = LightweightCharts.createSeriesMarkers(analysisCandlestickSeries, markers);
        } else {
            console.warn("createSeriesMarkers is not available in LightweightCharts");
            // Fallback for older versions if loaded
            if (typeof analysisCandlestickSeries.setMarkers === 'function') {
                analysisCandlestickSeries.setMarkers(markers);
            }
        }
        
        // Plot Cumulative PnL (Equity) on the separate left scale
        const pnlPoints = [];
        let cumulativeVal = 0;
        const chronologicalTrades = [...dayTrades].sort((a, b) => a.close_time - b.close_time);
        
        if (chronologicalTrades.length > 0) {
            // Set 0 baseline starting point (rounded to nearest minute)
            const firstOpenMinute = Math.floor(chronologicalTrades[0].open_time / 60) * 60;
            pnlPoints.push({
                time: firstOpenMinute + localOffset - 60,
                value: 0
            });
            
            let lastTimestamp = 0;
            chronologicalTrades.forEach(t => {
                cumulativeVal += state.journalUnit === 'EUR' ? t.net : t.pips;
                // Round close time to nearest minute
                let tTime = Math.floor(t.close_time / 60) * 60;
                // Offset duplicate timestamps by 60 seconds (1 minute) to stay on candle timeline grid
                if (tTime <= lastTimestamp) {
                    tTime = lastTimestamp + 60;
                }
                lastTimestamp = tTime;
                
                pnlPoints.push({
                    time: tTime + localOffset,
                    value: cumulativeVal
                });
            });
            
            // Stretch the line to the last loaded candle time for continuity
            const lastCandleTime = data.t[data.t.length - 1];
            if (lastCandleTime > lastTimestamp) {
                pnlPoints.push({
                    time: lastCandleTime + localOffset,
                    value: cumulativeVal
                });
            }
        }
        analysisPnlSeries.setData(pnlPoints);
        
        // --- Calculate and Display additional stats under the chart ---
        if (chronologicalTrades.length > 0) {
            let maxPnl = 0;
            let maxPnlTime = null;
            let minPnl = 0;
            let minPnlTime = null;
            let peak = 0;
            let maxDrawdown = 0;
            
            let runningPnl = 0;
            let totalLots = 0;
            let winningGains = 0;
            let losingLosses = 0;
            
            chronologicalTrades.forEach(t => {
                const tradeVal = state.journalUnit === 'EUR' ? t.net : t.pips;
                runningPnl += tradeVal;
                totalLots += t.volume;
                
                if (tradeVal > 0) {
                    winningGains += tradeVal;
                } else {
                    losingLosses += Math.abs(tradeVal);
                }
                
                // Max PnL peak
                if (runningPnl > maxPnl) {
                    maxPnl = runningPnl;
                    maxPnlTime = t.close_time;
                }
                // Min PnL valley
                if (runningPnl < minPnl) {
                    minPnl = runningPnl;
                    minPnlTime = t.close_time;
                }
                
                // Drawdown calculation
                if (runningPnl > peak) {
                    peak = runningPnl;
                }
                const drawdown = peak - runningPnl;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            });
            
            const formatTimeWithOffset = (timestamp) => {
                if (!timestamp) return '--:--:--';
                const date = new Date((timestamp + localOffset) * 1000);
                const h = String(date.getUTCHours()).padStart(2, '0');
                const m = String(date.getUTCMinutes()).padStart(2, '0');
                const s = String(date.getUTCSeconds()).padStart(2, '0');
                return `${h}:${m}:${s}`;
            };
            
            const formatDuration = (sec) => {
                if (sec === Infinity || sec <= 0 || isNaN(sec)) return '0s';
                if (sec < 60) return `${sec}s`;
                const m = Math.floor(sec / 60);
                const s = sec % 60;
                return `${m}m ${s}s`;
            };
            
            const unit = state.journalUnit === 'EUR' ? ' EUR' : ' pips';
            const formattedFinal = (cumulativeVal >= 0 ? '+' : '') + cumulativeVal.toFixed(state.journalUnit === 'EUR' ? 2 : 1) + unit;
            const formattedMax = (maxPnl >= 0 ? '+' : '') + maxPnl.toFixed(state.journalUnit === 'EUR' ? 2 : 1) + unit;
            const formattedMin = (minPnl >= 0 ? '+' : '') + minPnl.toFixed(state.journalUnit === 'EUR' ? 2 : 1) + unit;
            const formattedDD = maxDrawdown.toFixed(state.journalUnit === 'EUR' ? 2 : 1) + unit;
            const avgTrade = (cumulativeVal / chronologicalTrades.length).toFixed(state.journalUnit === 'EUR' ? 2 : 1) + unit;
            
            let pfText = "1.00";
            if (losingLosses === 0) {
                pfText = winningGains > 0 ? "∞ (Sans perte)" : "1.00";
            } else {
                pfText = (winningGains / losingLosses).toFixed(2);
            }
            
            const avgDurationSec = Math.round(chronologicalTrades.reduce((acc, curr) => acc + (curr.close_time - curr.open_time), 0) / chronologicalTrades.length);
            
            const statsHtml = `
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Profit Final</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: ${cumulativeVal >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'};">${formattedFinal}</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-solid fa-flag-checkered"></i> Résultat net</span>
                </div>
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Profit Max</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: var(--color-buy);">${formattedMax}</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> à ${formatTimeWithOffset(maxPnlTime)}</span>
                </div>
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Profit Min</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: ${minPnl < 0 ? 'var(--color-sell)' : 'var(--text-primary)'};">${formattedMin}</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> à ${formatTimeWithOffset(minPnlTime)}</span>
                </div>
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Max Drawdown</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: var(--color-sell);">${formattedDD}</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-solid fa-arrow-down-long"></i> Baisse max</span>
                </div>
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Profit Factor</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${pfText}</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-solid fa-scale-balanced"></i> Ratio G/P</span>
                </div>
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Volume & Trades</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${totalLots.toFixed(2)} Lots</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-solid fa-calculator"></i> ${chronologicalTrades.length} trades clos</span>
                </div>
                <div class="analysis-stat-card" style="background: var(--bg-input); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
                    <span class="stat-label" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">Moyenne / Trade</span>
                    <span class="stat-value" style="font-size: 13px; font-weight: 700; color: ${cumulativeVal >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'};">${(cumulativeVal >= 0 ? '+' : '') + avgTrade}</span>
                    <span class="stat-time" style="font-size: 9px; color: var(--text-muted);"><i class="fa-solid fa-stopwatch"></i> Rétention: ${formatDuration(avgDurationSec)}</span>
                </div>
            `;
            
            const statsRow = document.getElementById('analysis-stats-row');
            if (statsRow) statsRow.innerHTML = statsHtml;
            const statsContainer = document.getElementById('analysis-stats-container');
            if (statsContainer) statsContainer.style.display = 'block';
        }
        
        // Fit content or restore previously visible logical range
        if (forceFit) {
            analysisChartInstance.timeScale().fitContent();
        } else if (logicalRange) {
            analysisChartInstance.timeScale().setVisibleLogicalRange(logicalRange);
        }
        
    } catch (err) {
        console.error("Error loading analysis chart data:", err);
    }
}

function inspectTrade(tradeId) {
    if (!state.lastHistoryData || !state.lastHistoryData.trades || !analysisChartInstance) return;
    
    const trade = state.lastHistoryData.trades.find(t => t.position_id === tradeId);
    if (!trade) return;
    
    console.log(`Inspecting trade: ${tradeId}`, trade);
    analysisSelectedTradeId = tradeId;
    
    // Highlight table row
    document.querySelectorAll('.history-trade-row').forEach(row => {
        if (row.getAttribute('data-id') === String(tradeId)) {
            row.classList.add('active-inspect-row');
        } else {
            row.classList.remove('active-inspect-row');
        }
    });
    
    // Draw solid connection line between open and close points for the inspected trade
    if (!analysisConnectorSeries) {
        analysisConnectorSeries = analysisChartInstance.addSeries(LightweightCharts.LineSeries, {
            color: trade.net >= 0 ? '#26a69a' : '#ef5350',
            lineWidth: 3,
            lineStyle: 0, // Solid
            lastValueVisible: false,
            priceLineVisible: false
        });
    } else {
        analysisConnectorSeries.applyOptions({
            color: trade.net >= 0 ? '#26a69a' : '#ef5350',
            lineWidth: 3,
            lineStyle: 0 // Solid
        });
    }
    
    let localOffset = 0;
    const storedTz = localStorage.getItem('analysis_timezone_val') || 'auto';
    if (storedTz === 'auto') {
        localOffset = -new Date().getTimezoneOffset() * 60;
    } else {
        localOffset = parseInt(storedTz);
    }
    
    const openMinute = Math.floor(trade.open_time / 60) * 60;
    const closeMinute = Math.floor(trade.close_time / 60) * 60;
    
    analysisConnectorSeries.setData([
        { time: openMinute + localOffset, value: trade.open_price },
        { time: closeMinute + localOffset, value: trade.close_price }
    ]);
    
    // Zoom/Focus timescale to trade span with 3 minutes margin
    const marginSecs = 180;
    analysisChartInstance.timeScale().setVisibleRange({
        from: openMinute + localOffset - marginSecs,
        to: closeMinute + localOffset + marginSecs
    });
}

function applyVisibleCandleCount(count) {
    if (!lwChartInstance || !chartBars || chartBars.length === 0) return;
    let countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 5) countNum = 10;
    if (countNum > chartBars.length) countNum = chartBars.length;
    
    const timeScale = lwChartInstance.timeScale();
    const total = chartBars.length;
    const to = total - 1 + 3;
    const from = Math.max(0, to - countNum);
    timeScale.setVisibleLogicalRange({ from, to });
    
    try {
        localStorage.setItem('trade_chart_candle_count', countNum.toString());
    } catch (e) {}
    const input = document.getElementById('trade-candle-count-input');
    if (input && document.activeElement !== input) {
        input.value = countNum;
    }
}

async function loadChartData(symbol, resolution, shouldFit = false) {
    if (!lwChartInstance) return;
    
    // Auto-resize if container is visible and has changed
    const container = document.getElementById('tradingview_chart');
    if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
            lwChartInstance.resize(w, h);
        }
    }
    
    // Determine historical timeframe range (7 days for Tick and Minute modes, 3 days for second bars)
    const now = Math.floor(Date.now() / 1000);
    let rangeSeconds = 3 * 24 * 3600;
    if (resolution.endsWith('T') || ['1', '2', '3', '5', '15', '30', '60'].includes(resolution)) {
        rangeSeconds = 7 * 24 * 3600;
    }
    const fromTime = now - rangeSeconds;
    const toTime = now + 86400;
    
    try {
        const url = `/api/udf/history?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromTime}&to=${toTime}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.s === "no_data" || !data.t || data.t.length === 0) {
            lwCandlestickSeries.setData([]);
            lwSmaSeries.setData([]);
            lwBbBasisSeries.setData([]);
            lwBbUpperSeries.setData([]);
            lwBbLowerSeries.setData([]);
            if (lwDurationSeries) lwDurationSeries.setData([]);
            chartBars = [];
            return;
        }
        
        const bars = [];
        for (let i = 0; i < data.t.length; i++) {
            bars.push({
                time: timeToLocal(data.t[i]),
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i],
                tStart: timeToLocal(data.t_start ? data.t_start[i] : data.t[i]),
                tEnd: timeToLocal(data.t_end ? data.t_end[i] : data.t[i]),
                duration: data.duration ? data.duration[i] : 1,
                ticks: data.ticks ? data.ticks[i] : 1
            });
        }
        
        // Save the visible logical range before updating data if we should NOT fit
        const timeScale = lwChartInstance.timeScale();
        const logicalRange = shouldFit ? null : timeScale.getVisibleLogicalRange();

        chartBars = bars;
        lwCandlestickSeries.setData(bars);
        
        if (bars.length > 0) {
            updateHoverLegend(bars[bars.length - 1]);
        }
        
        // Calculate and plot indicators
        updateIndicatorSeries(bars);
        
        // Fit content on screen or apply saved candle count
        if (shouldFit) {
            const savedCandles = parseInt(localStorage.getItem('trade_chart_candle_count'), 10) || 100;
            if (bars.length > 0) {
                const to = bars.length - 1 + 3;
                const from = Math.max(0, to - savedCandles);
                timeScale.setVisibleLogicalRange({ from, to });
            } else {
                timeScale.fitContent();
            }
            const input = document.getElementById('trade-candle-count-input');
            if (input && document.activeElement !== input) {
                input.value = savedCandles;
            }
        } else if (logicalRange) {
            timeScale.setVisibleLogicalRange(logicalRange);
        }
        
        // Draw initial Bid/Ask lines if available
        if (state.lastBid > 0 && state.lastAsk > 0) {
            updateBidAskPriceLines(state.lastBid, state.lastAsk);
        }
        
    } catch (err) {
        console.error("Error loading chart data:", err);
    }
}

function updateIndicatorSeries(bars) {
    const smaPeriod = 50;
    const bbPeriod = 20;
    const bbMult = 2.5;
    
    const smaData = [];
    const bbBasisData = [];
    const bbUpperData = [];
    const bbLowerData = [];
    
    for (let i = 0; i < bars.length; i++) {
        const time = bars[i].time;
        
        // Calculate SMA 50
        if (i >= smaPeriod - 1) {
            let sum = 0;
            for (let j = 0; j < smaPeriod; j++) {
                sum += bars[i - j].close;
            }
            smaData.push({ time, value: sum / smaPeriod });
        }
        
        // Calculate Bollinger Bands
        if (i >= bbPeriod - 1) {
            let sum = 0;
            for (let j = 0; j < bbPeriod; j++) {
                sum += bars[i - j].close;
            }
            const basis = sum / bbPeriod;
            
            let varianceSum = 0;
            for (let j = 0; j < bbPeriod; j++) {
                varianceSum += Math.pow(bars[i - j].close - basis, 2);
            }
            const stdDev = Math.sqrt(varianceSum / bbPeriod);
            
            bbBasisData.push({ time, value: basis });
            bbUpperData.push({ time, value: basis + bbMult * stdDev });
            bbLowerData.push({ time, value: basis - bbMult * stdDev });
        }
    }
    
    lwSmaSeries.setData(smaData);
    lwBbBasisSeries.setData(bbBasisData);
    lwBbUpperSeries.setData(bbUpperData);
    lwBbLowerSeries.setData(bbLowerData);

    // Update RSI Divergence Indicator
    updateRSIIndicator(bars);

    // Update Candle Duration Histogram (Tick Mode)
    updateDurationSeries(bars);
}

function updateDurationSeries(bars) {
    if (!lwDurationSeries) return;
    
    if (!currentResolution.endsWith('T') || !bars || bars.length === 0) {
        lwDurationSeries.setData([]);
        return;
    }
    
    const durationData = bars.map(bar => {
        const isUp = bar.close >= bar.open;
        return {
            time: bar.time,
            value: bar.duration || 1,
            color: isUp ? 'rgba(38, 166, 154, 0.55)' : 'rgba(239, 83, 80, 0.55)'
        };
    });
    
    lwDurationSeries.setData(durationData);
}

// Preset Selector helper
function setupPresetSelector(presetsContainerId, customInputEl) {
    const container = document.getElementById(presetsContainerId);
    if (!container) return;
    
    const btns = container.querySelectorAll('.preset-btn');
    
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const value = btn.getAttribute('data-val');
            if (value !== null && customInputEl) {
                if (presetsContainerId === 'lot-presets' || presetsContainerId === 'graph-lot-presets') {
                    state.isSplitActive = btn.getAttribute('data-split') === 'true';
                    state.splitScenario = parseInt(btn.getAttribute('data-scenario')) || 0;
                }
                customInputEl.value = value;
                customInputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Auto close the parameter panel when preset is clicked
            if (presetsContainerId.startsWith('graph-')) {
                toggleGraphParamPanel(null);
            } else {
                toggleScalpParamPanel(null);
            }
        });
    });
    
    if (customInputEl) {
        customInputEl.addEventListener('input', (e) => {
            if (e.isTrusted && (presetsContainerId === 'lot-presets' || presetsContainerId === 'graph-lot-presets')) {
                state.isSplitActive = false;
                state.splitScenario = 0;
            }
            
            // Remove active state from preset buttons if custom value doesn't match any
            btns.forEach(btn => {
                const isSplit = btn.getAttribute('data-split') === 'true';
                const scenario = parseInt(btn.getAttribute('data-scenario')) || 0;
                if (btn.getAttribute('data-val') === customInputEl.value) {
                    if ((presetsContainerId === 'lot-presets' || presetsContainerId === 'graph-lot-presets') && 
                        (isSplit !== state.isSplitActive || scenario !== state.splitScenario)) {
                        btn.classList.remove('active');
                    } else {
                        btn.classList.add('active');
                    }
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }
}

// // ==========================================================================
// REAL-TIME QUOTE STREAM (SSE)
// ==========================================================================
function startQuoteStream() {
    if (state.eventSource) {
        state.eventSource.close();
    }
    
    state.eventSource = new EventSource('/api/stream-quotes');
    
    state.eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.error) {
                // Connection or subscription issue
                if (elements.scalpBuyPrice) elements.scalpBuyPrice.innerText = '----.-';
                if (elements.scalpSellPrice) elements.scalpSellPrice.innerText = '----.-';
                if (elements.scalpSpreadMiddle) elements.scalpSpreadMiddle.innerText = '---';
                return;
            }
            
            const bid = data.bid;
            const ask = data.ask;
            
            // Format numbers to match standard broker decimals (e.g. 1 decimal for GER40)
            const formattedBid = bid.toFixed(1);
            const formattedAsk = ask.toFixed(1);
            const spread = (ask - bid).toFixed(1);
            
            if (elements.scalpBuyPrice) elements.scalpBuyPrice.innerText = formattedAsk; // We BUY at Ask
            if (elements.scalpSellPrice) elements.scalpSellPrice.innerText = formattedBid; // We SELL at Bid
            if (elements.scalpSpreadMiddle) elements.scalpSpreadMiddle.innerText = spread;

            // Update graph tab price elements if present
            const pipSize = getPipSize(state.config.symbol || "GER40", ask);
            if (state.executionType === 'l10') {
                const l10BuyPrice = (ask - (10.0 * pipSize)).toFixed(1);
                const l10SellPrice = (bid + (10.0 * pipSize)).toFixed(1);
                if (elements.graphBuyPrice) elements.graphBuyPrice.innerText = l10BuyPrice;
                if (elements.graphSellPrice) elements.graphSellPrice.innerText = l10SellPrice;
            } else if (state.executionType === 'limit') {
                const limitStr = state.limitPrice ? state.limitPrice.toFixed(1) : formattedAsk;
                if (elements.graphBuyPrice) elements.graphBuyPrice.innerText = limitStr;
                if (elements.graphSellPrice) elements.graphSellPrice.innerText = limitStr;
            } else {
                if (elements.graphBuyPrice) elements.graphBuyPrice.innerText = formattedAsk;
                if (elements.graphSellPrice) elements.graphSellPrice.innerText = formattedBid;
            }
            if (elements.graphSpreadMiddle) elements.graphSpreadMiddle.innerText = spread;
            
            // Track last bid price and check key levels consigne
            state.lastBidPrice = bid;
            checkKeyLevelsConsigne(bid);
            
            // Update Live Tick Status Badge and streaming for tick resolutions
            const tickBadge = document.getElementById('chart-tick-status-badge');
            const tickBadgeText = document.getElementById('tick-badge-text');

            if (currentResolution.endsWith('T') && data.tick_status) {
                const nTicks = parseInt(currentResolution.replace('T', ''));
                const st = data.tick_status[nTicks];
                if (st && tickBadge && tickBadgeText) {
                    tickBadge.style.display = 'inline-flex';
                    tickBadgeText.innerText = `${st.count}/${st.target} (${st.duration}s)`;
                }
            } else {
                if (tickBadge) tickBadge.style.display = 'none';
            }
            
            // Stream ticks to Lightweight Chart if initialized
            if (lwChartInstance && lwCandlestickSeries && chartBars.length > 0) {
                const tickTime = timeToLocal(data.time);
                const price = bid; // bid price for the chart
                
                // Update Bid and Ask lines
                updateBidAskPriceLines(bid, ask);
                
                let lastBar = chartBars[chartBars.length - 1];
                let barTime = lastBar.time;
                let isNewBar = false;

                if (currentResolution.endsWith('T')) {
                    const nTicks = parseInt(currentResolution.replace('T', ''));
                    const st = data.tick_status ? data.tick_status[nTicks] : null;

                    if (st) {
                        // A new bar has started when:
                        // - the server's t_start is strictly after the last bar's tStart (new tick sequence)
                        // - OR the server signals count=1 (unambiguous new bar)
                        const lastTStart = lastBar.tStart || lastBar.time;
                        const serverTStart = st.t_start ? timeToLocal(st.t_start) : 0;
                        const isNewTickBar = !lastBar
                            || st.count === 1
                            || (serverTStart > 0 && serverTStart > lastTStart);

                        if (isNewTickBar) {
                            // A new tick bar opened! Finalize previous bar duration before adding the new one
                            if (lastBar) {
                                const finalDur = (st.prev_duration && st.prev_duration > 0)
                                    ? st.prev_duration
                                    : (lastBar.duration || 1);
                                lastBar.duration = finalDur;
                                if (lwDurationSeries) {
                                    const isUp = lastBar.close >= lastBar.open;
                                    lwDurationSeries.update({
                                        time: lastBar.time,
                                        value: finalDur,
                                        color: isUp ? 'rgba(38, 166, 154, 0.55)' : 'rgba(239, 83, 80, 0.55)'
                                    });
                                }
                            }
                            isNewBar = true;
                            barTime = tickTime > lastBar.time ? tickTime : lastBar.time + 1;
                            const newBar = {
                                time: barTime,
                                open: price,
                                high: price,
                                low: price,
                                close: price,
                                tStart: serverTStart || tickTime,
                                tEnd: tickTime,
                                duration: Math.max(1, st.duration || 1),
                                ticks: st.count
                            };
                            chartBars.push(newBar);
                            if (chartBars.length > 1500) chartBars.shift();
                        } else {
                            // Update the current (last) bar in place
                            lastBar.high = Math.max(lastBar.high, price);
                            lastBar.low = Math.min(lastBar.low, price);
                            lastBar.close = price;
                            lastBar.tEnd = tickTime;
                            lastBar.duration = (st.duration && st.duration > 0) ? st.duration : (lastBar.duration || 1);
                            lastBar.ticks = st.count || lastBar.ticks;
                        }
                    }
                } else {
                    // Time-based resolutions
                    let resSeconds = 15;
                    if (currentResolution === "30S") resSeconds = 30;
                    else if (currentResolution === "45S") resSeconds = 45;
                    else if (currentResolution === "1") resSeconds = 60;
                    else if (currentResolution === "2") resSeconds = 120;
                    else if (currentResolution === "3") resSeconds = 180;
                    else if (currentResolution === "5") resSeconds = 300;
                    
                    barTime = Math.floor(tickTime / resSeconds) * resSeconds;
                    
                    if (!lastBar || lastBar.time < barTime) {
                        isNewBar = true;
                        const newBar = {
                            time: barTime,
                            open: price,
                            high: price,
                            low: price,
                            close: price,
                            tStart: barTime,
                            tEnd: tickTime,
                            duration: Math.min(resSeconds, Math.max(1, tickTime - barTime)),
                            ticks: 1
                        };
                        chartBars.push(newBar);
                        if (chartBars.length > 1500) chartBars.shift();
                    } else if (lastBar.time === barTime) {
                        lastBar.high = Math.max(lastBar.high, price);
                        lastBar.low = Math.min(lastBar.low, price);
                        lastBar.close = price;
                        lastBar.tEnd = tickTime;
                        lastBar.duration = Math.min(resSeconds, Math.max(1, tickTime - (lastBar.tStart || lastBar.time)));
                        lastBar.ticks = (lastBar.ticks || 1) + 1;
                    }
                }
                
                const updatedBar = chartBars[chartBars.length - 1];
                lwCandlestickSeries.update(updatedBar);
                updateHoverLegend(updatedBar);
                
                // Recompute latest indicator values and update line series
                const barsCount = chartBars.length;
                if (barsCount >= 50) {
                    let sum = 0;
                    for (let j = 0; j < 50; j++) {
                        sum += chartBars[barsCount - 1 - j].close;
                    }
                    lwSmaSeries.update({ time: barTime, value: sum / 50 });
                }
                
                if (barsCount >= 20) {
                    let sum = 0;
                    for (let j = 0; j < 20; j++) {
                        sum += chartBars[barsCount - 1 - j].close;
                    }
                    const basis = sum / 20;
                    
                    let varianceSum = 0;
                    for (let j = 0; j < 20; j++) {
                        varianceSum += Math.pow(chartBars[barsCount - 1 - j].close - basis, 2);
                    }
                    const stdDev = Math.sqrt(varianceSum / 20);
                    
                    lwBbBasisSeries.update({ time: barTime, value: basis });
                    lwBbUpperSeries.update({ time: barTime, value: basis + 2.5 * stdDev });
                    lwBbLowerSeries.update({ time: barTime, value: basis - 2.5 * stdDev });
                }

                if (lwDurationSeries) {
                    if (currentResolution.endsWith('T')) {
                        const isUp = updatedBar.close >= updatedBar.open;
                        lwDurationSeries.update({
                            time: updatedBar.time,
                            value: updatedBar.duration || 1,
                            color: isUp ? 'rgba(38, 166, 154, 0.55)' : 'rgba(239, 83, 80, 0.55)'
                        });
                    } else {
                        lwDurationSeries.setData([]);
                    }
                }

                if (rsiEnabled && isNewBar) {
                    updateIndicatorSeries(chartBars);
                }
            }
            
            // Apply tick animations
            if (state.lastBid > 0) {
                if (bid > state.lastBid) {
                    flashPrice(elements.scalpSellPrice, 'tick-up');
                    if (elements.graphSellPrice) flashPrice(elements.graphSellPrice, 'tick-up');
                } else if (bid < state.lastBid) {
                    flashPrice(elements.scalpSellPrice, 'tick-down');
                    if (elements.graphSellPrice) flashPrice(elements.graphSellPrice, 'tick-down');
                }
            }
            
            if (state.lastAsk > 0) {
                if (ask > state.lastAsk) {
                    flashPrice(elements.scalpBuyPrice, 'tick-up');
                    if (elements.graphBuyPrice) flashPrice(elements.graphBuyPrice, 'tick-up');
                } else if (ask < state.lastAsk) {
                    flashPrice(elements.scalpBuyPrice, 'tick-down');
                    if (elements.graphBuyPrice) flashPrice(elements.graphBuyPrice, 'tick-down');
                }
            }
            
            // Store previous tick values
            state.lastBid = bid;
            state.lastAsk = ask;
            
        } catch (err) {
            console.error("Error parsing quote tick:", err);
        }
    };
    
    state.eventSource.onerror = (err) => {
        console.error("SSE Quote stream connection lost, retrying...", err);
        if (elements.scalpBuyPrice) elements.scalpBuyPrice.innerText = '----.-';
        if (elements.scalpSellPrice) elements.scalpSellPrice.innerText = '----.-';
        if (elements.scalpSpreadMiddle) elements.scalpSpreadMiddle.innerText = '---';
        if (elements.graphBuyPrice) elements.graphBuyPrice.innerText = '----.-';
        if (elements.graphSellPrice) elements.graphSellPrice.innerText = '----.-';
        if (elements.graphSpreadMiddle) elements.graphSpreadMiddle.innerText = '---';
    };
}

function updateBidAskPriceLines(bid, ask) {
    if (!lwChartInstance || !lwCandlestickSeries) return;
    
    // Bid line (Red)
    if (!state.bidPriceLine) {
        state.bidPriceLine = lwCandlestickSeries.createPriceLine({
            price: bid,
            color: '#ef5350', // red matching downColor
            lineWidth: 1.5,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: 'BID',
        });
    } else {
        try {
            state.bidPriceLine.applyOptions({ price: bid });
        } catch (e) {
            state.bidPriceLine = lwCandlestickSeries.createPriceLine({
                price: bid,
                color: '#ef5350',
                lineWidth: 1.5,
                lineStyle: 1,
                axisLabelVisible: true,
                title: 'BID',
            });
        }
    }
    
    // Ask line (Green)
    if (!state.askPriceLine) {
        state.askPriceLine = lwCandlestickSeries.createPriceLine({
            price: ask,
            color: '#26a69a', // green matching upColor
            lineWidth: 1.5,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: 'ASK',
        });
    } else {
        try {
            state.askPriceLine.applyOptions({ price: ask });
        } catch (e) {
            state.askPriceLine = lwCandlestickSeries.createPriceLine({
                price: ask,
                color: '#26a69a',
                lineWidth: 1.5,
                lineStyle: 1,
                axisLabelVisible: true,
                title: 'ASK',
            });
        }
    }
}

function flashPrice(element, className) {
    if (!element) return;
    element.classList.remove('tick-up', 'tick-down');
    requestAnimationFrame(() => {
        element.classList.add(className);
    });
    
    // Remove class after animation ends (600ms matching CSS)
    setTimeout(() => {
        element.classList.remove(className);
    }, 600);
}

// ==========================================================================
// JOURNAL ACCOUNT METRICS HELPER (TOTAL / BULL / SHORT)
// ==========================================================================

function updateJournalAccountMetrics() {
    const longConnected = Boolean(state.status && state.status.long && state.status.long.connected && state.status.long.account_info);
    const shortConnected = Boolean(state.status && state.status.short && state.status.short.connected && state.status.short.account_info);
    
    const longAcc = longConnected ? state.status.long.account_info : null;
    const shortAcc = shortConnected ? state.status.short.account_info : null;
    
    const isSingle = Boolean(
        (state.status && state.status.single_mode) || 
        (longConnected && shortConnected && longAcc && shortAcc && longAcc.login === shortAcc.login)
    );
    
    // Bull metrics (Worker 8011)
    const bullEquity = longAcc ? (Number(longAcc.equity) || 0) : 0;
    const bullBalance = longAcc ? (Number(longAcc.balance) || 0) : 0;
    const bullMarginFree = longAcc ? (Number(longAcc.margin_free) || 0) : 0;
    const bullPnL = longAcc ? (Number(longAcc.profit) || 0) : 0;
    
    // Short metrics (Worker 8012)
    const shortEquity = shortAcc ? (Number(shortAcc.equity) || 0) : 0;
    const shortBalance = shortAcc ? (Number(shortAcc.balance) || 0) : 0;
    const shortMarginFree = shortAcc ? (Number(shortAcc.margin_free) || 0) : 0;
    const shortPnL = shortAcc ? (Number(shortAcc.profit) || 0) : 0;
    
    // Total metrics (avoid double counting if single mode)
    const totalEquity = isSingle ? bullEquity : (bullEquity + shortEquity);
    const totalBalance = isSingle ? bullBalance : (bullBalance + shortBalance);
    const totalMarginFree = isSingle ? bullMarginFree : (bullMarginFree + shortMarginFree);
    const totalPnL = isSingle ? bullPnL : (bullPnL + shortPnL);
    
    let displayEquity = 0;
    let displayBalance = 0;
    let displayMarginFree = 0;
    let displayPnL = 0;
    
    const view = state.journalAccount || 'total';
    
    if (view === 'long') {
        displayEquity = bullEquity;
        displayBalance = bullBalance;
        displayMarginFree = bullMarginFree;
        displayPnL = bullPnL;
    } else if (view === 'short') {
        displayEquity = shortEquity;
        displayBalance = shortBalance;
        displayMarginFree = shortMarginFree;
        displayPnL = shortPnL;
    } else {
        // 'total' (somme des 2 comptes)
        displayEquity = totalEquity;
        displayBalance = totalBalance;
        displayMarginFree = totalMarginFree;
        displayPnL = totalPnL;
    }
    
    if (elements.journalEquityLabel) elements.journalEquityLabel.innerText = "Equity";
    if (elements.journalBalanceLabel) elements.journalBalanceLabel.innerText = "Balance";
    if (elements.journalFreeMarginLabel) elements.journalFreeMarginLabel.innerText = "Marge";
    
    if (elements.journalEquity) {
        elements.journalEquity.innerText = `${(Number(displayEquity) || 0).toFixed(2)} EUR`;
        if (displayPnL >= 0) {
            elements.journalEquity.className = "metric-val profit-text";
        } else {
            elements.journalEquity.className = "metric-val loss-text";
        }
    }
    if (elements.journalBalance) elements.journalBalance.innerText = `${(Number(displayBalance) || 0).toFixed(2)} EUR`;
    if (elements.journalFreeMargin) elements.journalFreeMargin.innerText = `${(Number(displayMarginFree) || 0).toFixed(2)} EUR`;
    
    // Sub-labels removed per request
    if (elements.journalEquitySub) elements.journalEquitySub.innerText = "";
    if (elements.journalBalanceSub) elements.journalBalanceSub.innerText = "";
    if (elements.journalFreeMarginSub) elements.journalFreeMarginSub.innerText = "";
    
    // Update active class on selector buttons if present
    const accountSelector = elements.journalAccountSelector || document.getElementById('journal-account-selector');
    if (accountSelector) {
        accountSelector.querySelectorAll('.preset-btn').forEach(btn => {
            if (btn.getAttribute('data-account') === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

// ==========================================================================
// POLLING UTILITIES (STATUS & POSITIONS)
// ==========================================================================

async function fetchStatus() {
    try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error("Status API returned error");
        
        const data = await response.json();
        
        // Update state
        state.status.long = data.long_terminal;
        state.status.short = data.short_terminal;
        state.status.single_mode = Boolean(data.single_mode);
        
        // Update long status badge UI
        if (data.long_terminal.connected) {
            if (elements.statusLongBadge) {
                elements.statusLongBadge.className = "status-badge connected";
                elements.statusLongBadge.querySelector('.status-text').innerText = "LONG CONNECTED";
            }
            
            // Config account card
            const acc = data.long_terminal.account_info;
            if (elements.accSrvLong) elements.accSrvLong.innerText = acc.server;
            if (elements.accLogLong) elements.accLogLong.innerText = acc.login;
            if (elements.accBalLong) elements.accBalLong.innerText = `${acc.balance.toFixed(2)} ${acc.currency}`;
            if (elements.accLevLong) elements.accLevLong.innerText = `1:${acc.leverage}`;
        } else {
            if (elements.statusLongBadge) {
                elements.statusLongBadge.className = "status-badge disconnected";
                elements.statusLongBadge.querySelector('.status-text').innerText = "LONG DISCONNECTED";
            }
            
            if (elements.accSrvLong) elements.accSrvLong.innerText = "-";
            if (elements.accLogLong) elements.accLogLong.innerText = "-";
            if (elements.accBalLong) elements.accBalLong.innerText = "-";
            if (elements.accLevLong) elements.accLevLong.innerText = "-";
        }

        // Update short status badge UI
        if (data.short_terminal.connected) {
            if (elements.statusShortBadge) {
                elements.statusShortBadge.className = "status-badge connected";
                elements.statusShortBadge.querySelector('.status-text').innerText = "SHORT CONNECTED";
            }
            
            // Config account card
            const acc = data.short_terminal.account_info;
            if (elements.accSrvShort) elements.accSrvShort.innerText = acc.server;
            if (elements.accLogShort) elements.accLogShort.innerText = acc.login;
            if (elements.accBalShort) elements.accBalShort.innerText = `${acc.balance.toFixed(2)} ${acc.currency}`;
            if (elements.accLevShort) elements.accLevShort.innerText = `1:${acc.leverage}`;
        } else {
            if (elements.statusShortBadge) {
                elements.statusShortBadge.className = "status-badge disconnected";
                elements.statusShortBadge.querySelector('.status-text').innerText = "SHORT DISCONNECTED";
            }
            
            if (elements.accSrvShort) elements.accSrvShort.innerText = "-";
            if (elements.accLogShort) elements.accLogShort.innerText = "-";
            if (elements.accBalShort) elements.accBalShort.innerText = "-";
            if (elements.accLevShort) elements.accLevShort.innerText = "-";
        }
        
        // Refresh journal account metrics whenever status updates
        updateJournalAccountMetrics();
        
    } catch (err) {
        console.error("Error fetching status:", err);
    }
}

async function fetchPositions() {
    try {
        const [posResponse, ordResponse] = await Promise.all([
            fetch('/api/positions'),
            fetch('/api/orders')
        ]);
        
        if (!posResponse.ok) throw new Error("Positions API returned error");
        if (!ordResponse.ok) throw new Error("Orders API returned error");
        
        const positions = await posResponse.json();
        const orders = await ordResponse.json();
        
        state.positions = positions;
        state.orders = orders;
        
        // Filter active symbol positions for the quick scalp list
        const symbolPositions = positions.filter(p => p.symbol === state.config.symbol);
        const symbolOrders = orders.filter(o => o.symbol === state.config.symbol);
        
        // Calculate PnL and updates
        let totalPnLPips = 0;
        symbolPositions.forEach(p => {
            const pipSize = getPipSize(p.symbol, p.price_open);
            const pnlPips = (p.type === 'BUY' 
                ? (p.price_current - p.price_open) 
                : (p.price_open - p.price_current)) / (pipSize || 1.0);
            totalPnLPips += pnlPips;
        });
        
        // Update Quick positions stats
        if (elements.quickPosCount) elements.quickPosCount.innerText = symbolPositions.length;
        if (elements.quickTotalPnL) {
            elements.quickTotalPnL.innerText = `${totalPnLPips >= 0 ? '+' : ''}${totalPnLPips.toFixed(1)} pips`;
            elements.quickTotalPnL.className = `total-pnl-badge ${totalPnLPips >= 0 ? 'profit-bg' : 'loss-bg'}`;
        }
        
        // Update Quick orders stats
        if (elements.quickOrdersCount) elements.quickOrdersCount.innerText = symbolOrders.length;
        
        // Update Graph positions stats
        if (elements.graphPosCount) elements.graphPosCount.innerText = symbolPositions.length;
        if (elements.graphTotalPnL) {
            elements.graphTotalPnL.innerText = `${totalPnLPips >= 0 ? '+' : ''}${totalPnLPips.toFixed(1)} pips`;
            elements.graphTotalPnL.className = `total-pnl-badge ${totalPnLPips >= 0 ? 'profit-bg' : 'loss-bg'}`;
        }
        
        // Update Graph orders stats
        if (elements.graphOrdersCount) elements.graphOrdersCount.innerText = symbolOrders.length;
        
        // Update Dashboard totals on positions page
        let allPnL = 0;
        positions.forEach(p => allPnL += p.profit);
        
        // Aggregate account metrics (Balance, Equity)
        let totalBalance = 0;
        let totalEquity = 0;
        let totalFreeMargin = 0;
        
        const longConnected = Boolean(state.status && state.status.long && state.status.long.connected && state.status.long.account_info);
        const shortConnected = Boolean(state.status && state.status.short && state.status.short.connected && state.status.short.account_info);
        const isSingle = Boolean(
            (state.status && state.status.single_mode) || 
            (longConnected && shortConnected && state.status.long.account_info && state.status.short.account_info && state.status.long.account_info.login === state.status.short.account_info.login)
        );

        if (longConnected) {
            const acc = state.status.long.account_info;
            totalBalance += Number(acc.balance) || 0;
            totalEquity += Number(acc.equity) || 0;
            totalFreeMargin += Number(acc.margin_free) || 0;
        }
        
        if (!isSingle && shortConnected) {
            const acc = state.status.short.account_info;
            totalBalance += Number(acc.balance) || 0;
            totalEquity += Number(acc.equity) || 0;
            totalFreeMargin += Number(acc.margin_free) || 0;
        }
        
        if (elements.dashBalance) elements.dashBalance.innerText = `${totalBalance.toFixed(2)} EUR`;
        if (elements.dashEquity) {
            elements.dashEquity.innerText = `${totalEquity.toFixed(2)} EUR`;
            if (allPnL >= 0) {
                elements.dashEquity.className = "metric-val profit-text";
            } else {
                elements.dashEquity.className = "metric-val loss-text";
            }
        }
        if (elements.dashFreeMargin) elements.dashFreeMargin.innerText = `${totalFreeMargin.toFixed(2)} EUR`;
        
        // Update Journal account metrics (Total / Bull / Short)
        updateJournalAccountMetrics();
        
        // Render UI
        renderQuickPositions(symbolPositions);
        renderFullPositionsTable(positions);
        
        renderQuickOrders(symbolOrders);
        renderFullOrdersTable(orders);
        
        // Update price lines on Lightweight Charts
        updateChartPriceLines(symbolPositions, symbolOrders);
        
    } catch (err) {
        console.error("Error fetching positions/orders:", err);
    }
}

function updateChartPriceLines(symbolPositions, symbolOrders) {
    if (!lwChartInstance || !lwCandlestickSeries) return;
    
    // Clear old lines
    if (state.chartPriceLines && state.chartPriceLines.length > 0) {
        state.chartPriceLines.forEach(line => {
            try {
                lwCandlestickSeries.removePriceLine(line);
            } catch (e) {
                console.error("Error removing price line:", e);
            }
        });
    }
    state.chartPriceLines = [];
    
    // 1. Draw open positions
    symbolPositions.forEach(p => {
        const isBuy = p.type === 'BUY';
        // Entry price line (dotted line, green for BUY entry, red for SELL entry)
        const entryColor = isBuy ? '#22c55e' : '#ef5350';
        const entryLine = lwCandlestickSeries.createPriceLine({
            price: p.price_open,
            color: entryColor,
            lineWidth: 2,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: `${p.type} ${p.volume.toFixed(2)}`,
        });
        state.chartPriceLines.push(entryLine);
        
        // Stop Loss
        if (p.sl > 0) {
            const slLine = lwCandlestickSeries.createPriceLine({
                price: p.sl,
                color: '#be123c', // red
                lineWidth: 1.5,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'SL',
            });
            state.chartPriceLines.push(slLine);
        }
        
        // Take Profit
        if (p.tp > 0) {
            const tpLine = lwCandlestickSeries.createPriceLine({
                price: p.tp,
                color: '#15803d', // green
                lineWidth: 1.5,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'TP',
            });
            state.chartPriceLines.push(tpLine);
        }
    });
    
    // 2. Draw pending orders
    symbolOrders.forEach(o => {
        // Trigger price line (dotted line, purple for orders)
        const orderLine = lwCandlestickSeries.createPriceLine({
            price: o.price_open,
            color: '#a855f7',
            lineWidth: 2,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: `${o.type} ${o.volume.toFixed(2)}`,
        });
        state.chartPriceLines.push(orderLine);
        
        // Stop Loss
        if (o.sl > 0) {
            const slLine = lwCandlestickSeries.createPriceLine({
                price: o.sl,
                color: '#be123c',
                lineWidth: 1.5,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'SL',
            });
            state.chartPriceLines.push(slLine);
        }
        
        // Take Profit
        if (o.tp > 0) {
            const tpLine = lwCandlestickSeries.createPriceLine({
                price: o.tp,
                color: '#15803d',
                lineWidth: 1.5,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: 'TP',
            });
            state.chartPriceLines.push(tpLine);
        }
    });
}

// ==========================================================================
// RENDER METHODS
// ==========================================================================

function getPipSize(symbol, price) {
    const sym = symbol.toUpperCase();
    if (sym.includes("JPY")) return 0.01;
    if (sym.includes("GER") || sym.includes("DE") || sym.includes("FRA") || sym.includes("CAC") || 
        sym.includes("US") || sym.includes("NAS") || sym.includes("SP") || sym.includes("UK") || price > 100) {
        return 1.0;
    }
    return 0.0001; // default forex
}

function renderQuickPositions(positions) {
    const prevRenderState = state.lastQuickRenderState || "";
    const currentRenderState = positions.map(p => 
        `${p.ticket}:${p.volume}:${p.sl}:${p.tp}:${p.auto_be_pips || 0}:${p.account_type}`
    ).sort().join('|') + `_panel:${state.activePanelTicket}:${state.activePanelType}`;
    
    if (currentRenderState !== prevRenderState) {
        state.lastQuickRenderState = currentRenderState;
        const html = generatePositionsTableHTML(positions, true);
        if (elements.quickPositionsContainer) {
            elements.quickPositionsContainer.innerHTML = html;
        }
        if (elements.graphPositionsContainer) {
            elements.graphPositionsContainer.innerHTML = html;
        }
    } else {
        updateFullPositionsDOMValues(positions);
    }
}

function renderFullPositionsTable(positions) {
    state.positions = positions;
    
    const prevRenderState = state.lastFullRenderState || "";
    const currentRenderState = positions.map(p => 
        `${p.ticket}:${p.volume}:${p.sl}:${p.tp}:${p.auto_be_pips || 0}:${p.account_type}`
    ).sort().join('|') + `_panel:${state.activePanelTicket}:${state.activePanelType}`;
    
    if (currentRenderState !== prevRenderState) {
        state.lastFullRenderState = currentRenderState;
        if (elements.positionsCardsContainer) {
            elements.positionsCardsContainer.innerHTML = generatePositionsTableHTML(positions, false);
        }
    } else {
        updateFullPositionsDOMValues(positions);
    }
}

function generatePositionsTableHTML(positions, isQuickView) {
    if (positions.length === 0) {
        return `
            <div class="no-positions-placeholder">
                <i class="fa-solid fa-folder-open"></i>
                <p>Aucune position active</p>
            </div>
        `;
    }

    let html = `
        <table class="positions-table">
            <thead>
                <tr>
                    <th>T</th>
                    <th>prix</th>
                    <th>lot</th>
                    <th>SL</th>
                    <th>BE</th>
                    <th>TP</th>
                    <th>pnl</th>
                </tr>
            </thead>
            <tbody>
    `;

    positions.forEach(pos => {
        const typeLetter = pos.type === 'BUY' ? 'L' : 'S';
        const typeClass = pos.type.toLowerCase(); // buy or sell
        const pnlClass = pos.profit >= 0 ? "profit-text" : "loss-text";
        const pipSize = getPipSize(pos.symbol, pos.price_open);

        // BE threshold
        const autobeVal = pos.auto_be_pips || 0;
        const beLabel = autobeVal > 0 ? autobeVal : 'Off';

        // SL distance in pips
        let slPips = "-";
        if (pos.sl > 0) {
            const diff = (pos.sl - pos.price_open) / pipSize;
            const signedDiff = pos.type === 'BUY' ? diff : -diff;
            slPips = signedDiff.toFixed(0);
        }

        // TP distance in pips
        let tpPips = "-";
        if (pos.tp > 0) {
            const diff = (pos.tp - pos.price_open) / pipSize;
            const signedDiff = pos.type === 'BUY' ? diff : -diff;
            tpPips = signedDiff.toFixed(0);
        }

        // PNL in pips
        const pnlPips = (pos.type === 'BUY' 
            ? (pos.price_current - pos.price_open) 
            : (pos.price_open - pos.price_current)) / pipSize;
        const pnlPipsSign = pnlPips >= 0 ? '+' : '';
        const pnlPipsLabel = `${pnlPipsSign}${pnlPips.toFixed(0)}`;

        // Check active panel states
        const isBEActive = state.activePanelTicket === pos.ticket && state.activePanelType === 'BE';
        const isSLActive = state.activePanelTicket === pos.ticket && state.activePanelType === 'SL';
        const isTPActive = state.activePanelTicket === pos.ticket && state.activePanelType === 'TP';
        const isCloseActive = state.activePanelTicket === pos.ticket && state.activePanelType === 'CLOSE';

        html += `
            <tr class="position-row" data-ticket="${pos.ticket}">
                <td class="type-cell"><span class="type-tag ${typeClass}">${typeLetter}</span></td>
                <td class="price-cell" onclick="openDetailModal(${pos.ticket})">${pos.price_open.toFixed(1)}</td>
                <td class="lot-cell">${pos.volume.toFixed(2)}</td>
                <td class="sl-cell ${isSLActive ? 'active-cell' : ''}" onclick="togglePanel(${pos.ticket}, 'SL')">${slPips}</td>
                <td class="be-cell ${isBEActive ? 'active-cell' : ''}" onclick="togglePanel(${pos.ticket}, 'BE')">${beLabel}</td>
                <td class="tp-cell ${isTPActive ? 'active-cell' : ''}" onclick="togglePanel(${pos.ticket}, 'TP')">${tpPips}</td>
                <td class="pnl-cell ${pnlClass} ${isCloseActive ? 'active-cell' : ''}" onclick="togglePanel(${pos.ticket}, 'CLOSE')">${pnlPipsLabel}</td>
            </tr>
        `;

        // Render inline panel row if active
        if (state.activePanelTicket === pos.ticket) {
            html += `
                <tr class="panel-row" data-ticket="${pos.ticket}">
                    <td colspan="7">
                        <div class="inline-edit-panel">
                            ${generateInlinePanelHTML(pos, slPips, tpPips, autobeVal)}
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    html += `
            </tbody>
        </table>
    `;

    return html;
}

function generateInlinePanelHTML(pos, slPips, tpPips, autobeVal) {
    if (state.activePanelType === 'SL') {
        return `
            <div class="inline-adjuster-grid grid-6">
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, -50)">-50</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, 10)">+10</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, 50)">+50</button>
            </div>
            <div class="inline-preset-grid">
                <button class="inline-btn preset-btn ${slPips === '-' ? 'active' : ''}" onclick="applyQuickSL(${pos.ticket}, 0)">off</button>
                <button class="inline-btn preset-btn btn-slbe ${slPips === '0' ? 'active' : ''}" onclick="applySLBE(${pos.ticket})">SLBE</button>
                <button class="inline-btn preset-btn ${slPips === '-10' ? 'active' : ''}" onclick="applyQuickSL(${pos.ticket}, 10)">-10</button>
                <button class="inline-btn preset-btn ${slPips === '-20' ? 'active' : ''}" onclick="applyQuickSL(${pos.ticket}, 20)">-20</button>
                <button class="inline-btn preset-btn ${slPips === '-40' ? 'active' : ''}" onclick="applyQuickSL(${pos.ticket}, 40)">-40</button>
            </div>
        `;
    } else if (state.activePanelType === 'TP') {
        return `
            <div class="inline-adjuster-grid grid-6">
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, -50)">-50</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, 10)">+10</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, 50)">+50</button>
            </div>
            <div class="inline-preset-grid">
                <button class="inline-btn preset-btn ${tpPips === '-' || tpPips === '0' ? 'active' : ''}" onclick="applyQuickTP(${pos.ticket}, 0)">off</button>
                <button class="inline-btn preset-btn ${tpPips === '1' ? 'active' : ''}" onclick="applyQuickTP(${pos.ticket}, 1)">1</button>
                <button class="inline-btn preset-btn ${tpPips === '10' ? 'active' : ''}" onclick="applyQuickTP(${pos.ticket}, 10)">10</button>
                <button class="inline-btn preset-btn ${tpPips === '20' ? 'active' : ''}" onclick="applyQuickTP(${pos.ticket}, 20)">20</button>
                <button class="inline-btn preset-btn ${tpPips === '40' ? 'active' : ''}" onclick="applyQuickTP(${pos.ticket}, 40)">40</button>
            </div>
        `;
    } else if (state.activePanelType === 'BE') {
        return `
            <div class="inline-adjuster-grid grid-6">
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, -50)">-50</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, 10)">+10</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, 50)">+50</button>
            </div>
            <div class="inline-preset-grid be-presets">
                <button class="inline-btn preset-btn ${autobeVal === 0 ? 'active' : ''}" onclick="applyQuickPositionAutoBE(${pos.ticket}, 0)">off</button>
                <button class="inline-btn preset-btn ${autobeVal === 10 ? 'active' : ''}" onclick="applyQuickPositionAutoBE(${pos.ticket}, 10)">10</button>
                <button class="inline-btn preset-btn ${autobeVal === 20 ? 'active' : ''}" onclick="applyQuickPositionAutoBE(${pos.ticket}, 20)">20</button>
                <button class="inline-btn preset-btn ${autobeVal === 40 ? 'active' : ''}" onclick="applyQuickPositionAutoBE(${pos.ticket}, 40)">40</button>
                <button class="inline-btn preset-btn ${autobeVal === 60 ? 'active' : ''}" onclick="applyQuickPositionAutoBE(${pos.ticket}, 60)">60</button>
            </div>
        `;
    } else if (state.activePanelType === 'CLOSE') {
        return `
            <div class="inline-close-grid">
                <button class="inline-btn btn-close-partial" onclick="closePositionPartial(${pos.ticket}, 0.25)">
                    <i class="fa-solid fa-circle-minus"></i> Close 0.25
                </button>
                <button class="inline-btn btn-close-full" onclick="closePositionFull(${pos.ticket}, ${pos.volume})">
                    <i class="fa-solid fa-trash-can"></i> Close All
                </button>
            </div>
        `;
    }
    return '';
}

function updateFullPositionsDOMValues(positions) {
    positions.forEach(pos => {
        const rows = document.querySelectorAll(`tr.position-row[data-ticket="${pos.ticket}"]`);
        if (rows.length === 0) return;
        
        const pipSize = getPipSize(pos.symbol, pos.price_open);
        
        // BE threshold
        const autobeVal = pos.auto_be_pips || 0;
        const beLabel = autobeVal > 0 ? autobeVal : 'Off';
        
        // SL Pips
        let slPips = "-";
        if (pos.sl > 0) {
            const diff = (pos.sl - pos.price_open) / pipSize;
            const signedDiff = pos.type === 'BUY' ? diff : -diff;
            slPips = signedDiff.toFixed(0);
        }
        
        // TP Pips
        let tpPips = "-";
        if (pos.tp > 0) {
            const diff = (pos.tp - pos.price_open) / pipSize;
            const signedDiff = pos.type === 'BUY' ? diff : -diff;
            tpPips = signedDiff.toFixed(0);
        }
        
        // PNL
        const pnlPips = (pos.type === 'BUY' 
            ? (pos.price_current - pos.price_open) 
            : (pos.price_open - pos.price_current)) / pipSize;
        const pnlPipsSign = pnlPips >= 0 ? '+' : '';
        const pnlPipsLabel = `${pnlPipsSign}${pnlPips.toFixed(0)}`;
        const pnlClass = pos.profit >= 0 ? "profit-text" : "loss-text";
        
        rows.forEach(row => {
            const beEl = row.querySelector('.be-cell');
            if (beEl) beEl.innerText = beLabel;
            
            const slEl = row.querySelector('.sl-cell');
            if (slEl) slEl.innerText = slPips;
            
            const tpEl = row.querySelector('.tp-cell');
            if (tpEl) tpEl.innerText = tpPips;
            
            const pnlEl = row.querySelector('.pnl-cell');
            if (pnlEl) {
                pnlEl.innerText = pnlPipsLabel;
                pnlEl.classList.remove('profit-text', 'loss-text');
                pnlEl.classList.add(pnlClass);
            }
        });
    });
}

function renderQuickOrders(orders) {
    const prevRenderState = state.lastQuickOrdersRenderState || "";
    const currentRenderState = orders.map(o => 
        `${o.ticket}:${o.volume}:${o.sl}:${o.tp}:${o.price_open}:${o.account_type}:${o.auto_be_pips || 0}`
    ).sort().join('|') + `_panel:${state.activePanelTicket}:${state.activePanelType}`;
    
    if (currentRenderState !== prevRenderState) {
        state.lastQuickOrdersRenderState = currentRenderState;
        const html = generateOrdersTableHTML(orders, true);
        if (elements.quickOrdersContainer) {
            elements.quickOrdersContainer.innerHTML = html;
        }
        if (elements.graphOrdersContainer) {
            elements.graphOrdersContainer.innerHTML = html;
        }
    } else {
        updateOrdersDOMValues(orders);
    }
}

function renderFullOrdersTable(orders) {
    const prevRenderState = state.lastFullOrdersRenderState || "";
    const currentRenderState = orders.map(o => 
        `${o.ticket}:${o.volume}:${o.sl}:${o.tp}:${o.price_open}:${o.account_type}:${o.auto_be_pips || 0}`
    ).sort().join('|') + `_panel:${state.activePanelTicket}:${state.activePanelType}`;
    
    if (currentRenderState !== prevRenderState) {
        state.lastFullOrdersRenderState = currentRenderState;
        if (elements.ordersCardsContainer) {
            elements.ordersCardsContainer.innerHTML = generateOrdersTableHTML(orders, false);
        }
    } else {
        updateOrdersDOMValues(orders);
    }
}

function generateOrdersTableHTML(orders, isQuickView) {
    if (orders.length === 0) {
        return `
            <div class="no-positions-placeholder">
                <i class="fa-solid fa-folder-open"></i>
                <p>Aucun ordre en attente</p>
            </div>
        `;
    }

    let html = `
        <table class="positions-table">
            <thead>
                <tr>
                    <th>T</th>
                    <th>seuil</th>
                    <th>lot</th>
                    <th>SL</th>
                    <th>BE</th>
                    <th>TP</th>
                    <th>dist</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(ord => {
        let typeLetter = "BL";
        const ordTypeUpper = ord.type.toUpperCase();
        if (ordTypeUpper.includes("LIMIT")) {
            typeLetter = ordTypeUpper.startsWith("BUY") ? "BL" : "SL";
        } else if (ordTypeUpper.includes("STOP")) {
            typeLetter = ordTypeUpper.startsWith("BUY") ? "BS" : "SS";
        } else {
            typeLetter = ordTypeUpper.startsWith("BUY") ? "B" : "S";
        }
        const typeClass = ordTypeUpper.includes("BUY") ? "buy" : "sell";
        const pipSize = getPipSize(ord.symbol, ord.price_open);

        // SL distance in pips
        let slPips = "-";
        if (ord.sl > 0) {
            const diff = (ord.sl - ord.price_open) / pipSize;
            const signedDiff = ordTypeUpper.includes("BUY") ? diff : -diff;
            slPips = signedDiff.toFixed(0);
        }

        // TP distance in pips
        let tpPips = "-";
        if (ord.tp > 0) {
            const diff = (ord.tp - ord.price_open) / pipSize;
            const signedDiff = ordTypeUpper.includes("BUY") ? diff : -diff;
            tpPips = signedDiff.toFixed(0);
        }

        // BE threshold
        const autobeVal = ord.auto_be_pips || 0;
        const beLabel = autobeVal > 0 ? autobeVal : 'Off';

        // Distance in pips: absolute value
        const distPips = Math.abs(ord.price_current - ord.price_open) / pipSize;
        const distLabel = distPips.toFixed(0);

        const isCloseActive = state.activePanelTicket === ord.ticket && state.activePanelType === 'CLOSE_ORDER';
        const isSLActive = state.activePanelTicket === ord.ticket && state.activePanelType === 'SL_ORDER';
        const isBEActive = state.activePanelTicket === ord.ticket && state.activePanelType === 'BE_ORDER';
        const isTPActive = state.activePanelTicket === ord.ticket && state.activePanelType === 'TP_ORDER';

        html += `
            <tr class="order-row" data-ticket="${ord.ticket}">
                <td class="type-cell"><span class="type-tag ${typeClass}">${typeLetter}</span></td>
                <td class="price-cell ${state.activePanelTicket === ord.ticket && state.activePanelType === 'MODIFY_PRICE' ? 'active-cell' : ''}" style="cursor: pointer;" onclick="toggleOrderPanel(${ord.ticket}, 'MODIFY_PRICE')">${ord.price_open.toFixed(1)}</td>
                <td class="lot-cell">${ord.volume.toFixed(2)}</td>
                <td class="sl-cell ${isSLActive ? 'active-cell' : ''}" style="cursor: pointer;" onclick="toggleOrderPanel(${ord.ticket}, 'SL_ORDER')">${slPips}</td>
                <td class="be-cell ${isBEActive ? 'active-cell' : ''}" style="cursor: pointer;" onclick="toggleOrderPanel(${ord.ticket}, 'BE_ORDER')">${beLabel}</td>
                <td class="tp-cell ${isTPActive ? 'active-cell' : ''}" style="cursor: pointer;" onclick="toggleOrderPanel(${ord.ticket}, 'TP_ORDER')">${tpPips}</td>
                <td class="pnl-cell loss-text ${isCloseActive ? 'active-cell' : ''}" style="cursor: pointer;" onclick="toggleOrderPanel(${ord.ticket}, 'CLOSE_ORDER')">${distLabel}</td>
            </tr>
        `;

        // Render inline panel row if active
        if (state.activePanelTicket === ord.ticket) {
            html += `
                <tr class="panel-row" data-ticket="${ord.ticket}">
                    <td colspan="7">
                        <div class="inline-edit-panel">
                            ${generateOrderInlinePanelHTML(ord)}
                        </div>
                    </td>
                </tr>
            `;
        }
    });

    html += `
            </tbody>
        </table>
    `;

    return html;
}

function updateOrdersDOMValues(orders) {
    orders.forEach(ord => {
        const rows = document.querySelectorAll(`tr.order-row[data-ticket="${ord.ticket}"]`);
        rows.forEach(row => {
            const distCell = row.querySelector('.pnl-cell');
            if (distCell) {
                const pipSize = getPipSize(ord.symbol, ord.price_open);
                const distPips = Math.abs(ord.price_current - ord.price_open) / pipSize;
                const distLabel = distPips.toFixed(0);
                if (distCell.innerText !== distLabel) {
                    distCell.innerText = distLabel;
                }
            }
        });
    });
}

async function handleCancelOrder(ticket, accountType) {
    showToast(`Annulation de l'ordre #${ticket}...`, "warning");
    try {
        const response = await fetch('/api/order/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: ticket, account_type: accountType })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Erreur lors de l'annulation");
        }
        showToast(`Ordre #${ticket} annulé avec succès`, "success");
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function adjustSL(ticket, delta) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const pipSize = getPipSize(pos.symbol, pos.price_open);
    
    let currentSignedPips = -20; // Default starting point if no SL
    if (pos.sl > 0) {
        const diff = (pos.sl - pos.price_open) / pipSize;
        currentSignedPips = pos.type === 'BUY' ? diff : -diff;
    }
    
    const newSignedPips = Math.round(currentSignedPips + delta);
    
    const targetSL = pos.type === 'BUY'
        ? pos.price_open + (newSignedPips * pipSize)
        : pos.price_open - (newSignedPips * pipSize);
        
    modifySL(ticket, targetSL);
}

function adjustTP(ticket, delta) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const pipSize = getPipSize(pos.symbol, pos.price_open);
    
    let currentSignedPips = 40; // Default starting point if no TP
    if (pos.tp > 0) {
        const diff = (pos.tp - pos.price_open) / pipSize;
        currentSignedPips = pos.type === 'BUY' ? diff : -diff;
    }
    
    const newSignedPips = Math.round(currentSignedPips + delta);
    
    const targetTP = pos.type === 'BUY'
        ? pos.price_open + (newSignedPips * pipSize)
        : pos.price_open - (newSignedPips * pipSize);
        
    modifyTP(ticket, targetTP);
}

function adjustAutoBE(ticket, delta) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const currentVal = pos.auto_be_pips || 0;
    const newVal = Math.max(0, Math.round(currentVal + delta));
    
    modifyPositionAutoBE(ticket, newVal);
}

// ==========================================================================
// ORDER EXECUTION
// ==========================================================================
async function placeOrder(action) {
    const lotInput = elements.lotInput || elements.graphLotInput;
    const slInput = elements.slInput || elements.graphSlInput;
    const tpInput = elements.tpInput || elements.graphTpInput;
    
    if (!lotInput) return;
    
    const lot = parseFloat(lotInput.value);
    const slPoints = slInput ? (parseFloat(slInput.value) || 0) : 0;
    const tpPoints = tpInput ? (parseFloat(tpInput.value) || 0) : 0;
    
    if (isNaN(lot) || lot <= 0) {
        showToast("Le volume doit être un nombre positif", "danger");
        return;
    }

    // Additional validation for high spread and tight Stop Loss
    const spreadText = elements.scalpSpreadMiddle ? elements.scalpSpreadMiddle.innerText : "0.0";
    const spread = parseFloat(spreadText) || 0.0;
    if (spread > 5.0 && slPoints > 0 && slPoints <= 20) {
        const confirmMsg = `Attention : Le spread actuel est élevé (${spread} pips) et votre Stop Loss est court (${slPoints} pips). L'ordre risque d'être coupé très rapidement. Voulez-vous continuer ?`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    showToast(`Envoi de l'ordre ${action} ${lot} Lots...`, "warning");
    
    try {
        let targetPrice = state.limitPrice;
        let isL10 = state.executionType === 'l10';
        
        if (isL10) {
            const pipSize = getPipSize(state.config.symbol || "GER40", state.lastAsk || 100);
            if (action === 'BUY') {
                targetPrice = (state.lastAsk || 0) - (10.0 * pipSize);
            } else {
                targetPrice = (state.lastBid || 0) + (10.0 * pipSize);
            }
        } else if (state.executionType === 'limit') {
            const inputVal = elements.limitPriceInput ? parseFloat(elements.limitPriceInput.value) : 0;
            const graphInputVal = elements.graphLimitPriceInput ? parseFloat(elements.graphLimitPriceInput.value) : 0;
            targetPrice = inputVal || graphInputVal || state.limitPrice;
        }

        const payload = {
            action: action,
            volume: lot,
            sl_points: slPoints,
            tp_points: tpPoints,
            split: state.isSplitActive,
            scenario: state.splitScenario
        };
        
        if (isL10) {
            payload.price = targetPrice;
            payload.price_mode = 'l10';
        } else if (state.executionType === 'limit') {
            payload.price = targetPrice;
        }

        const response = await fetch('/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || "Erreur lors de l'exécution");
        }
        
        showToast(`Ordre exécuté avec succès! Ticket: ${data.ticket}`, "success");
        
        // Play click/success haptic-like vibration on mobile
        if (navigator.vibrate) navigator.vibrate(50);
        
        // Immediate updates
        fetchPositions();
        fetchStatus();
        
    } catch (err) {
        showToast(err.message, "danger");
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
}

async function handleClosePosition(ticket, volume, accountType) {
    showToast(`Fermeture du ticket #${ticket}...`, "warning");
    
    try {
        const response = await fetch('/api/position/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                volume: volume,
                account_type: accountType
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de fermeture");
        
        showToast(`Position #${ticket} fermée.`, "success");
        if (navigator.vibrate) navigator.vibrate(30);
        
        fetchPositions();
        fetchStatus();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function closePositionPartial(ticket, volumeToClose) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    if (pos.volume <= volumeToClose) {
        await closePositionFull(ticket, pos.volume);
        return;
    }
    
    await executeClose(ticket, volumeToClose, pos.account_type);
}

async function closePositionFull(ticket, fullVolume) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    await executeClose(ticket, fullVolume, pos.account_type);
}

async function executeClose(ticket, volume, accountType) {
    showToast(`Fermeture de ${volume} Lots (ticket #${ticket})...`, "warning");
    
    try {
        const response = await fetch('/api/position/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                volume: volume,
                account_type: accountType
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de fermeture");
        
        showToast(`Position #${ticket} mise à jour.`, "success");
        if (navigator.vibrate) navigator.vibrate(30);
        
        // Reset dynamic panels on success
        state.activePanelTicket = null;
        state.activePanelType = null;
        
        fetchPositions();
        fetchStatus();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function handleCloseAllPositions() {
    if (state.positions.length === 0) return;
    if (!confirm(`Voulez-vous fermer TOUTES les ${state.positions.length} positions ouvertes ?`)) return;
    
    showToast("Fermeture globale en cours...", "warning");
    
    let successCount = 0;
    let failCount = 0;
    
    // Perform sequential closures to avoid MT5 database collisions
    for (const pos of state.positions) {
        try {
            const response = await fetch('/api/position/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticket: pos.ticket,
                    volume: pos.volume,
                    account_type: pos.account_type
                })
            });
            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (err) {
            failCount++;
        }
    }
    
    if (failCount === 0) {
        showToast(`Toutes les positions (${successCount}) ont été fermées.`, "success");
    } else {
        showToast(`Fermeture partielle: ${successCount} succès, ${failCount} échecs.`, "warning");
    }
    
    fetchPositions();
    fetchStatus();
}

// ==========================================================================
// MODAL SHEET FOR SL/TP MODIFICATION
// ==========================================================================
function openModifyModal(ticket, symbol, type, volume, priceOpen, priceCurrent, sl, tp, accountType) {
    elements.modTicket.value = ticket;
    elements.modAccType.value = accountType;
    elements.modPosDetails.innerText = `${type} ${volume.toFixed(2)} Lots ${symbol}`;
    elements.modOpenPrice.innerText = priceOpen.toFixed(1);
    elements.modCurrentPrice.innerText = priceCurrent.toFixed(1);
    
    elements.modSlInput.value = sl;
    elements.modTpInput.value = tp;
    
    elements.modifyModal.classList.add('active');
}

function closeModifyModal() {
    elements.modifyModal.classList.remove('active');
}

function openDetailModal(ticket) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) {
        showToast("Position introuvable", "danger");
        return;
    }
    
    const dateLabel = new Date(pos.time * 1000).toLocaleString('fr-FR');
    
    elements.detailModalBody.innerHTML = `
        <div class="detail-row">
            <span>Ticket :</span>
            <strong>#${pos.ticket}</strong>
        </div>
        <div class="detail-row">
            <span>Symbole :</span>
            <strong>${pos.symbol}</strong>
        </div>
        <div class="detail-row">
            <span>Direction :</span>
            <strong class="${pos.type.toLowerCase() === 'buy' ? 'profit-text' : 'loss-text'}">${pos.type}</strong>
        </div>
        <div class="detail-row">
            <span>Volume :</span>
            <strong>${pos.volume.toFixed(2)} Lots</strong>
        </div>
        <div class="detail-row">
            <span>Compte :</span>
            <strong>${pos.account_type.toUpperCase()}</strong>
        </div>
        <div class="detail-row">
            <span>Ouvert le :</span>
            <strong>${dateLabel}</strong>
        </div>
        <div class="detail-row">
            <span>Prix d'ouverture :</span>
            <strong>${pos.price_open.toFixed(1)}</strong>
        </div>
        <div class="detail-row">
            <span>Prix actuel :</span>
            <strong>${pos.price_current.toFixed(1)}</strong>
        </div>
        <div class="detail-row">
            <span>Stop Loss (SL) :</span>
            <strong>${pos.sl === 0 ? 'Aucun' : pos.sl.toFixed(1)}</strong>
        </div>
        <div class="detail-row">
            <span>Take Profit (TP) :</span>
            <strong>${pos.tp === 0 ? 'Aucun' : pos.tp.toFixed(1)}</strong>
        </div>
        <div class="detail-row">
            <span>Swap :</span>
            <strong>${pos.swap.toFixed(2)} EUR</strong>
        </div>
        <div class="detail-row">
            <span>Profit (EUR) :</span>
            <strong class="${pos.profit >= 0 ? 'profit-text' : 'loss-text'}">${pos.profit.toFixed(2)} EUR</strong>
        </div>
        <div class="detail-row">
            <span>Commentaire :</span>
            <strong>${pos.comment || '-'}</strong>
        </div>
    `;
    
    elements.detailModal.classList.add('active');
}

function closeDetailModal() {
    elements.detailModal.classList.remove('active');
}

// In-card action controllers
function toggleActions(ticket) {
    if (state.activeActionsTicket === ticket) {
        state.activeActionsTicket = null;
        state.activePanelTicket = null;
        state.activePanelType = null;
    } else {
        state.activeActionsTicket = ticket;
        state.activePanelTicket = null;
        state.activePanelType = null;
    }
    renderFullPositionsTable(state.positions);
}

function togglePanel(ticket, type) {
    if (state.activePanelTicket === ticket && state.activePanelType === type) {
        state.activePanelTicket = null;
        state.activePanelType = null;
    } else {
        state.activePanelTicket = ticket;
        state.activePanelType = type;
    }
    const symbolPositions = state.positions.filter(p => p.symbol === state.config.symbol);
    renderQuickPositions(symbolPositions);
    renderFullPositionsTable(state.positions);
    
    // Sync orders rendering to close order panel if open
    const symbolOrders = state.orders.filter(o => o.symbol === state.config.symbol);
    renderQuickOrders(symbolOrders);
    renderFullOrdersTable(state.orders);
}

function toggleOrderPanel(ticket, type) {
    if (state.activePanelTicket === ticket && state.activePanelType === type) {
        state.activePanelTicket = null;
        state.activePanelType = null;
    } else {
        state.activePanelTicket = ticket;
        state.activePanelType = type;
    }
    const symbolOrders = state.orders.filter(o => o.symbol === state.config.symbol);
    renderQuickOrders(symbolOrders);
    renderFullOrdersTable(state.orders);
    
    // Sync positions rendering to close position panel if open
    const symbolPositions = state.positions.filter(p => p.symbol === state.config.symbol);
    renderQuickPositions(symbolPositions);
    renderFullPositionsTable(state.positions);
}

function generateOrderInlinePanelHTML(ord) {
    const pipSize = getPipSize(ord.symbol, ord.price_open);
    const ordTypeUpper = ord.type.toUpperCase();
    const isBuy = ordTypeUpper.includes("BUY");
    
    // SL distance in pips
    let slPips = "-";
    if (ord.sl > 0) {
        const diff = (ord.sl - ord.price_open) / pipSize;
        const signedDiff = isBuy ? diff : -diff;
        slPips = signedDiff.toFixed(0);
    }
    
    // TP distance in pips
    let tpPips = "-";
    if (ord.tp > 0) {
        const diff = (ord.tp - ord.price_open) / pipSize;
        const signedDiff = isBuy ? diff : -diff;
        tpPips = signedDiff.toFixed(0);
    }
    
    const autobeVal = ord.auto_be_pips || 0;

    if (state.activePanelType === 'CLOSE_ORDER') {
        return `
            <div class="inline-close-grid">
                <button class="inline-btn btn-close-full" style="grid-column: span 2;" onclick="cancelOrderFull(${ord.ticket}, '${ord.account_type}')">
                    <i class="fa-solid fa-trash-can"></i> Annuler l'ordre
                </button>
            </div>
        `;
    } else if (state.activePanelType === 'MODIFY_PRICE') {
        return `
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustOrderPrice(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderPrice(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderPrice(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderPrice(${ord.ticket}, 10)">+10</button>
            </div>
        `;
    } else if (state.activePanelType === 'SL_ORDER') {
        return `
            <div class="inline-adjuster-grid grid-6">
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, -50)">-50</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, 10)">+10</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, 50)">+50</button>
            </div>
            <div class="inline-preset-grid">
                <button class="inline-btn preset-btn ${slPips === '-' ? 'active' : ''}" onclick="applyQuickOrderSL(${ord.ticket}, 0)">off</button>
                <button class="inline-btn preset-btn btn-slbe ${slPips === '0' ? 'active' : ''}" onclick="applyOrderSLBE(${ord.ticket})">SLBE</button>
                <button class="inline-btn preset-btn ${slPips === '-10' ? 'active' : ''}" onclick="applyQuickOrderSL(${ord.ticket}, 10)">-10</button>
                <button class="inline-btn preset-btn ${slPips === '-20' ? 'active' : ''}" onclick="applyQuickOrderSL(${ord.ticket}, 20)">-20</button>
                <button class="inline-btn preset-btn ${slPips === '-40' ? 'active' : ''}" onclick="applyQuickOrderSL(${ord.ticket}, 40)">-40</button>
            </div>
        `;
    } else if (state.activePanelType === 'TP_ORDER') {
        return `
            <div class="inline-adjuster-grid grid-6">
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, -50)">-50</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, 10)">+10</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, 50)">+50</button>
            </div>
            <div class="inline-preset-grid">
                <button class="inline-btn preset-btn ${tpPips === '-' || tpPips === '0' ? 'active' : ''}" onclick="applyQuickOrderTP(${ord.ticket}, 0)">off</button>
                <button class="inline-btn preset-btn ${tpPips === '1' ? 'active' : ''}" onclick="applyQuickOrderTP(${ord.ticket}, 1)">1</button>
                <button class="inline-btn preset-btn ${tpPips === '10' ? 'active' : ''}" onclick="applyQuickOrderTP(${ord.ticket}, 10)">10</button>
                <button class="inline-btn preset-btn ${tpPips === '20' ? 'active' : ''}" onclick="applyQuickOrderTP(${ord.ticket}, 20)">20</button>
                <button class="inline-btn preset-btn ${tpPips === '40' ? 'active' : ''}" onclick="applyQuickOrderTP(${ord.ticket}, 40)">40</button>
            </div>
        `;
    } else if (state.activePanelType === 'BE_ORDER') {
        return `
            <div class="inline-adjuster-grid grid-6">
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, -50)">-50</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, 10)">+10</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, 50)">+50</button>
            </div>
            <div class="inline-preset-grid be-presets">
                <button class="inline-btn preset-btn ${autobeVal === 0 ? 'active' : ''}" onclick="applyQuickOrderAutoBE(${ord.ticket}, 0)">off</button>
                <button class="inline-btn preset-btn ${autobeVal === 10 ? 'active' : ''}" onclick="applyQuickOrderAutoBE(${ord.ticket}, 10)">10</button>
                <button class="inline-btn preset-btn ${autobeVal === 20 ? 'active' : ''}" onclick="applyQuickOrderAutoBE(${ord.ticket}, 20)">20</button>
                <button class="inline-btn preset-btn ${autobeVal === 40 ? 'active' : ''}" onclick="applyQuickOrderAutoBE(${ord.ticket}, 40)">40</button>
                <button class="inline-btn preset-btn ${autobeVal === 60 ? 'active' : ''}" onclick="applyQuickOrderAutoBE(${ord.ticket}, 60)">60</button>
            </div>
        `;
    }
    return '';
}

async function cancelOrderFull(ticket, accountType) {
    state.activePanelTicket = null;
    state.activePanelType = null;
    
    // Trigger immediate UI updates to hide the panel before cancellation begins
    const symbolOrders = state.orders.filter(o => o.symbol === state.config.symbol);
    renderQuickOrders(symbolOrders);
    renderFullOrdersTable(state.orders);
    
    await handleCancelOrder(ticket, accountType);
}

async function adjustOrderPrice(ticket, delta) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    const pipSize = getPipSize(ord.symbol, ord.price_open);
    const newPrice = ord.price_open + (delta * pipSize);
    
    // We don't close the panel here to allow successive adjustments (+10, +1, etc.)
    await modifyOrderPrice(ticket, newPrice, ord.account_type);
}

async function modifyOrderPrice(ticket, newPrice, accountType) {
    showToast(`Modification de l'ordre #${ticket}...`, "warning");
    try {
        const response = await fetch('/api/order/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                price: newPrice,
                account_type: accountType
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Erreur de modification");
        }
        showToast(`Ordre #${ticket} modifié à ${newPrice.toFixed(1)}`, "success");
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function adjustOrderSL(ticket, delta) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    const pipSize = getPipSize(ord.symbol, ord.price_open);
    const isBuy = ord.type.toUpperCase().includes("BUY");
    
    let currentSignedPips = -20; // Default starting point if no SL
    if (ord.sl > 0) {
        const diff = (ord.sl - ord.price_open) / pipSize;
        currentSignedPips = isBuy ? diff : -diff;
    }
    
    const newSignedPips = Math.round(currentSignedPips + delta);
    
    const targetSL = isBuy
        ? ord.price_open + (newSignedPips * pipSize)
        : ord.price_open - (newSignedPips * pipSize);
        
    await modifyOrderSL(ticket, targetSL, ord.account_type);
}

async function applyQuickOrderSL(ticket, pips) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    let targetSL = 0.0;
    if (pips > 0) {
        const pipSize = getPipSize(ord.symbol, ord.price_open);
        const isBuy = ord.type.toUpperCase().includes("BUY");
        targetSL = isBuy
            ? ord.price_open - (pips * pipSize)
            : ord.price_open + (pips * pipSize);
    }
    
    // Auto-close on preset selection
    state.activePanelTicket = null;
    state.activePanelType = null;
    
    await modifyOrderSL(ticket, targetSL, ord.account_type);
}

async function applyOrderSLBE(ticket) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    // SLBE means SL = entry price
    const targetSL = ord.price_open;
    
    // Auto-close on preset selection
    state.activePanelTicket = null;
    state.activePanelType = null;
    
    await modifyOrderSL(ticket, targetSL, ord.account_type);
}

async function modifyOrderSL(ticket, targetSL, accountType) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    showToast(`Modification du SL de l'ordre #${ticket}...`, "warning");
    try {
        const response = await fetch('/api/order/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                price: ord.price_open,
                sl: parseFloat(targetSL),
                tp: ord.tp,
                account_type: accountType
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Erreur de modification");
        }
        showToast(`SL de l'ordre #${ticket} modifié`, "success");
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function adjustOrderTP(ticket, delta) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    const pipSize = getPipSize(ord.symbol, ord.price_open);
    const isBuy = ord.type.toUpperCase().includes("BUY");
    
    let currentSignedPips = 20; // Default starting point if no TP
    if (ord.tp > 0) {
        const diff = (ord.tp - ord.price_open) / pipSize;
        currentSignedPips = isBuy ? diff : -diff;
    }
    
    const newSignedPips = Math.round(currentSignedPips + delta);
    
    const targetTP = isBuy
        ? ord.price_open + (newSignedPips * pipSize)
        : ord.price_open - (newSignedPips * pipSize);
        
    await modifyOrderTP(ticket, targetTP, ord.account_type);
}

async function applyQuickOrderTP(ticket, pips) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    let targetTP = 0.0;
    if (pips > 0) {
        const pipSize = getPipSize(ord.symbol, ord.price_open);
        const isBuy = ord.type.toUpperCase().includes("BUY");
        targetTP = isBuy
            ? ord.price_open + (pips * pipSize)
            : ord.price_open - (pips * pipSize);
    }
    
    // Auto-close on preset selection
    state.activePanelTicket = null;
    state.activePanelType = null;
    
    await modifyOrderTP(ticket, targetTP, ord.account_type);
}

async function modifyOrderTP(ticket, targetTP, accountType) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    showToast(`Modification du TP de l'ordre #${ticket}...`, "warning");
    try {
        const response = await fetch('/api/order/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                price: ord.price_open,
                sl: ord.sl,
                tp: parseFloat(targetTP),
                account_type: accountType
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Erreur de modification");
        }
        showToast(`TP de l'ordre #${ticket} modifié`, "success");
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function modifyOrderAutoBE(ticket, pips) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    showToast("Mise à jour AutoBE de l'ordre...", "warning");
    try {
        const response = await fetch('/api/position/autobe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                auto_be_pips: pips === null ? null : parseInt(pips)
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de modification");
        
        showToast(pips === 0 ? "AutoBE désactivé pour cet ordre" : (pips === null ? "AutoBE réinitialisé" : `AutoBE de l'ordre mis à jour à ${pips} pips`), "success");
        
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function adjustOrderAutoBE(ticket, delta) {
    const ord = state.orders.find(o => o.ticket === ticket);
    if (!ord) return;
    
    const currentVal = ord.auto_be_pips || 0;
    const newVal = Math.max(0, Math.round(currentVal + delta));
    
    modifyOrderAutoBE(ticket, newVal);
}

function applyQuickOrderAutoBE(ticket, pips) {
    state.activePanelTicket = null;
    state.activePanelType = null;
    modifyOrderAutoBE(ticket, pips);
}

async function modifySL(ticket, newSLPrice) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const tpPrice = pos.tp; // preserve TP
    
    showToast("Mise à jour du SL...", "warning");
    
    try {
        const response = await fetch('/api/position/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                sl: parseFloat(newSLPrice),
                tp: parseFloat(tpPrice),
                account_type: pos.account_type
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de modification");
        
        showToast("Stop Loss mis à jour !", "success");
        
        // Dynamic reload
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

async function modifyTP(ticket, newTPPrice) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const slPrice = pos.sl; // preserve SL
    
    showToast("Mise à jour du TP...", "warning");
    
    try {
        const response = await fetch('/api/position/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                sl: parseFloat(slPrice),
                tp: parseFloat(newTPPrice),
                account_type: pos.account_type
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de modification");
        
        showToast("Take Profit mis à jour !", "success");
        
        // Dynamic reload
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function closeActivePositionPanel() {
    state.activePanelTicket = null;
    state.activePanelType = null;
    const symbolPositions = state.positions.filter(p => p.symbol === state.config.symbol);
    renderQuickPositions(symbolPositions);
    renderFullPositionsTable(state.positions);
}

function applyQuickSL(ticket, pips) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const pipSize = getPipSize(pos.symbol, pos.price_open);
    let targetSL = 0.0;
    
    if (pips > 0) {
        targetSL = pos.type === 'BUY'
            ? pos.price_open - (pips * pipSize)
            : pos.price_open + (pips * pipSize);
    }
    
    closeActivePositionPanel();
    modifySL(ticket, targetSL);
}

function applySLBE(ticket) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    // Break Even is exactly the entry price
    closeActivePositionPanel();
    modifySL(ticket, pos.price_open);
}

function applyQuickTP(ticket, pips) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const pipSize = getPipSize(pos.symbol, pos.price_open);
    let targetTP = 0.0;
    
    if (pips > 0) {
        targetTP = pos.type === 'BUY'
            ? pos.price_open + (pips * pipSize)
            : pos.price_open - (pips * pipSize);
    }
    
    closeActivePositionPanel();
    modifyTP(ticket, targetTP);
}

function applyCustomSLPips(ticket) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const cardEl = document.querySelector(`.position-card[data-ticket="${ticket}"]`);
    if (!cardEl) return;
    
    const pipsInput = cardEl.querySelector('.input-sl-pips');
    const pipsVal = parseFloat(pipsInput.value);
    if (isNaN(pipsVal)) {
        showToast("Valeur de pips invalide", "danger");
        return;
    }
    
    const pipSize = getPipSize(pos.symbol, pos.price_open);
    const distance = Math.abs(pipsVal);
    
    let targetSL = 0.0;
    if (distance > 0) {
        targetSL = pos.type === 'BUY'
            ? pos.price_open - (distance * pipSize)
            : pos.price_open + (distance * pipSize);
    }
    
    closeActivePositionPanel();
    modifySL(ticket, targetSL);
}

function applyCustomSLPrice(ticket) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const cardEl = document.querySelector(`.position-card[data-ticket="${ticket}"]`);
    if (!cardEl) return;
    
    const priceInput = cardEl.querySelector('.input-sl-price');
    const priceVal = parseFloat(priceInput.value);
    if (isNaN(priceVal) || priceVal < 0) {
        showToast("Prix SL invalide", "danger");
        return;
    }
    
    closeActivePositionPanel();
    modifySL(ticket, priceVal);
}

function applyCustomTPPips(ticket) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const cardEl = document.querySelector(`.position-card[data-ticket="${ticket}"]`);
    if (!cardEl) return;
    
    const pipsInput = cardEl.querySelector('.input-tp-pips');
    const pipsVal = parseFloat(pipsInput.value);
    if (isNaN(pipsVal)) {
        showToast("Valeur de pips invalide", "danger");
        return;
    }
    
    const pipSize = getPipSize(pos.symbol, pos.price_open);
    const distance = Math.abs(pipsVal);
    
    let targetTP = 0.0;
    if (distance > 0) {
        targetTP = pos.type === 'BUY'
            ? pos.price_open + (distance * pipSize)
            : pos.price_open - (distance * pipSize);
    }
    
    closeActivePositionPanel();
    modifyTP(ticket, targetTP);
}

function applyCustomTPPrice(ticket) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    const cardEl = document.querySelector(`.position-card[data-ticket="${ticket}"]`);
    if (!cardEl) return;
    
    const priceInput = cardEl.querySelector('.input-tp-price');
    const priceVal = parseFloat(priceInput.value);
    if (isNaN(priceVal) || priceVal < 0) {
        showToast("Prix TP invalide", "danger");
        return;
    }
    
    closeActivePositionPanel();
    modifyTP(ticket, priceVal);
}

async function modifyPositionAutoBE(ticket, pips) {
    const pos = state.positions.find(p => p.ticket === ticket);
    if (!pos) return;
    
    showToast("Mise à jour AutoBE...", "warning");
    
    try {
        const response = await fetch('/api/position/autobe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                auto_be_pips: pips === null ? null : parseInt(pips)
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de modification");
        
        showToast(pips === 0 ? "AutoBE désactivé pour cette position" : (pips === null ? "AutoBE réinitialisé (valeur globale)" : `AutoBE mis à jour à ${pips} pips`), "success");
        
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function applyQuickPositionAutoBE(ticket, pips) {
    closeActivePositionPanel();
    modifyPositionAutoBE(ticket, pips);
}

function applyCustomPositionAutoBEPips(ticket) {
    const cardEl = document.querySelector(`.position-card[data-ticket="${ticket}"]`);
    if (!cardEl) return;
    
    const pipsInput = cardEl.querySelector('.input-autobe-pips');
    const pipsVal = parseInt(pipsInput.value);
    if (isNaN(pipsVal) || pipsVal < 0) {
        showToast("Seuil de pips invalide", "danger");
        return;
    }
    
    closeActivePositionPanel();
    modifyPositionAutoBE(ticket, pipsVal);
}

async function submitModify() {
    const ticket = parseInt(elements.modTicket.value);
    const accountType = elements.modAccType.value;
    const sl = parseFloat(elements.modSlInput.value) || 0;
    const tp = parseFloat(elements.modTpInput.value) || 0;
    
    showToast("Mise à jour des SL/TP...", "warning");
    
    try {
        const response = await fetch('/api/position/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket: ticket,
                sl: sl,
                tp: tp,
                account_type: accountType
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de modification");
        
        showToast("SL/TP mis à jour avec succès !", "success");
        closeModifyModal();
        fetchPositions();
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// Helper to bind the adjuster +/- controls
function bindAdjusters() {
    const setupAdjuster = (minusBtn, plusBtn, inputField) => {
        minusBtn.addEventListener('click', () => {
            let val = parseFloat(inputField.value) || 0;
            val = Math.max(0, val - 1.0); // Adjust step size as needed, e.g. 1 point
            inputField.value = val.toFixed(1);
        });
        plusBtn.addEventListener('click', () => {
            let val = parseFloat(inputField.value) || 0;
            val = val + 1.0;
            inputField.value = val.toFixed(1);
        });
    };
    
    setupAdjuster(elements.modSlMinus, elements.modSlPlus, elements.modSlInput);
    setupAdjuster(elements.modTpMinus, elements.modTpPlus, elements.modTpInput);
}

// ==========================================================================
// CONFIGURATION LOGIC
// ==========================================================================
async function saveAutoBE(value) {
    state.config.auto_be_pips = value;
    try {
        const payload = {
            ...state.config,
            auto_be_pips: value
        };
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showToast(`Auto BE : ${value > 0 ? value + ' pips' : 'désactivé'}`, "success");
            // Sync UI
            if (elements.autoBeInput) elements.autoBeInput.value = value;
            elements.cfgAutoBe.value = value;
            syncPresets('auto-be-presets', value);
            syncScalpParamDisplays();
        } else {
            showToast("Erreur lors de la mise à jour de l'Auto BE", "danger");
        }
    } catch (e) {
        console.error("Error saving AutoBE:", e);
    }
}

async function loadConfigFromServer() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error("Failed to load config");
        
        const config = await response.json();
        state.config = config;
        
        // Update local state copy and inputs in Config form
        elements.currentSymbolText.innerText = config.symbol;
        
        elements.cfgSymbol.value = config.symbol;
        elements.cfgLot.value = config.default_lot;
        elements.cfgSl.value = config.default_sl_points;
        elements.cfgTp.value = config.default_tp_points;
        elements.cfgAutoBe.value = config.auto_be_pips || 0;
        elements.cfgMaxSpread.value = config.max_spread_pips !== undefined ? config.max_spread_pips : 8.0;
        elements.cfgPathLong.value = config.terminal_path_long;
        elements.cfgPathShort.value = config.terminal_path_short;
        
        // Update placeholders on Scalp or Graph panels
        if (elements.lotInput) elements.lotInput.value = config.default_lot;
        if (elements.graphLotInput) elements.graphLotInput.value = config.default_lot;
        
        if (elements.slInput) elements.slInput.value = config.default_sl_points;
        if (elements.graphSlInput) elements.graphSlInput.value = config.default_sl_points;
        
        if (elements.tpInput) elements.tpInput.value = config.default_tp_points;
        if (elements.graphTpInput) elements.graphTpInput.value = config.default_tp_points;
        
        if (elements.autoBeInput) elements.autoBeInput.value = config.auto_be_pips || 0;
        if (elements.graphAutoBeInput) elements.graphAutoBeInput.value = config.auto_be_pips || 0;
        
        // Sync preset active states
        syncPresets('lot-presets', config.default_lot);
        syncPresets('graph-lot-presets', config.default_lot);
        
        syncPresets('sl-presets', config.default_sl_points);
        syncPresets('graph-sl-presets', config.default_sl_points);
        
        syncPresets('tp-presets', config.default_tp_points);
        syncPresets('graph-tp-presets', config.default_tp_points);
        
        syncPresets('auto-be-presets', config.auto_be_pips || 0);
        syncPresets('graph-auto-be-presets', config.auto_be_pips || 0);
        
        // Start streaming for the loaded symbol
        startQuoteStream();
        
        // Sync parameter bar displays
        syncScalpParamDisplays();

        // Render key levels table and update chart price lines
        renderLevelsTable();
        updateChartKeyLevels();

        // If tab-graph is active by default, trigger chart loading
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'tab-graph') {
            setTimeout(loadTradingViewWidget, 50);
        }
        
    } catch (err) {
        showToast("Erreur de chargement de la config", "danger");
    }
}

function syncPresets(presetsContainerId, value) {
    const container = document.getElementById(presetsContainerId);
    if (!container) return;
    const btns = container.querySelectorAll('.preset-btn');
    btns.forEach(btn => {
        const isSplit = btn.getAttribute('data-split') === 'true';
        const scenario = parseInt(btn.getAttribute('data-scenario')) || 0;
        if (parseFloat(btn.getAttribute('data-val')) === value) {
            if ((presetsContainerId === 'lot-presets' || presetsContainerId === 'graph-lot-presets') && 
                (isSplit !== state.isSplitActive || scenario !== state.splitScenario)) {
                btn.classList.remove('active');
            } else {
                btn.classList.add('active');
            }
        } else {
            btn.classList.remove('active');
        }
    });
}

async function handleConfigSubmit(e) {
    e.preventDefault();
    
    const payload = {
        symbol: elements.cfgSymbol.value.trim(),
        default_lot: parseFloat(elements.cfgLot.value),
        default_sl_points: parseFloat(elements.cfgSl.value),
        default_tp_points: parseFloat(elements.cfgTp.value),
        auto_be_pips: parseInt(elements.cfgAutoBe.value) || 0,
        max_spread_pips: parseFloat(elements.cfgMaxSpread.value) || 0,
        terminal_path_long: elements.cfgPathLong.value.trim(),
        terminal_path_short: elements.cfgPathShort.value.trim(),
        key_levels: state.config ? (state.config.key_levels || []) : []
    };
    
    showToast("Sauvegarde & reconnexion...", "warning");
    
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de configuration");
        
        showToast("Configuration sauvegardée.", "success");
        
        // Reload values
        await loadConfigFromServer();
        
        // Re-poll immediately to update status
        setTimeout(fetchStatus, 1500);
        
    } catch (err) {
        showToast(err.message, "danger");
    }
}

// Toggle dynamic panels in scalp parameters bar
function toggleScalpParamPanel(type) {
    if (type === 'price' && state.executionType === 'market') return;
    const panels = ['type', 'price', 'lot', 'be', 'sl', 'tp'];
    const activePanel = document.getElementById(`panel-scalp-${type}`);
    const activeCol = document.getElementById(`param-col-${type}`);
    
    const wasActive = activePanel && activePanel.style.display === 'block';
    
    // Reset all panels and columns
    panels.forEach(p => {
        const panelEl = document.getElementById(`panel-scalp-${p}`);
        const colEl = document.getElementById(`param-col-${p}`);
        if (panelEl) panelEl.style.display = 'none';
        if (colEl) colEl.classList.remove('active-param-col');
    });
    
    // Toggle active panel
    if (!wasActive && activePanel && activeCol) {
        activePanel.style.display = 'block';
        activeCol.classList.add('active-param-col');
    }
}

// Toggle dynamic panels in graph parameters bar
function toggleGraphParamPanel(type) {
    if (type === 'price' && state.executionType === 'market') return;
    const panels = ['type', 'price', 'lot', 'be', 'sl', 'tp'];
    const activePanel = document.getElementById(`panel-graph-${type}`);
    const activeCol = document.getElementById(`graph-param-col-${type}`);
    
    const wasActive = activePanel && activePanel.style.display === 'block';
    
    // Reset all panels and columns
    panels.forEach(p => {
        const panelEl = document.getElementById(`panel-graph-${p}`);
        const colEl = document.getElementById(`graph-param-col-${p}`);
        if (panelEl) panelEl.style.display = 'none';
        if (colEl) colEl.classList.remove('active-param-col');
    });
    
    // Toggle active panel
    if (!wasActive && activePanel && activeCol) {
        activePanel.style.display = 'block';
        activeCol.classList.add('active-param-col');
    }
}

// Synchronize displayed values in the parameter bar with the actual input fields
function syncScalpParamDisplays() {
    const lotInput = document.getElementById('input-lot') || document.getElementById('graph-input-lot');
    const autoBeInput = document.getElementById('input-auto-be') || document.getElementById('graph-input-auto-be');
    const slInput = document.getElementById('input-sl-points') || document.getElementById('graph-input-sl-points');
    const tpInput = document.getElementById('input-tp-points') || document.getElementById('graph-input-tp-points');
    
    const displayLot = document.getElementById('val-display-lot');
    const displayBe = document.getElementById('val-display-be');
    const displaySl = document.getElementById('val-display-sl');
    const displayTp = document.getElementById('val-display-tp');
    
    const graphDisplayLot = document.getElementById('graph-val-display-lot');
    const graphDisplayBe = document.getElementById('graph-val-display-be');
    const graphDisplaySl = document.getElementById('graph-val-display-sl');
    const graphDisplayTp = document.getElementById('graph-val-display-tp');
    
    if (lotInput) {
        const val = parseFloat(lotInput.value) || 0;
        let lotText = val.toFixed(2);
        if (val === 0.75 && state.isSplitActive) {
            lotText = state.splitScenario === 1 ? "0.75 Sc1" : "0.75 Split";
        }
        if (displayLot) displayLot.innerText = lotText;
        if (graphDisplayLot) graphDisplayLot.innerText = lotText;
    }
    if (autoBeInput) {
        const val = parseInt(autoBeInput.value) || 0;
        if (displayBe) displayBe.innerText = val > 0 ? val : 'Off';
        if (graphDisplayBe) graphDisplayBe.innerText = val > 0 ? val : 'Off';
    }
    if (slInput) {
        const val = parseFloat(slInput.value) || 0;
        if (displaySl) displaySl.innerText = val > 0 ? `-${val.toFixed(0)}` : 'None';
        if (graphDisplaySl) graphDisplaySl.innerText = val > 0 ? `-${val.toFixed(0)}` : 'None';
    }
    if (tpInput) {
        const val = parseFloat(tpInput.value) || 0;
        if (displayTp) displayTp.innerText = val > 0 ? val.toFixed(0) : 'None';
        if (graphDisplayTp) graphDisplayTp.innerText = val > 0 ? val.toFixed(0) : 'None';
    }
    
    // Sync Execution Type
    const typeVal = state.executionType || 'market';
    const typeLabel = typeVal === 'l10' ? 'L10' : (typeVal.charAt(0).toUpperCase() + typeVal.slice(1));
    if (elements.valDisplayType) elements.valDisplayType.innerText = typeLabel;
    if (elements.graphValDisplayType) elements.graphValDisplayType.innerText = typeLabel;
    
    // Sync active classes on Type preset buttons
    document.querySelectorAll('#type-presets .preset-btn').forEach(btn => {
        if (btn.getAttribute('data-val') === typeVal) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    document.querySelectorAll('#graph-type-presets .preset-btn').forEach(btn => {
        if (btn.getAttribute('data-val') === typeVal) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Sync active classes on Price Mode preset buttons
    document.querySelectorAll('#graph-price-mode-presets .preset-btn').forEach(btn => {
        const mode = btn.getAttribute('data-val');
        if (typeVal === mode || (typeVal !== 'l10' && mode === 'limit')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle visibility of fixed price controls when in L10 mode
    const fixedControls = document.getElementById('graph-price-fixed-controls');
    if (fixedControls) {
        fixedControls.style.display = typeVal === 'l10' ? 'none' : 'block';
    }

    // Sync Price column
    if (typeVal === 'market') {
        if (elements.valDisplayPrice) elements.valDisplayPrice.innerText = 'Mkt';
        if (elements.graphValDisplayPrice) elements.graphValDisplayPrice.innerText = 'Mkt';
        if (elements.paramColPrice) elements.paramColPrice.classList.remove('clickable-param');
        if (elements.graphParamColPrice) elements.graphParamColPrice.classList.remove('clickable-param');
    } else if (typeVal === 'l10') {
        if (elements.valDisplayPrice) elements.valDisplayPrice.innerText = '±10p';
        if (elements.graphValDisplayPrice) elements.graphValDisplayPrice.innerText = '±10p';
        if (elements.paramColPrice) elements.paramColPrice.classList.add('clickable-param');
        if (elements.graphParamColPrice) elements.graphParamColPrice.classList.add('clickable-param');
    } else {
        const priceStr = state.limitPrice ? state.limitPrice.toFixed(1) : '----.-';
        if (elements.valDisplayPrice) elements.valDisplayPrice.innerText = priceStr;
        if (elements.graphValDisplayPrice) elements.graphValDisplayPrice.innerText = priceStr;
        if (elements.paramColPrice) elements.paramColPrice.classList.add('clickable-param');
        if (elements.graphParamColPrice) elements.graphParamColPrice.classList.add('clickable-param');
        
        // Update input values
        if (state.limitPrice) {
            if (elements.limitPriceInput && document.activeElement !== elements.limitPriceInput) {
                elements.limitPriceInput.value = state.limitPrice;
            }
            if (elements.graphLimitPriceInput && document.activeElement !== elements.graphLimitPriceInput) {
                elements.graphLimitPriceInput.value = state.limitPrice;
            }
        }
    }

    // Update Live Buy/Sell buttons labels & subtitles
    if (elements.graphBuyBtn) {
        const titleSpan = elements.graphBuyBtn.querySelector('.live-btn-title');
        const subSpan = elements.graphBuyBtn.querySelector('.live-btn-sub');
        if (typeVal === 'l10') {
            if (titleSpan) titleSpan.innerText = 'BUY LIMIT';
            if (subSpan) subSpan.innerText = 'Ordre Limite à -10 pips';
        } else if (typeVal === 'limit') {
            if (titleSpan) titleSpan.innerText = 'BUY LIMIT';
            if (subSpan) subSpan.innerText = 'Click to execute Buy Limit';
        } else {
            if (titleSpan) titleSpan.innerText = 'BUY (LONG)';
            if (subSpan) subSpan.innerText = 'Click to execute Long';
        }
    }
    if (elements.graphSellBtn) {
        const titleSpan = elements.graphSellBtn.querySelector('.live-btn-title');
        const subSpan = elements.graphSellBtn.querySelector('.live-btn-sub');
        if (typeVal === 'l10') {
            if (titleSpan) titleSpan.innerText = 'SELL LIMIT';
            if (subSpan) subSpan.innerText = 'Ordre Limite à +10 pips';
        } else if (typeVal === 'limit') {
            if (titleSpan) titleSpan.innerText = 'SELL LIMIT';
            if (subSpan) subSpan.innerText = 'Click to execute Sell Limit';
        } else {
            if (titleSpan) titleSpan.innerText = 'SELL (SHORT)';
            if (subSpan) subSpan.innerText = 'Click to execute Short';
        }
    }
}

// ==========================================================================
// CHART HEIGHT DRAG-TO-RESIZE
// ==========================================================================
function initChartResizer() {
    const resizer = elements.graphResizer;
    const card = elements.graphChartCard;
    const chartContainer = document.getElementById('tradingview_chart');
    const tabGraph = document.getElementById('tab-graph');
    if (!resizer || !card) return;

    let startY = 0;
    let startHeight = 0;
    let isDragging = false;

    // Mouse Drag Start
    function onMouseDown(e) {
        isDragging = true;
        startY = e.clientY;
        startHeight = card.offsetHeight;
        
        resizer.classList.add('dragging');

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        e.preventDefault(); // Prevent text selection/dragging defaults
    }

    // Mouse Drag Move
    function onMouseMove(e) {
        if (!isDragging) return;
        const currentY = e.clientY;
        performResize(currentY);
    }

    // Mouse Drag End
    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('dragging');

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // Touch Drag Start
    function onTouchStart(e) {
        if (e.touches.length > 1) return; // Ignore multi-touch
        isDragging = true;
        startY = e.touches[0].clientY;
        startHeight = card.offsetHeight;
        
        resizer.classList.add('dragging');
        
        // Prevent scroll bounce on parent container during dragging
        if (tabGraph) {
            tabGraph.style.overflowY = 'hidden';
        }
        
        // Prevent default tap/scroll start behavior on iOS
        e.preventDefault();
    }

    // Touch Drag Move (respecting iOS constraints, passive: false)
    function onTouchMove(e) {
        if (!isDragging) return;
        
        // Block iOS page scrolling/bouncing completely
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const currentY = e.touches[0].clientY;
        performResize(currentY);
    }

    // Touch Drag End
    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('dragging');
        
        // Restore scrolling on parent container
        if (tabGraph) {
            tabGraph.style.overflowY = 'auto';
        }
    }

    // Shared Resizing Calculation
    function performResize(currentY) {
        const deltaY = currentY - startY;
        let newHeight = startHeight + deltaY;

        // Constraint boundaries (clamp between 150px and 600px)
        if (newHeight < 150) newHeight = 150;
        if (newHeight > 600) newHeight = 600;

        card.style.height = newHeight + 'px';

        // Resize chart canvas
        if (lwChartInstance && chartContainer) {
            const w = chartContainer.clientWidth;
            const h = chartContainer.clientHeight;
            if (w > 0 && h > 0) {
                lwChartInstance.resize(w, h);
            }
        }
    }

    // Mouse events
    resizer.addEventListener('mousedown', onMouseDown);

    // Touch events (Registered directly on the resizer, non-passive)
    resizer.addEventListener('touchstart', onTouchStart, { passive: false });
    resizer.addEventListener('touchmove', onTouchMove, { passive: false });
    resizer.addEventListener('touchend', onTouchEnd);
}

function setExecutionType(val) {
    state.executionType = val;
    if (val === 'limit') {
        if (!state.limitPrice || state.limitPrice === 0) {
            state.limitPrice = state.lastAsk || 0;
        }
    }
    syncScalpParamDisplays();
}

function adjustLimitPrice(deltaPoints) {
    if (state.executionType === 'l10') {
        state.executionType = 'limit';
    }
    const symbol = state.config.symbol;
    const currentPrice = state.limitPrice || state.lastAsk || 100;
    const pipSize = getPipSize(symbol, currentPrice);
    
    // adjust price
    state.limitPrice = (state.limitPrice || state.lastAsk || 0) + (deltaPoints * pipSize);
    
    syncScalpParamDisplays();
}

// ==========================================================================
// KEY LEVELS SUPPORT / RESISTANCE MANAGEMENT
// ==========================================================================

async function saveConfigLevels(updatedLevels) {
    if (!state.config) return;
    
    const payload = {
        symbol: state.config.symbol,
        default_lot: state.config.default_lot,
        default_sl_points: state.config.default_sl_points,
        default_tp_points: state.config.default_tp_points,
        auto_be_pips: state.config.auto_be_pips,
        max_spread_pips: state.config.max_spread_pips,
        terminal_path_long: state.config.terminal_path_long,
        terminal_path_short: state.config.terminal_path_short,
        key_levels: updatedLevels
    };
    
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Erreur de configuration");
        
        state.config.key_levels = updatedLevels;
        renderLevelsTable();
        updateChartKeyLevels();
        
        if (state.lastBidPrice) {
            checkKeyLevelsConsigne(state.lastBidPrice);
        }
        
    } catch (err) {
        showToast(err.message, "danger");
    }
}

function renderLevelsTable() {
    const tableBody = document.getElementById('levels-table-body');
    if (!tableBody) return;
    
    const levels = (state.config && state.config.key_levels) || [];
    if (levels.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 12px; color: var(--text-muted);">
                    Aucun niveau configuré
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedLevels = [...levels].sort((a, b) => b.price - a.price);
    const symbol = (state.config && state.config.symbol) || "Ger40";
    
    let html = '';
    for (let i = 0; i < sortedLevels.length; i++) {
        const lvl = sortedLevels[i];
        const pipSize = getPipSize(symbol, lvl.price);
        
        let spaceText = '-';
        if (i < sortedLevels.length - 1) {
            const nextLvl = sortedLevels[i + 1];
            const diffPips = (lvl.price - nextLvl.price) / (pipSize || 1.0);
            spaceText = `${diffPips.toFixed(1)} pips`;
        }
        
        let badgeLabel = '';
        if (lvl.importance === 'majeur') {
            badgeLabel = 'Majeur';
        } else if (lvl.importance === 'moyen') {
            badgeLabel = 'Moyen';
        } else {
            badgeLabel = 'Mineur';
        }
        
        let badgeStyle = 'padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; text-transform: uppercase;';
        if (lvl.importance === 'majeur') {
            badgeStyle += ' background: var(--color-sell-bg); color: var(--color-sell); border: 1px solid var(--color-sell);';
        } else if (lvl.importance === 'moyen') {
            badgeStyle += ' background: rgba(255, 152, 0, 0.1); color: #ff9800; border: 1px solid #ff9800;';
        } else {
            badgeStyle += ' background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color);';
        }
        
        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 8px 4px; font-weight: 700; color: var(--text-primary);">${lvl.price.toFixed(1)}</td>
                <td style="padding: 8px 4px;"><span style="${badgeStyle}">${badgeLabel}</span></td>
                <td style="padding: 8px 4px; text-align: right; font-weight: 600; color: var(--text-secondary);">${spaceText}</td>
                <td style="padding: 8px 4px; text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="btn" onclick="editLevel('${lvl.id}')" style="padding: 4px 6px; font-size: 10px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); cursor: pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn" onclick="deleteLevel('${lvl.id}')" style="padding: 4px 6px; font-size: 10px; border-radius: 4px; border: 1px solid var(--color-sell); background: var(--color-sell-bg); color: var(--color-sell); cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }
    tableBody.innerHTML = html;
}

function updateChartKeyLevels() {
    if (!lwCandlestickSeries) return;
    
    if (state.keyLevelPriceLines) {
        state.keyLevelPriceLines.forEach(line => {
            try {
                lwCandlestickSeries.removePriceLine(line);
            } catch (e) {}
        });
    }
    state.keyLevelPriceLines = [];
    
    const levels = (state.config && state.config.key_levels) || [];
    const symbol = (state.config && state.config.symbol) || "Ger40";
    
    levels.forEach(level => {
        const price = parseFloat(level.price);
        if (isNaN(price)) return;
        
        const pipSize = getPipSize(symbol, price);
        const isActive = (level.id === state.activeLevelId);
        
        let color = '#94a3b8';
        let title = 'Niveau';
        let style = LightweightCharts.LineStyle.Solid;
        let width = 1.5;
        
        if (isActive) {
            if (state.activeConsigne === 'BUY ONLY') {
                color = '#26a69a'; // Bright green
                title = `ZONE BUY ONLY (Support)`;
                width = 3.0;
                style = LightweightCharts.LineStyle.Solid;
            } else if (state.activeConsigne === 'SELL ONLY') {
                color = '#ef5350'; // Bright red
                title = `ZONE SELL ONLY (Résistance)`;
                width = 3.0;
                style = LightweightCharts.LineStyle.Solid;
            }
        } else {
            if (level.importance === 'majeur') {
                color = 'rgba(239, 83, 80, 0.7)'; // Red
                title = `SUP/RES MAJ: ${price.toFixed(1)}`;
                width = 2.0;
                style = LightweightCharts.LineStyle.Solid;
            } else if (level.importance === 'moyen') {
                color = 'rgba(255, 152, 0, 0.7)'; // Orange
                title = `SUP/RES MOY: ${price.toFixed(1)}`;
                width = 1.5;
                style = LightweightCharts.LineStyle.Dashed;
            } else if (level.importance === 'mineur') {
                color = 'rgba(148, 163, 184, 0.7)'; // Slate Gray
                title = `SUP/RES MIN: ${price.toFixed(1)}`;
                width = 1.0;
                style = LightweightCharts.LineStyle.Dotted;
            }
        }
        
        try {
            const mainLine = lwCandlestickSeries.createPriceLine({
                price: price,
                color: color,
                lineWidth: width,
                lineStyle: style,
                axisLabelVisible: true,
                title: title
            });
            state.keyLevelPriceLines.push(mainLine);
            
            // Draw Buy Only boundary line (+30 pips)
            const buyLimitPrice = price + 30 * pipSize;
            const buyLineColor = isActive && state.activeConsigne === 'BUY ONLY' ? 'rgba(38, 166, 154, 0.8)' : 'rgba(38, 166, 154, 0.2)';
            const buyLine = lwCandlestickSeries.createPriceLine({
                price: buyLimitPrice,
                color: buyLineColor,
                lineWidth: isActive && state.activeConsigne === 'BUY ONLY' ? 1.5 : 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: isActive && state.activeConsigne === 'BUY ONLY' ? 'LIMITE ZONE ACHAT' : `Limite Buy (+30)`
            });
            state.keyLevelPriceLines.push(buyLine);
            
            // Draw Sell Only boundary line (-30 pips)
            const sellLimitPrice = price - 30 * pipSize;
            const sellLineColor = isActive && state.activeConsigne === 'SELL ONLY' ? 'rgba(239, 83, 80, 0.8)' : 'rgba(239, 83, 80, 0.2)';
            const sellLine = lwCandlestickSeries.createPriceLine({
                price: sellLimitPrice,
                color: sellLineColor,
                lineWidth: isActive && state.activeConsigne === 'SELL ONLY' ? 1.5 : 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                axisLabelVisible: true,
                title: isActive && state.activeConsigne === 'SELL ONLY' ? 'LIMITE ZONE VENTE' : `Limite Sell (-30)`
            });
            state.keyLevelPriceLines.push(sellLine);
        } catch (e) {
            console.error("Error creating chart price line:", e);
        }
    });
}

function checkKeyLevelsConsigne(currentPrice) {
    const levels = (state.config && state.config.key_levels) || [];
    const symbol = (state.config && state.config.symbol) || "Ger40";
    const pipSize = getPipSize(symbol, currentPrice);
    
    let activeConsigne = null;
    let activeLevel = null;
    
    // Sort levels: majeur first, then moyen, then mineur, then by distance to price
    const sortedLevels = [...levels].sort((a, b) => {
        const impA = a.importance === 'majeur' ? 3 : (a.importance === 'moyen' ? 2 : 1);
        const impB = b.importance === 'majeur' ? 3 : (b.importance === 'moyen' ? 2 : 1);
        if (impA !== impB) return impB - impA;
        return Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice);
    });
    
    for (const level of sortedLevels) {
        const price = parseFloat(level.price);
        if (isNaN(price)) continue;
        
        const diffPips = (currentPrice - price) / pipSize;
        
        // "buy only" if price is 0 to +30 pips above level
        if (diffPips >= 0 && diffPips <= 30) {
            activeConsigne = 'BUY ONLY';
            activeLevel = level;
            break;
        }
        // "sell only" if price is -30 to 0 pips below level
        if (diffPips >= -30 && diffPips < 0) {
            activeConsigne = 'SELL ONLY';
            activeLevel = level;
            break;
        }
    }
    
    // Trigger visual state update if consigne or active level has changed
    const consigneChanged = (state.activeConsigne !== activeConsigne || state.activeLevelId !== (activeLevel ? activeLevel.id : null));
    
    if (consigneChanged) {
        state.activeConsigne = activeConsigne;
        state.activeLevelId = activeLevel ? activeLevel.id : null;
        
        updateConsigneUI(activeConsigne, activeLevel, currentPrice);
        updateChartKeyLevels();
    }
}

function updateConsigneUI(consigne, level, currentPrice) {
    const banner = document.getElementById('graph-consigne-banner');
    const textEl = document.getElementById('graph-consigne-text');
    if (!banner || !textEl) return;
    
    if (consigne === 'BUY ONLY') {
        textEl.innerHTML = `CONSIGNE ACTIVE : <span style="font-size: 12px; font-weight: 800;">BUY ONLY</span> (Achat Proche Support ${level.price.toFixed(1)})`;
        banner.style.backgroundColor = 'var(--color-buy-bg)';
        banner.style.borderColor = 'var(--color-buy)';
        banner.style.color = 'var(--color-buy)';
        banner.style.display = 'flex';
    } else if (consigne === 'SELL ONLY') {
        textEl.innerHTML = `CONSIGNE ACTIVE : <span style="font-size: 12px; font-weight: 800;">SELL ONLY</span> (Vente Proche Résistance ${level.price.toFixed(1)})`;
        banner.style.backgroundColor = 'var(--color-sell-bg)';
        banner.style.borderColor = 'var(--color-sell)';
        banner.style.color = 'var(--color-sell)';
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

function initLevelsTab() {
    const levelForm = document.getElementById('level-form');
    if (!levelForm) return;
    
    levelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const priceInput = document.getElementById('level-price');
        const importanceInput = document.getElementById('level-importance');
        const editIdInput = document.getElementById('level-edit-id');
        
        const price = parseFloat(priceInput.value);
        if (isNaN(price) || price <= 0) {
            showToast("Veuillez saisir un prix valide.", "danger");
            return;
        }
        
        const importance = importanceInput.value;
        const editId = editIdInput.value;
        
        let currentLevels = (state.config && state.config.key_levels) || [];
        
        if (editId) {
            // Edit existing
            currentLevels = currentLevels.map(lvl => {
                if (lvl.id === editId) {
                    return { ...lvl, price: price, importance: importance };
                }
                return lvl;
            });
            showToast("Niveau clé modifié.", "success");
        } else {
            // Add new
            const newLevel = {
                id: Date.now().toString(),
                price: price,
                importance: importance
            };
            currentLevels.push(newLevel);
            showToast("Niveau clé ajouté.", "success");
        }
        
        // Reset form
        priceInput.value = '';
        importanceInput.value = 'majeur';
        editIdInput.value = '';
        document.getElementById('btn-save-level').innerText = 'Ajouter le Niveau';
        document.getElementById('btn-cancel-edit-level').style.display = 'none';
        
        saveConfigLevels(currentLevels);
    });
    
    const btnCancelEdit = document.getElementById('btn-cancel-edit-level');
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            document.getElementById('level-price').value = '';
            document.getElementById('level-importance').value = 'majeur';
            document.getElementById('level-edit-id').value = '';
            document.getElementById('btn-save-level').innerText = 'Ajouter le Niveau';
            btnCancelEdit.style.display = 'none';
        });
    }
}

window.editLevel = function(id) {
    const levels = (state.config && state.config.key_levels) || [];
    const lvl = levels.find(l => l.id === id);
    if (!lvl) return;
    
    document.getElementById('level-price').value = lvl.price;
    document.getElementById('level-importance').value = lvl.importance;
    document.getElementById('level-edit-id').value = lvl.id;
    
    document.getElementById('btn-save-level').innerText = 'Enregistrer';
    document.getElementById('btn-cancel-edit-level').style.display = 'block';
    
    document.getElementById('level-price').focus();
};

window.deleteLevel = function(id) {
    let levels = (state.config && state.config.key_levels) || [];
    levels = levels.filter(l => l.id !== id);
    showToast("Niveau clé supprimé.", "info");
    saveConfigLevels(levels);
};

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================
function init() {
    console.log("App loaded - Version 120");
    showToast("Application démarrée - Version 120", "info");
    initNavigation();
    
    // Timezone selector handler for analysis chart
    const selectTz = document.getElementById('select-analysis-timezone');
    if (selectTz) {
        const storedTz = localStorage.getItem('analysis_timezone_val') || 'auto';
        selectTz.value = storedTz;
        selectTz.addEventListener('change', () => {
            localStorage.setItem('analysis_timezone_val', selectTz.value);
            if (analysisSelectedDate) {
                loadAnalysisChartData(analysisSelectedDate, false);
            }
        });
    }
    
    // Filter checkbox for small pips trades on analysis chart
    const chkHideSmall = document.getElementById('chk-hide-small-trades');
    if (chkHideSmall) {
        const storedHideSmall = localStorage.getItem('analysis_hide_small_trades') === 'true';
        chkHideSmall.checked = storedHideSmall;
        chkHideSmall.addEventListener('change', () => {
            localStorage.setItem('analysis_hide_small_trades', chkHideSmall.checked ? 'true' : 'false');
            if (analysisSelectedDate) {
                loadAnalysisChartData(analysisSelectedDate, false);
            }
        });
    }
    
    // Previous analysis day click handler
    const btnPrevAnalysis = document.getElementById('btn-prev-analysis-day');
    if (btnPrevAnalysis) {
        btnPrevAnalysis.addEventListener('click', () => {
            const dates = getAvailableDates();
            const currentIndex = dates.indexOf(analysisSelectedDate);
            if (currentIndex > 0) {
                const prevDate = dates[currentIndex - 1];
                const row = document.querySelector(`.daily-stat-row[data-date="${prevDate}"]`);
                if (row) {
                    row.click();
                } else {
                    analysisSelectedDate = prevDate;
                    const dateSpan = document.getElementById('analysis-active-date');
                    if (dateSpan) dateSpan.innerText = `(${prevDate})`;
                    loadAnalysisChartData(prevDate);
                }
            }
        });
    }

    // Next analysis day click handler
    const btnNextAnalysis = document.getElementById('btn-next-analysis-day');
    if (btnNextAnalysis) {
        btnNextAnalysis.addEventListener('click', () => {
            const dates = getAvailableDates();
            const currentIndex = dates.indexOf(analysisSelectedDate);
            if (currentIndex !== -1 && currentIndex < dates.length - 1) {
                const nextDate = dates[currentIndex + 1];
                const row = document.querySelector(`.daily-stat-row[data-date="${nextDate}"]`);
                if (row) {
                    row.click();
                } else {
                    analysisSelectedDate = nextDate;
                    const dateSpan = document.getElementById('analysis-active-date');
                    if (dateSpan) dateSpan.innerText = `(${nextDate})`;
                    loadAnalysisChartData(nextDate);
                }
            }
        });
    }
    
    initChartResizer();
    initCollapsibleSections();
    initRsiControls();
    
    // Fullscreen Analysis Chart Toggle
    const btnFullscreen = document.getElementById('btn-fullscreen-analysis');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            const wrapper = document.querySelector('.journal-layout-wrapper');
            if (wrapper) {
                const isActive = wrapper.classList.toggle('fullscreen-active');
                
                // Update button text and icon
                btnFullscreen.innerHTML = isActive
                    ? '<i class="fa-solid fa-compress"></i> Réduire'
                    : '<i class="fa-solid fa-expand"></i> Plein écran';
                
                // Resize chart to adapt to full container size
                setTimeout(() => {
                    if (analysisChartInstance) {
                        const container = document.getElementById('analysis_chart');
                        if (container && container.clientWidth > 0) {
                            analysisChartInstance.resize(container.clientWidth, container.clientHeight);
                            analysisChartInstance.timeScale().fitContent();
                        }
                    }
                }, 150); // slight delay for layout transitions
            }
        });
    }

    // Zoom In/Out & Reset for Analysis Chart
    const btnZoomIn = document.getElementById('btn-zoom-in-analysis');
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            if (analysisChartInstance) {
                const ts = analysisChartInstance.timeScale();
                const currentSpacing = ts.options().barSpacing || 6;
                ts.applyOptions({ barSpacing: Math.min(100, currentSpacing * 1.3) });
            }
        });
    }
    const btnZoomOut = document.getElementById('btn-zoom-out-analysis');
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            if (analysisChartInstance) {
                const ts = analysisChartInstance.timeScale();
                const currentSpacing = ts.options().barSpacing || 6;
                ts.applyOptions({ barSpacing: Math.max(0.5, currentSpacing / 1.3) });
            }
        });
    }
    const btnResetZoom = document.getElementById('btn-reset-analysis');
    if (btnResetZoom) {
        btnResetZoom.addEventListener('click', () => {
            if (analysisChartInstance) {
                analysisChartInstance.timeScale().fitContent();
            }
        });
    }

    // Zoom In/Out & Reset & Candle count for Main Trade Chart
    const btnZoomInTrade = document.getElementById('btn-zoom-in-trade');
    if (btnZoomInTrade) {
        btnZoomInTrade.addEventListener('click', () => {
            if (lwChartInstance) {
                const ts = lwChartInstance.timeScale();
                const currentSpacing = ts.options().barSpacing || 6;
                ts.applyOptions({ barSpacing: Math.min(100, currentSpacing * 1.3) });
            }
        });
    }
    const btnZoomOutTrade = document.getElementById('btn-zoom-out-trade');
    if (btnZoomOutTrade) {
        btnZoomOutTrade.addEventListener('click', () => {
            if (lwChartInstance) {
                const ts = lwChartInstance.timeScale();
                const currentSpacing = ts.options().barSpacing || 6;
                ts.applyOptions({ barSpacing: Math.max(0.5, currentSpacing / 1.3) });
            }
        });
    }
    const btnResetTrade = document.getElementById('btn-reset-trade');
    if (btnResetTrade) {
        btnResetTrade.addEventListener('click', () => {
            if (lwChartInstance && chartBars.length > 0) {
                const count = parseInt(localStorage.getItem('trade_chart_candle_count'), 10) || 100;
                applyVisibleCandleCount(count);
            }
        });
    }
    const candleInput = document.getElementById('trade-candle-count-input');
    if (candleInput) {
        candleInput.value = localStorage.getItem('trade_chart_candle_count') || '100';
        candleInput.addEventListener('change', () => {
            applyVisibleCandleCount(candleInput.value);
        });
        candleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                applyVisibleCandleCount(candleInput.value);
                candleInput.blur();
            }
        });
    }
    
    // Sync parameter bar values on change/input for Scalp tab
    ['input-lot', 'input-auto-be', 'input-sl-points', 'input-tp-points', 'input-limit-price'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', syncScalpParamDisplays);
            input.addEventListener('change', syncScalpParamDisplays);
        }
    });
    
    // Sync parameter bar values on change/input for Graph tab
    ['graph-input-lot', 'graph-input-auto-be', 'graph-input-sl-points', 'graph-input-tp-points', 'graph-input-limit-price'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', syncScalpParamDisplays);
            input.addEventListener('change', syncScalpParamDisplays);
        }
    });

    // Wire up type selector presets
    document.querySelectorAll('#type-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setExecutionType(btn.getAttribute('data-val'));
            toggleScalpParamPanel(null);
        });
    });
    document.querySelectorAll('#graph-type-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setExecutionType(btn.getAttribute('data-val'));
            toggleGraphParamPanel(null);
        });
    });
    document.querySelectorAll('#graph-price-mode-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setExecutionType(btn.getAttribute('data-val'));
        });
    });
    
    // Wire up price adjustment buttons
    document.querySelectorAll('.price-adjust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const change = parseFloat(btn.getAttribute('data-change'));
            adjustLimitPrice(change);
        });
    });
    document.querySelectorAll('.graph-price-adjust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const change = parseFloat(btn.getAttribute('data-change'));
            adjustLimitPrice(change);
        });
    });
    
    // Wire up limit price inputs bi-directionally
    if (elements.limitPriceInput) {
        const updatePrice = (e) => {
            if (state.executionType === 'l10') state.executionType = 'limit';
            state.limitPrice = parseFloat(e.target.value) || 0;
            if (elements.graphLimitPriceInput && elements.graphLimitPriceInput.value !== e.target.value) {
                elements.graphLimitPriceInput.value = e.target.value;
            }
            syncScalpParamDisplays();
        };
        elements.limitPriceInput.addEventListener('input', updatePrice);
        elements.limitPriceInput.addEventListener('change', updatePrice);
    }
    if (elements.graphLimitPriceInput) {
        const updatePrice = (e) => {
            if (state.executionType === 'l10') state.executionType = 'limit';
            state.limitPrice = parseFloat(e.target.value) || 0;
            if (elements.limitPriceInput && elements.limitPriceInput.value !== e.target.value) {
                elements.limitPriceInput.value = e.target.value;
            }
            syncScalpParamDisplays();
        };
        elements.graphLimitPriceInput.addEventListener('input', updatePrice);
        elements.graphLimitPriceInput.addEventListener('change', updatePrice);
    }
    
    // Setup Presets for Scalp tab if present
    if (elements.lotInput) {
        setupPresetSelector('lot-presets', elements.lotInput);
        setupPresetSelector('sl-presets', elements.slInput);
        setupPresetSelector('tp-presets', elements.tpInput);
        setupPresetSelector('auto-be-presets', elements.autoBeInput);
    }
    
    // Setup Presets for Graph tab
    setupPresetSelector('graph-lot-presets', elements.graphLotInput);
    setupPresetSelector('graph-sl-presets', elements.graphSlInput);
    setupPresetSelector('graph-tp-presets', elements.graphTpInput);
    setupPresetSelector('graph-auto-be-presets', elements.graphAutoBeInput);
    
    // Bi-directional Synchronization between Scalp and Graph inputs
    const syncFields = [
        { scalp: elements.lotInput, graph: elements.graphLotInput, presetScalp: 'lot-presets', presetGraph: 'graph-lot-presets', isFloat: true },
        { scalp: elements.slInput, graph: elements.graphSlInput, presetScalp: 'sl-presets', presetGraph: 'graph-sl-presets', isFloat: true },
        { scalp: elements.tpInput, graph: elements.graphTpInput, presetScalp: 'tp-presets', presetGraph: 'graph-tp-presets', isFloat: true },
        { scalp: elements.autoBeInput, graph: elements.graphAutoBeInput, presetScalp: 'auto-be-presets', presetGraph: 'graph-auto-be-presets', isFloat: false }
    ];

    syncFields.forEach(field => {
        if (field.scalp) {
            field.scalp.addEventListener('input', (e) => {
                const val = e.target.value;
                const parsedVal = field.isFloat ? parseFloat(val) : parseInt(val);
                if (field.graph && field.graph.value !== val) {
                    field.graph.value = val;
                }
                syncPresets(field.presetScalp, parsedVal);
                syncPresets(field.presetGraph, parsedVal);
                syncScalpParamDisplays();
            });
        }
        if (field.graph) {
            field.graph.addEventListener('input', (e) => {
                const val = e.target.value;
                const parsedVal = field.isFloat ? parseFloat(val) : parseInt(val);
                if (field.scalp && field.scalp.value !== val) {
                    field.scalp.value = val;
                }
                syncPresets(field.presetScalp, parsedVal);
                syncPresets(field.presetGraph, parsedVal);
                syncScalpParamDisplays();
            });
        }
    });
    
    // Bind immediate Auto BE updates from presets & custom inputs (Scalp)
    const autoBeBtns = document.querySelectorAll('#auto-be-presets .preset-btn');
    autoBeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseInt(btn.getAttribute('data-val')) || 0;
            saveAutoBE(val);
        });
    });
    if (elements.autoBeInput) {
        elements.autoBeInput.addEventListener('change', () => {
            const val = parseInt(elements.autoBeInput.value) || 0;
            saveAutoBE(val);
        });
    }
    
    // Bind immediate Auto BE updates from presets & custom inputs (Graph)
    const graphAutoBeBtns = document.querySelectorAll('#graph-auto-be-presets .preset-btn');
    if (graphAutoBeBtns) {
        graphAutoBeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-val')) || 0;
                saveAutoBE(val);
            });
        });
    }
    if (elements.graphAutoBeInput) {
        elements.graphAutoBeInput.addEventListener('change', () => {
            const val = parseInt(elements.graphAutoBeInput.value) || 0;
            saveAutoBE(val);
        });
    }
    
    // Bind modal adjustments
    bindAdjusters();
    
    // Click events
    if (elements.scalpBuyBtn) elements.scalpBuyBtn.addEventListener('click', () => placeOrder('BUY'));
    if (elements.scalpSellBtn) elements.scalpSellBtn.addEventListener('click', () => placeOrder('SELL'));
    if (elements.closeAllBtn) elements.closeAllBtn.addEventListener('click', handleCloseAllPositions);
    
    if (elements.graphBuyBtn) elements.graphBuyBtn.addEventListener('click', () => placeOrder('BUY'));
    if (elements.graphSellBtn) elements.graphSellBtn.addEventListener('click', () => placeOrder('SELL'));
    
    elements.closeModalX.addEventListener('click', closeModifyModal);
    elements.submitModifyBtn.addEventListener('click', submitModify);
    
    elements.closeDetailModalX.addEventListener('click', closeDetailModal);
    elements.closePosModalBtn.addEventListener('click', async () => {
        const ticket = parseInt(elements.modTicket.value);
        const accountType = elements.modAccType.value;
        const pos = state.positions.find(p => p.ticket === ticket);
        if (!pos) {
            showToast("Position introuvable", "danger");
            return;
        }
        closeModifyModal();
        await handleClosePosition(pos.ticket, pos.volume, pos.account_type);
    });
    
    // Click outside modal container to close
    elements.modifyModal.addEventListener('click', (e) => {
        if (e.target === elements.modifyModal) closeModifyModal();
    });
    elements.detailModal.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) closeDetailModal();
    });
    
    // Toggle Scalp Console Card and Resizer visibility on Graph tab
    if (elements.graphConsoleToggleBtn && elements.graphScalpConsoleCard) {
        elements.graphConsoleToggleBtn.addEventListener('click', () => {
            const consoleCard = elements.graphScalpConsoleCard;
            const btn = elements.graphConsoleToggleBtn;
            const resizer = elements.graphResizer;
            
            const isHidden = window.getComputedStyle(consoleCard).display === 'none';
            
            if (isHidden) {
                // Show console
                consoleCard.style.display = 'flex';
                btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
                btn.classList.remove('hidden-state');
                showToast("Panneau d'ordre affiché", "info");
            } else {
                // Hide console
                consoleCard.style.display = 'none';
                btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
                btn.classList.add('hidden-state');
                showToast("Panneau d'ordre masqué", "info");
            }
            
            // Trigger chart resize because container height changed
            setTimeout(() => {
                const chartContainer = document.getElementById('tradingview_chart');
                if (lwChartInstance && chartContainer) {
                    const w = chartContainer.clientWidth;
                    const h = chartContainer.clientHeight;
                    if (w > 0 && h > 0) {
                        lwChartInstance.resize(w, h);
                    }
                }
            }, 50);
        });
    }

    elements.configForm.addEventListener('submit', handleConfigSubmit);
    initLevelsTab();

    if (elements.exportCsvBtn) {
        elements.exportCsvBtn.addEventListener('click', exportHistoryToCSV);
    }

    // Journal unit selector setup
    if (elements.journalUnitSelector) {
        const unitBtns = elements.journalUnitSelector.querySelectorAll('.preset-btn');
        
        // Sync active state on load
        unitBtns.forEach(btn => {
            if (btn.getAttribute('data-unit') === state.journalUnit) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Bind click events
        unitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                unitBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.journalUnit = btn.getAttribute('data-unit');
                localStorage.setItem('journalUnit', state.journalUnit);
                if (state.lastHistoryData) {
                    renderHistoryTab(state.lastHistoryData);
                }
            });
        });
    }

    // Journal stats period selector setup (Jour / Semaine / Mois)
    const periodSelector = document.getElementById('journal-stats-period-selector');
    if (periodSelector) {
        const periodBtns = periodSelector.querySelectorAll('.preset-btn');
        periodBtns.forEach(btn => {
            if (btn.getAttribute('data-period') === state.journalPeriod) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            btn.addEventListener('click', () => {
                periodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.journalPeriod = btn.getAttribute('data-period');
                localStorage.setItem('journal_stats_period', state.journalPeriod);
                if (state.lastHistoryData) {
                    renderHistoryTab(state.lastHistoryData);
                }
            });
        });
    }

    // Journal account selector setup (Total / Bull / Short)
    const accountSelector = document.getElementById('journal-account-selector');
    if (accountSelector) {
        const accountBtns = accountSelector.querySelectorAll('.preset-btn');
        accountBtns.forEach(btn => {
            if (btn.getAttribute('data-account') === state.journalAccount) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            btn.addEventListener('click', () => {
                accountBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.journalAccount = btn.getAttribute('data-account');
                localStorage.setItem('journal_account_view', state.journalAccount);
                updateJournalAccountMetrics();
            });
        });
    }

    // Load config which automatically triggers quote streaming
    loadConfigFromServer();
    
    // Initial Polls
    fetchStatus();
    fetchPositions();
    
    // Setting up polling loops
    setInterval(fetchPositions, 1000); // Update positions every 1s
    setInterval(fetchStatus, 2000);    // Update status every 2s
    setInterval(() => {
        const tab = document.getElementById('tab-journal');
        if (tab && tab.classList.contains('active')) {
            fetchHistoryData(true);
        }
    }, 10000); // Update history every 10s if active
}

// Start app on DOM Loaded
document.addEventListener('DOMContentLoaded', init);

// Collapsible Sections support
function initCollapsibleSections() {
    // Restore collapsed states
    document.querySelectorAll('.quick-positions-section, .positions-full-card').forEach(section => {
        if (section.id) {
            const isCollapsed = localStorage.getItem(`collapsed_${section.id}`) === 'true';
            if (isCollapsed) {
                section.classList.add('collapsed');
            }
        }
    });

    // Bind click events on headers dynamically
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', (event) => {
            if (event.target.closest('button') || event.target.closest('input') || event.target.closest('a')) {
                return; // Don't toggle if clicking buttons, inputs, links, etc.
            }
            const section = header.closest('.quick-positions-section, .positions-full-card');
            if (!section) return;
            section.classList.toggle('collapsed');
            
            if (section.id) {
                localStorage.setItem(`collapsed_${section.id}`, section.classList.contains('collapsed') ? 'true' : 'false');
            }
            
            // Trigger window resize so chart canvas updates if needed
            window.dispatchEvent(new Event('resize'));
        });
    });
}

function initRsiControls() {
    const toggleBtns = document.querySelectorAll('.btn-rsi-toggle');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            rsiEnabled = !rsiEnabled;
            document.querySelectorAll('.btn-rsi-toggle').forEach(b => {
                if (rsiEnabled) {
                    b.classList.add('active');
                    b.style.background = 'var(--primary-color)';
                    b.style.color = 'white';
                } else {
                    b.classList.remove('active');
                    b.style.background = 'var(--bg-input)';
                    b.style.color = 'var(--text-secondary)';
                }
            });
            updateIndicatorSeries(chartBars);
        });
    });
    
    const configBtns = document.querySelectorAll('.btn-rsi-config');
    const modal = document.getElementById('rsi-config-modal');
    configBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!modal) return;
            document.getElementById('rsi-cfg-period').value = rsiConfig.period;
            document.getElementById('rsi-cfg-right').value = rsiConfig.pivotRight;
            document.getElementById('rsi-cfg-left').value = rsiConfig.pivotLeft;
            document.getElementById('rsi-cfg-max-range').value = rsiConfig.maxLookback;
            document.getElementById('rsi-cfg-min-range').value = rsiConfig.minLookback;
            document.getElementById('rsi-cfg-bullish').checked = rsiConfig.plotBullish;
            const hBullEl = document.getElementById('rsi-cfg-hbullish');
            if (hBullEl) hBullEl.checked = rsiConfig.plotHiddenBullish;
            document.getElementById('rsi-cfg-bearish').checked = rsiConfig.plotBearish;
            const hBearEl = document.getElementById('rsi-cfg-hbearish');
            if (hBearEl) hBearEl.checked = rsiConfig.plotHiddenBearish;
            modal.classList.add('active');
        });
    });
    
    const closeX = document.getElementById('close-rsi-modal-x');
    if (closeX && modal) {
        closeX.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
    
    const btnSave = document.getElementById('btn-save-rsi-config');
    if (btnSave && modal) {
        btnSave.addEventListener('click', () => {
            rsiConfig.period = parseInt(document.getElementById('rsi-cfg-period').value) || 14;
            rsiConfig.pivotRight = parseInt(document.getElementById('rsi-cfg-right').value) || 5;
            rsiConfig.pivotLeft = parseInt(document.getElementById('rsi-cfg-left').value) || 5;
            rsiConfig.maxLookback = parseInt(document.getElementById('rsi-cfg-max-range').value) || 60;
            rsiConfig.minLookback = parseInt(document.getElementById('rsi-cfg-min-range').value) || 5;
            rsiConfig.plotBullish = document.getElementById('rsi-cfg-bullish').checked;
            const hBullEl = document.getElementById('rsi-cfg-hbullish');
            if (hBullEl) rsiConfig.plotHiddenBullish = hBullEl.checked;
            rsiConfig.plotBearish = document.getElementById('rsi-cfg-bearish').checked;
            const hBearEl = document.getElementById('rsi-cfg-hbearish');
            if (hBearEl) rsiConfig.plotHiddenBearish = hBearEl.checked;
            
            modal.classList.remove('active');
            
            if (rsiEnabled && lwRsiPane) {
                try {
                    lwChartInstance.removePane(1);
                } catch(e) {}
                lwRsiPane = null;
                lwRsiSeries = null;
            }
            updateIndicatorSeries(chartBars);
        });
    }
}
