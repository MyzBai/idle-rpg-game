import { getFormattedTableFragment } from "../../stats.js";
import * as helperFunctions from '../../helperFunctions.js';

/**@typedef {import('./sim.js').SimResult} SimResult */
/**@typedef {import('./sim.js').SimInstance} SimInstance */

/**
 * @typedef LineSerie
 * @property {string} key
 * @property {number[][]} values
 * @property {DamageCalc.StatsOutput[]} statsOutputs
 */

/**@type {HTMLElement} */
const graphModal = document.querySelector(".graph-modal");
graphModal.querySelector('.g-modal-header .close-button').addEventListener('click', () => {
    graphModal.classList.remove('active');
});
window.addEventListener('click', e => {
    if(e.target === graphModal){
        graphModal.classList.remove('active')
    }
});
// const overlay = document.querySelector("body > .g-overlay");

/**@type {nv.LineChart} */
var chart = undefined;

/**@type {d3.Selection<LineSerie[]>} */
var chartData = undefined;

let selectedConfigIndex = 0;

/**@param {SimResult} simResults */
export async function draw(simResults) {
	if (!chart) {
		await createChart();
	}

	/**@type {LineSerie[]} */
	const lineSeries = [];

	for (const config of simResults) {
		/**@type {LineSerie} */
		const lineSerie = {
			key: config.name,
			values: [],
			statsOutputs: config.results.map((x) => x.result.statsOutput),
		};

		let level = 1;
		for (const result of config.results) {
			const dps = result.result.dps;
			lineSerie.values.push([level++, dps]);
		}

		lineSeries.push(lineSerie);
	}

	chartData.datum(lineSeries).call(chart);

	{
		// const dpsArr = [...chartData.datum().map(x => x.values.map(y => y[1])).flatMap(x => x)];
		// dpsArr.sort((a,b) => a-b);
		// const highestDps = dpsArr[dpsArr.length-1];
		// const lowestDps = dpsArr[0];
		// const offset = highestDps * 0.2;
		// chart.yDomain([-offset, highestDps + offset ]);
		// chart.xDomain([0, simResult.endLevel + 1]);
	}

	{
		const body = document.querySelector("body");
		const resizewatcher = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === body) {
					chart.update();
				}
			}
		});
		resizewatcher.observe(body);
	}
	nv.utils.windowResize(chart.update);

	const s = chartData[0][0];
	s.dispatchEvent(new Event("click"));

    // helperFunctions.toggleModal(graphModal, overlay, true);
    graphModal.classList.add('active');
}

function createChart() {
	return new Promise((resolve) => {
		nv.addGraph(
			function () {
				chart = nv.models.lineChart();
				chart.margin({ left: 50, top: 50, right: 20, bottom: 50 });
				// chart.width(800);
				// chart.height(400);
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

				chart.interactiveLayer.tooltip.contentGenerator((d) => {
					var dt = d.value;
					var series = "";
					for (const s of [...d.series].sort((a, b) => b.value - a.value)) {
						const { key, value, color } = s;
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

				chart.lines.dispatch.on("elementClick", (e) => {
					showConfigs(e);
				});

				chartData = d3.select(".graph-modal svg").datum([]);
				return chart;
			},
			function () {
				resolve();
			}
		);
	});
}

function showConfigs(selections) {
	const lineSeries = chartData.datum();
	const statsOutputs = [];
	for (const selection of selections) {
		const yIndex = selection.seriesIndex;
		const xIndex = selection.pointIndex;
		const statsOutput = lineSeries[yIndex].statsOutputs[xIndex];
		statsOutputs.push({ label: lineSeries[yIndex].key, statsOutput });
	}
	displayFormattedStats(statsOutputs);
}

/**@param {{label: string, statsOutput: DamageCalc.StatsOutput}[]} data */
function displayFormattedStats(data) {
	const chartStatsContainer = graphModal.querySelector(".s-chart-stats");
	const tabsContainer = chartStatsContainer.querySelector(".tabs");
	const contentContainer = chartStatsContainer.querySelector(".content");
	tabsContainer.replaceChildren();
	/**@type {HTMLElement[]} */
	const btns = [];
	for (const d of data) {
		const frag = getFormattedTableFragment(d.statsOutput);
		const btn = document.createElement("div");
		btn.classList.add("g-button");
		btn.textContent = d.label;
		tabsContainer.appendChild(btn);
		btns.push(btn);
		btn.addEventListener("click", (e) => {
			btns.forEach((x) => x.classList.remove("active"));
			contentContainer.replaceChildren();
			contentContainer.appendChild(frag.cloneNode(true));
			btn.classList.add("active");
			selectedConfigIndex = btns.indexOf(btn);
		});
	}
	if (selectedConfigIndex >= btns.length) {
		selectedConfigIndex = btns.length - 1;
	}
	btns[selectedConfigIndex].click();
}