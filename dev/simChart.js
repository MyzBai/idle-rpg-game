import { getFormattedTableFragment } from '../stats.js';
import { registerTabs } from '../helperFunctions.js';

/**@typedef {import('./simNew.js').SimData} SimData */
/**@typedef {import('./simNew.js').SimInstance} SimInstance */
/**@typedef {import('./simNew.js').SimResult} SimResult */

/**@type {nv.LineChart} */
var chart = undefined;

/**@type {d3.Selection} */
var chartData = undefined;

/**@type {SimInstance[]} */
var results = undefined;

/**@param {SimData} simData */
export async function draw(simData) {
	if (!chart) {
		await createChart();
	}
    results = JSON.parse(JSON.stringify(simData.instances));
	const data = [];
    //each element is a label
    for (const simInstance of simData.instances) {
        data.push({
            key: simInstance.config.label,
            values: [...simInstance.results.map((x,i) => [simData.startLevel + i, x.value])]
        });
    }

	chartData.datum(data).call(chart);
    
    nv.utils.windowResize(chart.update);
}

function createChart() {
    return new Promise(resolve => {
        nv.addGraph(function () {
            chart = nv.models.lineChart();
            chart.margin({ left: 100 });
            chart.height(300);
            chart.showLegend(true);
            chart.showXAxis(true);
            chart.showYAxis(true);
            chart.useInteractiveGuideline(true);
            chart.color(d3.scale.category10().range());
    
            chart.x((d) => {
                return d[0];
            });
            chart.y((d) => {
                return d[1];
            });

            chart.interactiveLayer.tooltip.contentGenerator(d => {
                var dt = d.value;
                var series = '';
                for (const s of [...d.series].sort((a,b) => b.value - a.value)) {
                    const {key, value, color} = s;
                    series += `<tr class="nv-pointer-events-none">
                    <td class="legend-color-guide"><div style="background-color: ${color}"></div></td>
                    <td class="key">${key}</td>
                    <td class="value">${value.toFixed(2)} dps</td>
                    </tr>`;
                }
                var head = `<thead>
                    <tr>
                    <th colspan="2"><strong class="x-value">Level: ${dt}</strong></th>;
                    </tr>
                </thead>`;

                return `<table class="nv-pointer-events-none">
                    ${head}<tbody>${series}</tbody></table>`;
            });
    
            chart.xAxis.tickFormat(d3.format(",d"));
            chart.yAxis.tickFormat(d3.format(",d"));
    
            chart.lines.dispatch.on('elementClick', e => {
                showConfigs(e);
            });
    
            chartData = d3.select("#chart").append("svg").datum([]);
            return chart;
        }, function(){
            resolve();
        });
    })
}

function showConfigs(selections){
    const data = chartData.datum();
    const statsOutputs = [];
    for (const selection of selections) {
        const yIndex = selection.seriesIndex;
        const xIndex = selection.pointIndex;
        const simData = results[yIndex];
        const statsOutput = simData.results[xIndex].statsOutput;
        statsOutputs.push({label: simData.config.label, statsOutput});
    }
    displayFormattedStats(statsOutputs);
}

/**@param {{label: string, statsOutput: DamageCalc.StatsOutput}[]} data */
function displayFormattedStats(data) {
    const chartStatsContainer = document.querySelector('.p-sim .s-chart-stats');
    const tabsContainer = chartStatsContainer.querySelector('.tabs');
    const contentContainer = chartStatsContainer.querySelector('.content');
    tabsContainer.replaceChildren();
    /**@type {HTMLElement[]} */
    const btns = [];
    for (const d of data) {
        const frag = getFormattedTableFragment(d.statsOutput);
        const btn = document.createElement('div');
        btn.classList.add('g-button');
        btn.textContent = d.label;
        tabsContainer.appendChild(btn);
        btns.push(btn);
        btn.addEventListener('click', e => {
            btns.forEach(x => x.classList.remove('active'));
            contentContainer.replaceChildren();
            contentContainer.appendChild(frag.cloneNode(true));
            btn.classList.add('active');
        });
    }
    btns[0].click();
}