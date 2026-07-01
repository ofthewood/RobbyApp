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
    chartPriceLines: [],
    bidPriceLine: null,
    askPriceLine: null,
    executionType: 'market',
    limitPrice: null
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
    
    const dailyTbody = document.getElementById('stats-daily-tbody');
    if (dailyTbody) {
        if (stats.length === 0) {
            dailyTbody.innerHTML = `<tr><td colspan="4" class="no-data-cell" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucune donnée disponible</td></tr>`;
        } else {
            let html = "";
            stats.forEach(day => {
                const netClass = day.net >= 0 ? "profit-text" : "loss-text";
                const formattedDate = new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                // Show Gagnant / BE / Perdant breakdown
                const gbe = `${day.winning_count} / ${day.be_count} / ${day.losing_count}`;
                const netValStr = state.journalUnit === 'EUR'
                    ? `${day.net >= 0 ? '+' : ''}${day.net.toFixed(2)} EUR`
                    : `${day.pips >= 0 ? '+' : ''}${(day.pips || 0).toFixed(1)} pips`;
                
                const activeClass = analysisSelectedDate === day.date ? "active-inspect-row" : "";
                html += `
                    <tr class="daily-stat-row ${activeClass}" data-date="${day.date}">
                        <td><strong>${formattedDate}</strong></td>
                        <td>${day.trades_count}</td>
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

    // Bind Daily Breakdown click handlers
    document.querySelectorAll('.daily-stat-row').forEach(row => {
        row.addEventListener('click', () => {
            const dateStr = row.getAttribute('data-date');
            analysisSelectedDate = dateStr;
            
            // Highlight row
            document.querySelectorAll('.daily-stat-row').forEach(r => r.classList.remove('active-inspect-row'));
            row.classList.add('active-inspect-row');
            
            // Load chart
            const dateSpan = document.getElementById('analysis-active-date');
            if (dateSpan) dateSpan.innerText = `(${dateStr})`;
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
            
            // Toggle PC Fullscreen layout for ONLY the Journal tab
            if (targetTabId === 'tab-journal') {
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
        if (activeTab.id === 'tab-journal') {
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

// Analysis Chart Globals
let analysisChartInstance = null;
let analysisCandlestickSeries = null;
let analysisPnlSeries = null;
let analysisConnectorSeries = null;
let analysisTradeConnectors = [];
let analysisMarkersPlugin = null;
let analysisSelectedDate = null;
let analysisSelectedTradeId = null;

let currentResolution = "15S";
let chartBars = []; // Track historical bars to update correctly on ticks

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
        
        // Bind timeframe selector button events
        const tfSelectors = document.querySelectorAll('.chart-timeframe-selector');
        tfSelectors.forEach(selector => {
            const tfButtons = selector.querySelectorAll('.tf-btn');
            tfButtons.forEach(btn => {
                // Remove existing listeners by cloning and replacing
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', () => {
                    const tfVal = newBtn.getAttribute('data-tf');
                    currentResolution = tfVal;
                    
                    // Sync active class across all timeframe selectors
                    document.querySelectorAll('.chart-timeframe-selector .tf-btn').forEach(b => {
                        if (b.getAttribute('data-tf') === tfVal) {
                            b.classList.add('active');
                        } else {
                            b.classList.remove('active');
                        }
                    });
                    
                    loadChartData(symbol, currentResolution, true); // shouldFit = true on timeframe click
                });
            });
        });
        
        // Initial data load
        loadChartData(symbol, currentResolution, true); // shouldFit = true on init
        console.log("Lightweight Chart initialized with local symbol:", symbol);
    } else {
        // If already initialized, trigger a resize to current container dimensions
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
            console.log(`Resizing existing chart instance to: ${w}x${h}`);
            lwChartInstance.resize(w, h);
        }
        // No need to call loadChartData on tab switches because the SSE quote stream
        // keeps chartBars and the series fully up-to-date in the background.
        // This preserves the user's manual zoom and scroll positions.
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

async function loadAnalysisChartData(selectedDate, forceFit = true) {
    if (!analysisChartInstance) initAnalysisChart();
    if (!analysisChartInstance) return;
    
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
        
        // Plot ALL daily trades entry/exit markers and draw connection lines
        const markers = [];
        dayTrades.forEach(t => {
            // Entry marker
            markers.push({
                time: t.open_time + localOffset,
                position: t.type === 'BUY' ? 'belowBar' : 'aboveBar',
                color: t.type === 'BUY' ? '#26a69a' : '#ef5350',
                shape: t.type === 'BUY' ? 'arrowUp' : 'arrowDown',
                text: `${t.type} ${t.volume.toFixed(2)}`
            });
            // Exit marker
            const pipsText = `${t.pips >= 0 ? '+' : ''}${t.pips}p`;
            markers.push({
                time: t.close_time + localOffset,
                position: t.type === 'BUY' ? 'aboveBar' : 'belowBar',
                color: t.net >= 0 ? '#26a69a' : '#ef5350',
                shape: t.type === 'BUY' ? 'arrowDown' : 'arrowUp',
                text: `Exit (${pipsText})`
            });
            
            // Connect entry and exit with a faint dashed line
            const connector = analysisChartInstance.addSeries(LightweightCharts.LineSeries, {
                color: t.net >= 0 ? 'rgba(38, 166, 154, 0.35)' : 'rgba(239, 83, 80, 0.35)',
                lineWidth: 1.5,
                lineStyle: 2, // Dashed
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });
            connector.setData([
                { time: t.open_time + localOffset, value: t.open_price },
                { time: t.close_time + localOffset, value: t.close_price }
            ]);
            analysisTradeConnectors.push(connector);
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
            // Set 0 baseline starting point
            pnlPoints.push({
                time: chronologicalTrades[0].open_time + localOffset - 60,
                value: 0
            });
            
            let lastTimestamp = 0;
            chronologicalTrades.forEach(t => {
                cumulativeVal += state.journalUnit === 'EUR' ? t.net : t.pips;
                let tTime = t.close_time;
                // Offset duplicate timestamps
                if (tTime <= lastTimestamp) {
                    tTime = lastTimestamp + 1;
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
    
    analysisConnectorSeries.setData([
        { time: trade.open_time + localOffset, value: trade.open_price },
        { time: trade.close_time + localOffset, value: trade.close_price }
    ]);
    
    // Zoom/Focus timescale to trade span with 3 minutes margin
    const marginSecs = 180;
    analysisChartInstance.timeScale().setVisibleRange({
        from: trade.open_time + localOffset - marginSecs,
        to: trade.close_time + localOffset + marginSecs
    });
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
    
    // Determine historical timeframe range (8 hours)
    const now = Math.floor(Date.now() / 1000);
    const fromTime = now - (8 * 3600); // last 8 hours
    
    try {
        const url = `/api/udf/history?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${fromTime}&to=${now}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.s === "no_data" || !data.t || data.t.length === 0) {
            lwCandlestickSeries.setData([]);
            lwSmaSeries.setData([]);
            lwBbBasisSeries.setData([]);
            lwBbUpperSeries.setData([]);
            lwBbLowerSeries.setData([]);
            chartBars = [];
            return;
        }
        
        const bars = [];
        for (let i = 0; i < data.t.length; i++) {
            bars.push({
                time: data.t[i],
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i]
            });
        }
        
        // Save the visible logical range before updating data if we should NOT fit
        const timeScale = lwChartInstance.timeScale();
        const logicalRange = shouldFit ? null : timeScale.getVisibleLogicalRange();

        chartBars = bars;
        lwCandlestickSeries.setData(bars);
        
        // Calculate and plot indicators
        updateIndicatorSeries(bars);
        
        // Fit content on screen only if requested (preserves user zoom/pan)
        if (shouldFit) {
            if (bars.length > 50) {
                timeScale.setVisibleLogicalRange({
                    from: bars.length - 50,
                    to: bars.length + 1
                });
            } else {
                timeScale.fitContent();
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
            if (elements.graphBuyPrice) elements.graphBuyPrice.innerText = formattedAsk;
            if (elements.graphSellPrice) elements.graphSellPrice.innerText = formattedBid;
            if (elements.graphSpreadMiddle) elements.graphSpreadMiddle.innerText = spread;
            
            // Stream ticks to Lightweight Chart if initialized
            if (lwChartInstance && lwCandlestickSeries && chartBars.length > 0) {
                const tickTime = data.time;
                const price = bid; // bid price for the chart
                
                // Update Bid and Ask lines
                updateBidAskPriceLines(bid, ask);
                
                // Get timeframe multiplier in seconds
                let resSeconds = 15;
                if (currentResolution === "30S") resSeconds = 30;
                else if (currentResolution === "45S") resSeconds = 45;
                else if (currentResolution === "1") resSeconds = 60;
                else if (currentResolution === "2") resSeconds = 120;
                else if (currentResolution === "3") resSeconds = 180;
                else if (currentResolution === "5") resSeconds = 300;
                
                const barTime = Math.floor(tickTime / resSeconds) * resSeconds;
                
                // Find or update last bar
                let lastBar = chartBars[chartBars.length - 1];
                if (!lastBar || lastBar.time < barTime) {
                    const newBar = {
                        time: barTime,
                        open: price,
                        high: price,
                        low: price,
                        close: price
                    };
                    chartBars.push(newBar);
                    if (chartBars.length > 1500) {
                        chartBars.shift();
                    }
                } else if (lastBar.time === barTime) {
                    lastBar.high = Math.max(lastBar.high, price);
                    lastBar.low = Math.min(lastBar.low, price);
                    lastBar.close = price;
                }
                
                lwCandlestickSeries.update(chartBars[chartBars.length - 1]);
                
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
    element.classList.remove('tick-up', 'tick-down');
    void element.offsetWidth; // Trigger reflow to restart CSS animation
    element.classList.add(className);
    
    // Remove class after animation ends (600ms matching CSS)
    setTimeout(() => {
        element.classList.remove(className);
    }, 600);
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
        
        if (state.status.long.connected && state.status.long.account_info) {
            const acc = state.status.long.account_info;
            totalBalance += acc.balance;
            totalEquity += acc.equity;
            totalFreeMargin += acc.margin_free;
        }
        
        if (state.status.short.connected && state.status.short.account_info) {
            const acc = state.status.short.account_info;
            totalBalance += acc.balance;
            totalEquity += acc.equity;
            totalFreeMargin += acc.margin_free;
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
        
        if (elements.journalBalance) elements.journalBalance.innerText = `${totalBalance.toFixed(2)} EUR`;
        if (elements.journalEquity) {
            elements.journalEquity.innerText = `${totalEquity.toFixed(2)} EUR`;
            if (allPnL >= 0) {
                elements.journalEquity.className = "metric-val profit-text";
            } else {
                elements.journalEquity.className = "metric-val loss-text";
            }
        }
        if (elements.journalFreeMargin) elements.journalFreeMargin.innerText = `${totalFreeMargin.toFixed(2)} EUR`;
        
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
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustSL(${pos.ticket}, 10)">+10</button>
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
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustTP(${pos.ticket}, 10)">+10</button>
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
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustAutoBE(${pos.ticket}, 10)">+10</button>
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
        if (state.executionType === 'limit') {
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
        
        if (state.executionType === 'limit') {
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
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderSL(${ord.ticket}, 10)">+10</button>
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
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderTP(${ord.ticket}, 10)">+10</button>
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
            <div class="inline-adjuster-grid">
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, -10)">-10</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, -1)">-1</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, 1)">+1</button>
                <button class="inline-btn" onclick="adjustOrderAutoBE(${ord.ticket}, 10)">+10</button>
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
        
        // Update placeholders on Scalp panel if present
        if (elements.lotInput) elements.lotInput.value = config.default_lot;
        if (elements.slInput) elements.slInput.value = config.default_sl_points;
        if (elements.tpInput) elements.tpInput.value = config.default_tp_points;
        if (elements.autoBeInput) elements.autoBeInput.value = config.auto_be_pips || 0;
        
        // Sync preset active states
        syncPresets('lot-presets', config.default_lot);
        syncPresets('sl-presets', config.default_sl_points);
        syncPresets('tp-presets', config.default_tp_points);
        syncPresets('auto-be-presets', config.auto_be_pips || 0);
        
        // Start streaming for the loaded symbol
        startQuoteStream();
        
        // Sync parameter bar displays
        syncScalpParamDisplays();

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
        terminal_path_short: elements.cfgPathShort.value.trim()
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
    const lotInput = document.getElementById('input-lot');
    const autoBeInput = document.getElementById('input-auto-be');
    const slInput = document.getElementById('input-sl-points');
    const tpInput = document.getElementById('input-tp-points');
    
    const displayLot = document.getElementById('val-display-lot');
    const displayBe = document.getElementById('val-display-be');
    const displaySl = document.getElementById('val-display-sl');
    const displayTp = document.getElementById('val-display-tp');
    
    const graphDisplayLot = document.getElementById('graph-val-display-lot');
    const graphDisplayBe = document.getElementById('graph-val-display-be');
    const graphDisplaySl = document.getElementById('graph-val-display-sl');
    const graphDisplayTp = document.getElementById('graph-val-display-tp');
    
    if (lotInput && displayLot) {
        const val = parseFloat(lotInput.value) || 0;
        let lotText = val.toFixed(2);
        if (val === 0.75 && state.isSplitActive) {
            lotText = state.splitScenario === 1 ? "0.75 Sc1" : "0.75 Split";
        }
        displayLot.innerText = lotText;
        if (graphDisplayLot) graphDisplayLot.innerText = lotText;
    }
    if (autoBeInput && displayBe) {
        const val = parseInt(autoBeInput.value) || 0;
        displayBe.innerText = val > 0 ? val : 'Off';
        if (graphDisplayBe) graphDisplayBe.innerText = val > 0 ? val : 'Off';
    }
    if (slInput && displaySl) {
        const val = parseFloat(slInput.value) || 0;
        displaySl.innerText = val > 0 ? `-${val.toFixed(0)}` : 'None';
        if (graphDisplaySl) graphDisplaySl.innerText = val > 0 ? `-${val.toFixed(0)}` : 'None';
    }
    if (tpInput && displayTp) {
        const val = parseFloat(tpInput.value) || 0;
        displayTp.innerText = val > 0 ? val.toFixed(0) : 'None';
        if (graphDisplayTp) graphDisplayTp.innerText = val > 0 ? val.toFixed(0) : 'None';
    }
    
    // Sync Execution Type
    const typeVal = state.executionType || 'market';
    const typeLabel = typeVal.charAt(0).toUpperCase() + typeVal.slice(1);
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

    // Sync Price column
    if (typeVal === 'market') {
        if (elements.valDisplayPrice) elements.valDisplayPrice.innerText = 'Mkt';
        if (elements.graphValDisplayPrice) elements.graphValDisplayPrice.innerText = 'Mkt';
        if (elements.paramColPrice) elements.paramColPrice.classList.remove('clickable-param');
        if (elements.graphParamColPrice) elements.graphParamColPrice.classList.remove('clickable-param');
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
    const symbol = state.config.symbol;
    const currentPrice = state.limitPrice || state.lastAsk || 100;
    const pipSize = getPipSize(symbol, currentPrice);
    
    // adjust price
    state.limitPrice = (state.limitPrice || state.lastAsk || 0) + (deltaPoints * pipSize);
    
    syncScalpParamDisplays();
}

// ==========================================================================
// APP INITIALIZATION
// ==========================================================================
function init() {
    console.log("App loaded - Version 112");
    showToast("Application démarrée - Version 112", "info");
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
    
    initChartResizer();
    initCollapsibleSections();
    
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
        if (field.scalp && field.graph) {
            field.scalp.addEventListener('input', (e) => {
                const val = e.target.value;
                if (field.graph.value !== val) {
                    field.graph.value = val;
                    syncPresets(field.presetGraph, field.isFloat ? parseFloat(val) : parseInt(val));
                    syncScalpParamDisplays();
                }
            });
            field.graph.addEventListener('input', (e) => {
                const val = e.target.value;
                if (field.scalp.value !== val) {
                    field.scalp.value = val;
                    syncPresets(field.presetScalp, field.isFloat ? parseFloat(val) : parseInt(val));
                    syncScalpParamDisplays();
                }
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
